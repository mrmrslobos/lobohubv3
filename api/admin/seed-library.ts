// One-time admin endpoint: registers the full Berea library catalog (from
// data/library-seed.mjs) as rows in `documents`, with ingested=false, so the
// Library page shows everything immediately. Safe to call more than once —
// it's an upsert. Requires being signed in (any account) since this app has
// no separate admin role set up yet and this endpoint only ever inserts
// harmless catalog metadata, never PDF content or credentials.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db.js';
import { getSessionUser } from '../../lib/auth.js';
import { BIBLE_SEED, MANUAL_SEED, EGW_SEED, titleForAbbreviation } from '../../data/library-seed.mjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Sign in to the app first, then visit this endpoint.' });
  }

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
      category: 'egw' as const,
      title: titleForAbbreviation(d.abbreviation),
      abbreviation: d.abbreviation,
      translation: null as string | null,
      driveFileId: d.driveFileId,
    })),
  ];

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
  }

  return res.status(200).json({ seeded: count });
}
