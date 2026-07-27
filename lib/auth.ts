// Server-only auth helpers: password hashing + opaque, cookie-based sessions.
// Neon has no built-in auth service (unlike Supabase), so this is our own —
// deliberately simple: bcrypt for passwords, a random token per session
// stored only as a SHA-256 hash (so a DB read alone can't impersonate a user),
// sent to the browser as an httpOnly cookie.
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { parse, serialize } from 'cookie';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { sql } from './db';

const COOKIE_NAME = 'berea_session';
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'elder' | 'admin';
}

export async function createSession(userId: string, res: ServerResponse): Promise<void> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    insert into sessions (user_id, token_hash, expires_at)
    values (${userId}, ${hashToken(token)}, ${expiresAt.toISOString()})
  `;

  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
  );
}

export function clearSessionCookie(res: ServerResponse): void {
  res.setHeader(
    'Set-Cookie',
    serialize(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 })
  );
}

export async function getSessionUser(req: IncomingMessage): Promise<SessionUser | null> {
  const cookies = parse(req.headers.cookie ?? '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  const rows = await sql`
    select u.id, u.email, u.display_name, u.role
    from sessions s
    join users u on u.id = s.user_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()
    limit 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0] as { id: string; email: string; display_name: string | null; role: 'elder' | 'admin' };
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

export async function destroySession(req: IncomingMessage): Promise<void> {
  const cookies = parse(req.headers.cookie ?? '');
  const token = cookies[COOKIE_NAME];
  if (!token) return;
  await sql`delete from sessions where token_hash = ${hashToken(token)}`;
}
