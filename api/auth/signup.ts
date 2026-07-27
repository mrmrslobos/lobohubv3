import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db.js';
import { hashPassword, createSession } from '../../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password, displayName } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'A valid email and a password of at least 6 characters are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await sql`select id from users where email = ${normalizedEmail} limit 1`;
  if (existing.length > 0) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    insert into users (email, password_hash, display_name)
    values (${normalizedEmail}, ${passwordHash}, ${displayName ?? null})
    returning id, email, display_name, role
  `;
  const user = rows[0] as { id: string; email: string; display_name: string | null; role: string };

  await createSession(user.id, res);

  return res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
  });
}
