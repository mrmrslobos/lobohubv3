// Extracts text from PDFs, chunks it, embeds each chunk with Gemini, and
// upserts everything into Neon (documents + document_chunks).
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
// Requires in .env.local: DATABASE_URL, GEMINI_API_KEY

import fs from 'node:fs/promises';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import pdfParse from 'pdf-parse';
import { BIBLE_SEED, MANUAL_SEED, EGW_SEED, titleForAbbreviation } from '../data/library-seed.mjs';

const DATABASE_URL = process.env.DATABASE_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

for (const [name, val] of Object.entries({ DATABASE_URL, GEMINI_API_KEY })) {
  if (!val) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const libraryDir = args.find((a) => !a.startsWith('--')) ?? './library';

const sql = neon(DATABASE_URL);

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const EMBEDDING_MODEL = 'text-embedding-004';

function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`;
}

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
  if (row.drive_file_id) {
    const rows = await sql`
      insert into documents (category, title, abbreviation, translation, drive_file_id, page_count, ingested, chunk_count)
      values (${row.category}, ${row.title}, ${row.abbreviation}, ${row.translation}, ${row.drive_file_id}, ${row.page_count}, false, 0)
      on conflict (drive_file_id) do update set page_count = excluded.page_count
      returning id, title, abbreviation
    `;
    return rows[0];
  }
  const rows = await sql`
    insert into documents (category, title, abbreviation, translation, page_count, ingested, chunk_count)
    values (${row.category}, ${row.title}, ${row.abbreviation}, ${row.translation}, ${row.page_count}, false, 0)
    on conflict (category, abbreviation) do update set page_count = excluded.page_count
    returning id, title, abbreviation
  `;
  return rows[0];
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

  const existing = docMeta.drive_file_id
    ? await sql`select id, ingested from documents where drive_file_id = ${docMeta.drive_file_id} limit 1`
    : await sql`select id, ingested from documents where category = ${docMeta.category} and abbreviation = ${docMeta.abbreviation} limit 1`;

  if (existing[0]?.ingested && !force) {
    console.log('  Already ingested, skipping (use --force to re-ingest).');
    return;
  }

  const buffer = await fs.readFile(filePath);
  const pages = await extractPages(buffer);
  console.log(`  Extracted ${pages.length} pages.`);

  const document = await upsertDocument({ ...docMeta, page_count: pages.length });

  // Clear any previous chunks before re-ingesting.
  await sql`delete from document_chunks where document_id = ${document.id}`;

  const chunkRecords = [];
  pages.forEach((pageText, pageIdx) => {
    const pieces = chunkText(pageText);
    pieces.forEach((content) => {
      chunkRecords.push({ content, page_number: pageIdx + 1, chunk_index: chunkRecords.length });
    });
  });

  console.log(`  ${chunkRecords.length} chunks to embed...`);

  const BATCH = 50;
  let embedded = 0;
  for (let i = 0; i < chunkRecords.length; i += BATCH) {
    const batch = chunkRecords.slice(i, i + BATCH);
    const embeddings = await embedBatch(batch.map((c) => c.content));
    for (let j = 0; j < batch.length; j++) {
      const c = batch[j];
      await sql`
        insert into document_chunks (document_id, content, page_number, chunk_index, embedding)
        values (${document.id}, ${c.content}, ${c.page_number}, ${c.chunk_index}, ${toVectorLiteral(embeddings[j])}::vector)
      `;
    }
    embedded += batch.length;
    process.stdout.write(`\r  Embedded ${embedded}/${chunkRecords.length}`);
  }
  console.log('');

  await sql`update documents set ingested = true, chunk_count = ${chunkRecords.length} where id = ${document.id}`;

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
