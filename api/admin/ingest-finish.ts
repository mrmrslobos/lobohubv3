// Marks a document ingested once the browser has sent every batch, recording
// the actual chunk count stored (not just what the client thinks it sent).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db.js';
import { getSessionUser } from '../../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { documentId, pageCount } = req.body ?? {};
  if (typeof documentId !== 'string') return res.status(400).json({ error: 'documentId is required' });

  const doc = await sql`select id from documents where id = ${documentId} limit 1`;
  if (doc.length === 0) return res.status(404).json({ error: 'Document not found' });

  const countRows = await sql`select count(*)::int as count from document_chunks where document_id = ${documentId}`;
  const chunkCount = (countRows[0] as { count: number }).count;

  await sql`
    update documents
    set ingested = true, chunk_count = ${chunkCount}, page_count = ${typeof pageCount === 'number' ? pageCount : null}
    where id = ${documentId}
  `;

  return res.status(200).json({ ok: true, chunkCount });
}
