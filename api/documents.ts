import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';
import { getSessionUser } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const rows = await sql`
    select id, category, title, abbreviation, translation, author, source_note,
           page_count, ingested, chunk_count, created_at
    from documents
    order by title asc
  `;

  return res.status(200).json({ documents: rows });
}
