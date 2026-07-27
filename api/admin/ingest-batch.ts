// Embeds and stores one batch of already-chunked text from the browser's PDF
// extraction. Kept small per request (see MAX_BATCH) so a single invocation
// never gets close to Vercel's function time limit, however big the source
// book is — the browser just calls this repeatedly until it's worked through
// every chunk.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, toVectorLiteral } from '../../lib/db.js';
import { getSessionUser } from '../../lib/auth.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-2';
const EMBEDDING_DIMENSIONS = 768; // must match the `vector(768)` column in migrations/0001_init.sql
const MAX_BATCH = 50;
const EMBED_CONCURRENCY = 5;

interface ChunkInput {
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.embedding.values as number[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY is not set.' });

  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { documentId, chunks } = req.body ?? {};
  if (typeof documentId !== 'string' || !Array.isArray(chunks) || chunks.length === 0) {
    return res.status(400).json({ error: 'documentId and a non-empty chunks array are required' });
  }
  if (chunks.length > MAX_BATCH) {
    return res.status(400).json({ error: `Send at most ${MAX_BATCH} chunks per batch.` });
  }

  const doc = await sql`select id from documents where id = ${documentId} limit 1`;
  if (doc.length === 0) return res.status(404).json({ error: 'Document not found' });

  const typedChunks = chunks as ChunkInput[];
  const embeddings = new Array<number[]>(typedChunks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < typedChunks.length) {
      const i = cursor++;
      embeddings[i] = await embed(typedChunks[i].content);
    }
  }
  await Promise.all(Array.from({ length: EMBED_CONCURRENCY }, worker));

  for (let i = 0; i < typedChunks.length; i++) {
    const c = typedChunks[i];
    await sql`
      insert into document_chunks (document_id, content, page_number, chunk_index, embedding)
      values (${documentId}, ${c.content}, ${c.pageNumber}, ${c.chunkIndex}, ${toVectorLiteral(embeddings[i])}::vector)
    `;
  }

  return res.status(200).json({ inserted: typedChunks.length });
}
