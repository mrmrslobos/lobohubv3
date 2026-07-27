import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../lib/db';
import { verifyPassword, createSession } from '../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rows = await sql`
    select id, email, password_hash, display_name, role from users where email = ${normalizedEmail} limit 1
  `;
  const user = rows[0] as
    | { id: string; email: string; password_hash: string; display_name: string | null; role: string }
    | undefined;

  // Constant-shape response whether or not the account exists, to avoid
  // leaking which emails are registered.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  await createSession(user.id, res);

  return res.status(200).json({
    user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role },
  });
}
