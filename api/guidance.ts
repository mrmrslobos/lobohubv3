// The RAG endpoint: embeds the elder's question, retrieves the closest
// passages from Scripture / Ellen White's writings / the Church Manual via
// pgvector similarity search on Neon, and asks Gemini to answer grounded in
// what was actually retrieved. GEMINI_API_KEY stays server-side.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, toVectorLiteral } from '../lib/db.js';
import { getSessionUser } from '../lib/auth.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'gemini-embedding-2';
const EMBEDDING_DIMENSIONS = 768; // must match the `vector(768)` column in migrations/0001_init.sql
const GENERATION_MODEL = 'gemini-2.5-flash';

// Kept as an even number so a fixed-size window always lands on a
// user/assistant pair boundary (each turn inserts exactly one of each).
const HISTORY_MESSAGE_LIMIT = 10;

const SYSTEM_PROMPT = `You are Berea, a study companion for a local Seventh-day Adventist church \
elder. You answer with the judgement of an experienced SDA pastor, but you are not a substitute \
for one — say so plainly when a situation calls for real, in-person pastoral care.

How you sound:
- Write in plain, current English — the way a thoughtful pastor would actually talk to a colleague \
today. Contemporary vocabulary, normal sentence rhythm, contractions where they fit.
- Do not write in an archaic or churchy register. Avoid "brethren", "beloved", "let us", "shall", \
"one must", "it behooves", "dear elder", and similar. You will be quoting Jacobean and \
19th-century sources — do not let their cadence bleed into your own prose.
- Be direct. Open with the actual answer or the first practical move, then support it. No \
throat-clearing ("What a thoughtful question…"), no restating the question back.
- Keep it tight — short paragraphs, usually 150–250 words unless the question genuinely needs \
more. The elder is busy and often needs this mid-conversation.
- Warm, plain-spoken, and never preachy toward the person asking. They are a colleague, not a \
congregant.

How you answer:
- Ground every substantive claim in the excerpts provided below (Scripture, Ellen G. White's \
writings, and/or the SDA Church Manual). Quote briefly and cite with the excerpt's bracketed \
number placed immediately after the claim it supports — like [1] or [3]. Use only numbers that \
appear in the retrieved excerpts, and cite the specific excerpt you actually drew on.
- Do not write out source names, abbreviations, or page numbers in your prose (no "(DA, p. 283)"), \
and do not add a list of sources at the end. The app renders the full reference for each bracketed \
number alongside your answer, so the number alone is enough.
- If the provided excerpts don't cover the question, say so honestly rather than inventing a \
citation. You may still offer general biblical wisdom — leave it uncited and flag clearly what is \
and isn't sourced from the retrieved material.
- If this question follows earlier turns in the conversation, treat it as a continuation — refer \
back to what was already discussed rather than starting over as if it were a fresh question.
- Write for a lay elder giving counsel to church members: practical, pastoral, non-academic. \
Prefer a few well-chosen sources over an exhaustive list.
- Represent mainstream Seventh-day Adventist doctrine and Church Manual policy faithfully. Where \
Adventist practice differs from other traditions (Sabbath, state of the dead, sanctuary, \
diet, etc.), explain the SDA position clearly and kindly rather than debating it.
- For anything involving abuse, suicide, self-harm, medical emergencies, or immediate danger: \
lead with safety, urge contacting local emergency services and the conference/mission pastoral \
care line right away, and keep any spiritual counsel secondary to that.`;

interface MatchRow {
  chunk_id: string;
  document_id: string;
  content: string;
  page_number: number | null;
  similarity: number;
  title: string;
  abbreviation: string | null;
  category: 'bible' | 'egw' | 'manual';
}

interface HistoryRow {
  role: 'user' | 'assistant';
  content: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
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
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.embedding.values as number[];
}

async function generate(systemInstruction: string, contents: GeminiContent[]): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set — see .env.example.');
    }

    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const { question, conversationId, translation } = req.body ?? {};
    const trimmedQuestion = typeof question === 'string' ? question.trim() : '';
    if (!trimmedQuestion) return res.status(400).json({ error: 'question is required' });

    let history: HistoryRow[] = [];
    if (conversationId) {
      const owned = await sql`
        select id from conversations where id = ${conversationId} and user_id = ${user.id} limit 1
      `;
      if (owned.length === 0) return res.status(404).json({ error: 'Conversation not found' });

      const recent = await sql`
        select role, content from messages
        where conversation_id = ${conversationId}
        order by created_at desc
        limit ${HISTORY_MESSAGE_LIMIT}
      `;
      history = (recent as HistoryRow[]).reverse();
    }

    // Fold the most recent user turn into the retrieval query so a short
    // follow-up ("what about for children specifically?") still searches on
    // the right topic instead of just those few words on their own.
    const lastUserTurn = [...history].reverse().find((m) => m.role === 'user');
    const retrievalQuery = lastUserTurn ? `${lastUserTurn.content} ${trimmedQuestion}` : trimmedQuestion;

    const queryEmbedding = await embed(retrievalQuery);
    const vectorLiteral = toVectorLiteral(queryEmbedding);

    const requestedTranslation = typeof translation === 'string' ? translation : 'ESV';

    // All three translations sit in the same vector space and say much the same
    // thing, so an unfiltered nearest-neighbour search returns whichever version
    // happens to embed closest — the elder's choice would never actually bind.
    // Restrict Scripture to the requested translation, but only once we know it's
    // been ingested, so picking one that isn't loaded yet doesn't silently drop
    // Scripture out of the answer entirely.
    const available = (await sql`
      select abbreviation from documents
      where category = 'bible' and ingested = true and abbreviation is not null
      order by abbreviation
    `) as { abbreviation: string }[];

    // Pin Scripture to one translation: the requested one when it's loaded,
    // otherwise whichever is, so the excerpts never silently mix versions and
    // the note below stays truthful. Null only when no Bible is ingested yet.
    const usedTranslation = available.some((r) => r.abbreviation === requestedTranslation)
      ? requestedTranslation
      : available[0]?.abbreviation ?? null;

    const matches = (usedTranslation
      ? await sql`
          select
            c.id as chunk_id, c.document_id, c.content, c.page_number,
            1 - (c.embedding <=> ${vectorLiteral}::vector) as similarity,
            d.title, d.abbreviation, d.category
          from document_chunks c
          join documents d on d.id = c.document_id
          where d.category <> 'bible' or d.abbreviation = ${usedTranslation}
          order by c.embedding <=> ${vectorLiteral}::vector
          limit 8
        `
      : await sql`
          select
            c.id as chunk_id, c.document_id, c.content, c.page_number,
            1 - (c.embedding <=> ${vectorLiteral}::vector) as similarity,
            d.title, d.abbreviation, d.category
          from document_chunks c
          join documents d on d.id = c.document_id
          order by c.embedding <=> ${vectorLiteral}::vector
          limit 8
        `) as MatchRow[];

    const sourceBlock = matches.length
      ? matches
          .map((r, i) => {
            const label = r.abbreviation ? r.abbreviation : r.title;
            const page = r.page_number ? `, p. ${r.page_number}` : '';
            return `[${i + 1}] (${label}${page}) ${r.content}`;
          })
          .join('\n\n')
      : '(No matching excerpts were found in the library for this question.)';

    const translationNote = usedTranslation
      ? `Scripture excerpts below are from the ${usedTranslation}. Quote them as they appear — don't \
substitute wording from another translation.${
          usedTranslation === requestedTranslation
            ? ''
            : ` The elder asked for the ${requestedTranslation}, which isn't loaded in this library yet; \
say so briefly if you quote Scripture.`
        }`
      : 'No Bible translation has been loaded into this library yet — do not quote Scripture as if it were retrieved.';

    const finalTurnText = `${translationNote}

RETRIEVED EXCERPTS:
${sourceBlock}

ELDER'S QUESTION:
${trimmedQuestion}

Respond now, grounded in the excerpts above.`;

    const contents: GeminiContent[] = [
      ...history.map((m) => ({
        role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: finalTurnText }] },
    ];

    const answer = await generate(SYSTEM_PROMPT, contents);

    const citations = matches.map((r) => ({
      documentId: r.document_id,
      title: r.title,
      abbreviation: r.abbreviation,
      category: r.category,
      excerpt: r.content.slice(0, 400),
      page: r.page_number,
      similarity: r.similarity,
    }));

    let finalConversationId = conversationId as string | undefined;
    if (!finalConversationId) {
      const rows = await sql`
        insert into conversations (user_id, title)
        values (${user.id}, ${trimmedQuestion.slice(0, 80)})
        returning id
      `;
      finalConversationId = (rows[0] as { id: string }).id;
    }

    await sql`
      insert into messages (conversation_id, role, content)
      values (${finalConversationId}, 'user', ${trimmedQuestion})
    `;
    await sql`
      insert into messages (conversation_id, role, content, citations)
      values (${finalConversationId}, 'assistant', ${answer}, ${JSON.stringify(citations)})
    `;

    return res.status(200).json({ answer, citations, conversationId: finalConversationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).json({ error: message });
  }
}
