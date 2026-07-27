import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser } from '../../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await getSessionUser(req);
  return res.status(200).json({ user });
}
