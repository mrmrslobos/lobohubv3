# Berea — SDA Pastoral Guidance

Ask a question as a church elder and get guidance grounded in Scripture (KJV / NLT / ESV),
Ellen G. White's writings, and the Seventh-day Adventist Church Manual — with citations back to
the source.

Berea is a **retrieval-augmented** study companion: it never answers from memory alone. Every
question is embedded, matched against your library of PDFs (stored as searchable passages in
Supabase), and the retrieved excerpts are handed to Gemini along with a pastoral system prompt.
The answer quotes and cites what it actually found.

> Berea is a study companion, not a replacement for your pastor or conference pastoral care —
> the app says so up front, especially for anything urgent (abuse, self-harm, crisis).

## Architecture

- **Frontend** — React + Vite + TypeScript + Tailwind (this repo).
- **Auth & data** — Supabase (Postgres + `pgvector`, Auth, Edge Functions).
- **AI** — Gemini `text-embedding-004` for embeddings, `gemini-2.5-flash` for answers. All calls
  happen server-side in the `guidance` Edge Function — the Gemini key never reaches the browser.
- **Ingestion** — a local Node script (`npm run ingest`) that extracts text from your PDFs,
  chunks it, embeds each chunk, and upserts it into Supabase. This runs on your machine (or CI),
  not in the deployed app, since processing ~100 books is a one-time, API-cost-bearing job you
  should control directly.

## 1. Set up Supabase

1. Create a Supabase project (or reuse one) and note its **Project URL**, **anon key**, and
   **service role key** (Project Settings → API).
2. Apply the schema in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql):
   - Easiest: paste the file into the Supabase SQL Editor and run it.
   - Or, with the Supabase CLI: `supabase link --project-ref YOUR_REF && supabase db push`.
3. Deploy the RAG edge function and set its secret:
   ```sh
   supabase functions deploy guidance
   supabase secrets set GEMINI_API_KEY=your-gemini-api-key
   ```
   Get a Gemini key at https://aistudio.google.com/apikey.

## 2. Configure the app

```sh
cp .env.example .env.local
```

Fill in `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (frontend) and
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `GEMINI_API_KEY` (ingestion scripts only — keep
these out of anything you deploy publicly).

```sh
npm install
npm run dev
```

Sign up with an email/password — the first user isn't special, so promote yourself in the
`profiles` table (`role = 'admin'`) if you want an admin marker later.

## 3. Populate the library

Berea already knows the catalog of your Google Drive library (KJV, NLT, ESV, the Church Manual,
and ~100 Ellen G. White volumes) — see [`data/library-seed.mjs`](data/library-seed.mjs). Two
steps get it fully searchable:

**a. Register the catalog** (instant, no PDFs needed yet — populates the Library page):

```sh
npm run seed:library
```

**b. Ingest the actual text** (this is what makes guidance answers grounded):

1. Download the PDFs from Drive into a local folder shaped like this — Drive lets you download
   an entire folder as a zip ("Download" on the folder), then unzip and sort into:
   ```
   library/
     bible/    # kjv.pdf, New-Living-Translation-NLT.pdf, English Standard Version.pdf
     egw/      # en_DA.pdf, en_GC.pdf, en_PP.pdf, ... (all the Ellen G. White volumes)
     manual/   # Seventh-day_Adventist_Church_Manual-*.pdf
   ```
2. Run:
   ```sh
   npm run ingest
   ```
   This walks each folder, extracts text page-by-page, chunks it (~1200 characters with
   overlap), embeds every chunk with Gemini, and stores it in `document_chunks`. It's safe to
   re-run — already-ingested documents are skipped unless you pass `--force`. Expect this to
   take a while and to consume Gemini API quota given the size of the library; ingest a few
   books first (e.g. just `library/bible` and `library/manual`) to confirm everything works
   end-to-end before running the full ~100-volume set.

Once ingestion finishes for a document, it flips to "Ready" on the Library page and its passages
become searchable from the guidance chat.

## Notes on translations

KJV is public domain. NLT and ESV are copyrighted (Tyndale House / Crossway); the app only
stores and serves the text you already licensed/own a copy of via your own Drive and Supabase
project — nothing is redistributed publicly.

## Local development

```sh
npm run dev       # start the app
npm run build     # production build
npm run preview   # preview the production build
```
