import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../../lib/db.js';
import { getSessionUser } from '../../../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { id } = req.query;
  const conversationId = Array.isArray(id) ? id[0] : id;
  if (!conversationId) return res.status(400).json({ error: 'Missing conversation id' });

  const owned = await sql`
    select id from conversations where id = ${conversationId} and user_id = ${user.id} limit 1
  `;
  if (owned.length === 0) return res.status(404).json({ error: 'Conversation not found' });

  const rows = await sql`
    select id, role, content, citations, created_at
    from messages
    where conversation_id = ${conversationId}
    order by created_at asc
  `;

  return res.status(200).json({ messages: rows });
}
