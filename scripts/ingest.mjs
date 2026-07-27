// Extracts text from PDFs, chunks it, embeds each chunk with Gemini, and
// upserts everything into Supabase (documents + document_chunks).
//
// Usage:
//   npm run ingest -- [libraryDir] [--force]
//
// Expects a directory laid out as:
//   <libraryDir>/bible/*.pdf
//   <libraryDir>/egw/*.pdf
//   <libraryDir>/manual/*.pdf
//
// (Download the "Ellen G White" Drive folder, plus the Bible/Church Manual
// PDFs, into that layout — Drive lets you download a whole folder as a zip.)
//
// Requires in .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY

import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import { BIBLE_SEED, MANUAL_SEED, EGW_SEED, titleForAbbreviation } from '../data/library-seed.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

for (const [name, val] of Object.entries({ SUPABASE_URL, SERVICE_ROLE_KEY, GEMINI_API_KEY })) {
  if (!val) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const libraryDir = args.find((a) => !a.startsWith('--')) ?? './library';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const EMBEDDING_MODEL = 'text-embedding-004';

function chunkText(text) {
  const chunks = [];
  let start = 0;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return chunks;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function extractPages(buffer) {
  const pages = [];
  await pdfParse(buffer, {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      pages.push(text);
      return text;
    },
  });
  return pages;
}

async function embedBatch(texts) {
  // Gemini's embedContent is single-text; run with light concurrency.
  const CONCURRENCY = 5;
  const results = new Array(texts.length);
  let cursor = 0;

  async function worker() {
    while (cursor < texts.length) {
      const i = cursor++;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text: texts[i] }] },
            taskType: 'RETRIEVAL_DOCUMENT',
          }),
        }
      );
      if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
      const json = await res.json();
      results[i] = json.embedding.values;
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

function identifyBible(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('kjv')) return BIBLE_SEED.find((b) => b.abbreviation === 'KJV');
  if (lower.includes('nlt') || lower.includes('new-living') || lower.includes('new living'))
    return BIBLE_SEED.find((b) => b.abbreviation === 'NLT');
  if (lower.includes('esv') || lower.includes('english standard'))
    return BIBLE_SEED.find((b) => b.abbreviation === 'ESV');
  return null;
}

function identifyEgw(filename) {
  const stem = filename.replace(/\.pdf$/i, '').replace(/^en_/i, '');
  const known = EGW_SEED.find((e) => e.abbreviation.toLowerCase() === stem.toLowerCase());
  const abbreviation = known?.abbreviation ?? stem;
  return { abbreviation, driveFileId: known?.driveFileId ?? null, title: titleForAbbreviation(abbreviation) };
}

async function upsertDocument(row) {
  const conflictTarget = row.drive_file_id ? 'drive_file_id' : undefined;
  const query = conflictTarget
    ? supabase.from('documents').upsert(row, { onConflict: conflictTarget }).select().single()
    : supabase.from('documents').upsert(row, { onConflict: 'category,abbreviation' }).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function processFile(filePath, category) {
  const filename = path.basename(filePath);
  console.log(`\n--- ${category}/${filename} ---`);

  let docMeta;
  if (category === 'bible') {
    const seed = identifyBible(filename);
    if (!seed) {
      console.warn(`  Could not identify translation from filename "${filename}", skipping.`);
      return;
    }
    docMeta = {
      category: 'bible',
      title: seed.title,
      abbreviation: seed.abbreviation,
      translation: seed.translation,
      drive_file_id: seed.driveFileId,
    };
  } else if (category === 'manual') {
    const seed = MANUAL_SEED[0];
    docMeta = {
      category: 'manual',
      title: seed.title,
      abbreviation: seed.abbreviation,
      translation: null,
      drive_file_id: seed.driveFileId,
    };
  } else {
    const info = identifyEgw(filename);
    docMeta = {
      category: 'egw',
      title: info.title,
      abbreviation: info.abbreviation,
      translation: null,
      drive_file_id: info.driveFileId,
    };
  }

  const existing = await supabase
    .from('documents')
    .select('id, ingested')
    .eq('drive_file_id', docMeta.drive_file_id)
    .maybeSingle();

  if (existing.data?.ingested && !force) {
    console.log('  Already ingested, skipping (use --force to re-ingest).');
    return;
  }

  const buffer = await fs.readFile(filePath);
  const pages = await extractPages(buffer);
  console.log(`  Extracted ${pages.length} pages.`);

  const document = await upsertDocument({ ...docMeta, page_count: pages.length, ingested: false, chunk_count: 0 });

  // Clear any previous chunks before re-ingesting.
  await supabase.from('document_chunks').delete().eq('document_id', document.id);

  const chunkRecords = [];
  pages.forEach((pageText, pageIdx) => {
    const pieces = chunkText(pageText);
    pieces.forEach((content, i) => {
      chunkRecords.push({ content, page_number: pageIdx + 1, chunk_index: chunkRecords.length, _localIdx: i });
    });
  });

  console.log(`  ${chunkRecords.length} chunks to embed...`);

  const BATCH = 50;
  let embedded = 0;
  for (let i = 0; i < chunkRecords.length; i += BATCH) {
    const batch = chunkRecords.slice(i, i + BATCH);
    const embeddings = await embedBatch(batch.map((c) => c.content));
    const rows = batch.map((c, j) => ({
      document_id: document.id,
      content: c.content,
      page_number: c.page_number,
      chunk_index: c.chunk_index,
      embedding: embeddings[j],
    }));
    const { error } = await supabase.from('document_chunks').insert(rows);
    if (error) throw error;
    embedded += rows.length;
    process.stdout.write(`\r  Embedded ${embedded}/${chunkRecords.length}`);
  }
  console.log('');

  await supabase
    .from('documents')
    .update({ ingested: true, chunk_count: chunkRecords.length })
    .eq('id', document.id);

  console.log(`  Done: "${document.title}" (${document.abbreviation ?? ''})`);
}

async function main() {
  for (const category of ['bible', 'egw', 'manual']) {
    const dir = path.join(libraryDir, category);
    let files;
    try {
      files = await fs.readdir(dir);
    } catch {
      console.log(`(no ${dir} directory, skipping)`);
      continue;
    }
    for (const file of files.filter((f) => f.toLowerCase().endsWith('.pdf'))) {
      await processFile(path.join(dir, file), category);
    }
  }
  console.log('\nIngestion complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
