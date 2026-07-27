// Registers every document Berea knows about (from data/library-seed.mjs) as a
// row in `documents`, with ingested=false, so the Library page shows the full
// catalog immediately. Run `npm run ingest` afterwards to fill in content.
//
// Requires DATABASE_URL in .env.local.

import { neon } from '@neondatabase/serverless';
import { BIBLE_SEED, MANUAL_SEED, EGW_SEED, titleForAbbreviation } from '../data/library-seed.mjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Set DATABASE_URL in .env.local first (see .env.example).');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const rows = [
  ...BIBLE_SEED.map((d) => ({
    category: d.category,
    title: d.title,
    abbreviation: d.abbreviation,
    translation: d.translation,
    driveFileId: d.driveFileId,
  })),
  ...MANUAL_SEED.map((d) => ({
    category: d.category,
    title: d.title,
    abbreviation: d.abbreviation,
    translation: d.translation,
    driveFileId: d.driveFileId,
  })),
  ...EGW_SEED.map((d) => ({
    category: 'egw',
    title: titleForAbbreviation(d.abbreviation),
    abbreviation: d.abbreviation,
    translation: null,
    driveFileId: d.driveFileId,
  })),
];

console.log(`Seeding ${rows.length} documents...`);

let count = 0;
for (const row of rows) {
  await sql`
    insert into documents (category, title, abbreviation, translation, drive_file_id)
    values (${row.category}, ${row.title}, ${row.abbreviation}, ${row.translation}, ${row.driveFileId})
    on conflict (drive_file_id) do update set
      category = excluded.category,
      title = excluded.title,
      abbreviation = excluded.abbreviation,
      translation = excluded.translation
  `;
  count += 1;
  if (count % 20 === 0) process.stdout.write(`\r  ${count}/${rows.length}`);
}

console.log(`\nDone. Library catalog is populated (ingested=false until you run \`npm run ingest\`).`);
