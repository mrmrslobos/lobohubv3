// Berea "guidance" edge function
//
// Takes a pastoral question, retrieves grounded excerpts from Scripture, the
// Spirit of Prophecy, and the SDA Church Manual (via pgvector similarity
// search), and asks Gemini to answer in the voice of a seasoned, doctrinally
// grounded SDA pastor mentoring a local church elder.
//
// Secrets required (set with `supabase secrets set NAME=value`):
//   GEMINI_API_KEY
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EMBEDDING_MODEL = 'text-embedding-004';
const GENERATION_MODEL = 'gemini-2.5-flash';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are Berea, a study companion mentoring a local Seventh-day Adventist \
church elder. You answer with the warmth, patience, and doctrinal grounding of an experienced \
SDA pastor, but you are not a substitute for one — you say so plainly when a situation calls for \
real, in-person pastoral care.

How you answer:
- Ground every substantive claim in the excerpts provided below (Scripture, Ellen G. White's \
writings, and/or the SDA Church Manual). Quote briefly and cite the source inline like \
(DA, p. 123) or (Church Manual) or (KJV, John 3:16) using the citation labels given to you.
- If the provided excerpts don't cover the question, say so honestly rather than inventing a \
citation. You may still offer general biblical wisdom, but flag clearly what is and isn't \
sourced from the retrieved material.
- Write for a lay elder giving counsel to church members: practical, pastoral, non-academic. \
Prefer a few well-chosen sources over an exhaustive list.
- Represent mainstream Seventh-day Adventist doctrine and Church Manual policy faithfully. Where \
Adventist practice differs from other traditions (Sabbath, state of the dead, sanctuary, \
diet, etc.), explain the SDA position clearly and kindly rather than debating it.
- For anything involving abuse, suicide, self-harm, medical emergencies, or immediate danger: \
lead with safety, urge contacting local emergency services and the conference/mission pastoral \
care line right away, and keep any spiritual counsel secondary to that.
- Keep a gentle, unhurried, encouraging tone — the way a wise elder-of-elders would speak, not a \
search engine.`;

interface RequestBody {
  question: string;
  conversationId?: string;
  translation?: 'KJV' | 'NLT' | 'ESV';
}

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
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.embedding.values as number[];
}

async function generate(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY secret is not set. Run: supabase secrets set GEMINI_API_KEY=...');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const body = (await req.json()) as RequestBody;
    const question = body.question?.trim();
    if (!question) throw new Error('question is required');

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const queryEmbedding = await embed(question);

    const { data: matches, error: matchError } = await admin.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_count: 8,
      filter_categories: ['bible', 'egw', 'manual'],
    });
    if (matchError) throw matchError;

    const rows = (matches ?? []) as MatchRow[];
    const preferredTranslation = body.translation ?? 'KJV';
    const sourceBlock = rows.length
      ? rows
          .map((r, i) => {
            const label = r.abbreviation ? `${r.abbreviation}` : r.title;
            const page = r.page_number ? `, p. ${r.page_number}` : '';
            return `[${i + 1}] (${label}${page}) ${r.content}`;
          })
          .join('\n\n')
      : '(No matching excerpts were found in the library for this question.)';

    const prompt = `${SYSTEM_PROMPT}

The elder's preferred Bible translation is ${preferredTranslation}; use it when quoting Scripture \
if a matching excerpt is in that translation, otherwise use whatever translation the excerpt is in \
and say which one.

RETRIEVED EXCERPTS:
${sourceBlock}

ELDER'S QUESTION:
${question}

Respond now, grounded in the excerpts above.`;

    const answer = await generate(prompt);

    const citations = rows.map((r) => ({
      documentId: r.document_id,
      title: r.title,
      abbreviation: r.abbreviation,
      category: r.category,
      excerpt: r.content.slice(0, 400),
      page: r.page_number,
      similarity: r.similarity,
    }));

    let conversationId = body.conversationId;
    if (!conversationId) {
      const { data: conv, error: convError } = await admin
        .from('conversations')
        .insert({ user_id: user.id, title: question.slice(0, 80) })
        .select('id')
        .single();
      if (convError) throw convError;
      conversationId = conv.id;
    }

    await admin.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: question },
      { conversation_id: conversationId, role: 'assistant', content: answer, citations },
    ]);

    return new Response(JSON.stringify({ answer, citations, conversationId }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
