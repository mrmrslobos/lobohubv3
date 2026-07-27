// Server-only Neon client. Import this from api/ routes and scripts only —
// never from browser-facing code (it needs DATABASE_URL, which isn't and
// shouldn't be exposed to the client).
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — see .env.example.');
}

export const sql = neon(connectionString);

// pgvector has no first-class JS binding in @neondatabase/serverless, so
// embeddings are passed as a literal string and cast with ::vector in SQL.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
