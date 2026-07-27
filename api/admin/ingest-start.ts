// Resets a document for (re-)ingestion: wipes any existing chunks and marks
// it not-yet-ingested. The browser calls this once before streaming up
// chunk batches via ingest-batch.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db.js';
import { getSessionUser } from '../../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { documentId } = req.body ?? {};
  if (typeof documentId !== 'string') return res.status(400).json({ error: 'documentId is required' });

  const doc = await sql`select id from documents where id = ${documentId} limit 1`;
  if (doc.length === 0) return res.status(404).json({ error: 'Document not found' });

  await sql`delete from document_chunks where document_id = ${documentId}`;
  await sql`update documents set ingested = false, chunk_count = 0 where id = ${documentId}`;

  return res.status(200).json({ ok: true });
}
