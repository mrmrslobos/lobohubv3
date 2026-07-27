// Registers every document Berea knows about (from data/library-seed.mjs) as a
// row in `documents`, with ingested=false, so the Library page shows the full
// catalog immediately. Run `npm run ingest` afterwards to fill in content.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from '@supabase/supabase-js';
import { BIBLE_SEED, MANUAL_SEED, EGW_SEED, titleForAbbreviation } from '../data/library-seed.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const rows = [
  ...BIBLE_SEED.map((d) => ({
    category: d.category,
    title: d.title,
    abbreviation: d.abbreviation,
    translation: d.translation,
    drive_file_id: d.driveFileId,
  })),
  ...MANUAL_SEED.map((d) => ({
    category: d.category,
    title: d.title,
    abbreviation: d.abbreviation,
    translation: d.translation,
    drive_file_id: d.driveFileId,
  })),
  ...EGW_SEED.map((d) => ({
    category: 'egw',
    title: titleForAbbreviation(d.abbreviation),
    abbreviation: d.abbreviation,
    translation: null,
    drive_file_id: d.driveFileId,
  })),
];

console.log(`Seeding ${rows.length} documents...`);

const { error } = await supabase.from('documents').upsert(rows, { onConflict: 'drive_file_id' });

if (error) {
  console.error('Seed failed:', error);
  process.exit(1);
}

console.log('Done. Library catalog is populated (ingested=false until you run `npm run ingest`).');
