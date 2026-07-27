# Berea — SDA Pastoral Guidance

Ask a question as a church elder and get guidance grounded in Scripture (KJV / NLT / ESV),
Ellen G. White's writings, and the Seventh-day Adventist Church Manual — with citations back to
the source.

Berea is a **retrieval-augmented** study companion: it never answers from memory alone. Every
question is embedded, matched against your library of PDFs (stored as searchable passages in
Neon Postgres via `pgvector`), and the retrieved excerpts are handed to Gemini along with a
pastoral system prompt. The answer quotes and cites what it actually found.

> Berea is a study companion, not a replacement for your pastor or conference pastoral care —
> the app says so up front, especially for anything urgent (abuse, self-harm, crisis).

## Architecture

- **Frontend** — React + Vite + TypeScript + Tailwind (this repo), deployed as a static build on
  **Vercel**.
- **Backend** — Vercel Serverless Functions under `api/` (Node.js runtime). There's no separate
  server to run — Vercel builds each file in `api/` into its own function automatically.
- **Database** — **Neon** Postgres with the `pgvector` extension. Stores documents, embedded
  passages, users, sessions, and chat history. No ORM — just tagged-template SQL via
  `@neondatabase/serverless`.
- **Auth** — custom, cookie-based sessions (bcrypt-hashed passwords, opaque session tokens
  stored hashed in `sessions`, httpOnly cookie), gated behind a shared invite code so sign-up
  isn't open to anyone who finds the URL. Neon doesn't ship an auth service the way Supabase
  does, so `lib/auth.ts` + `api/auth/*` implement a deliberately small one.
- **AI** — Gemini `gemini-embedding-2` for embeddings, `gemini-2.5-flash` for answers. Both run
  inside `api/guidance.ts` — the Gemini key never reaches the browser.
- **Ingestion** — a local Node script (`npm run ingest`) that extracts text from your PDFs,
  chunks it, embeds each chunk, and upserts it into Neon. This runs on your machine (or CI), not
  in the deployed app, since processing ~100 books is a one-time, API-cost-bearing job you should
  control directly.

## 1. Create the Neon database

1. Create a project at [neon.tech](https://neon.tech) (or reuse one).
2. Copy the **pooled** connection string (Dashboard → Connection Details → check "Pooled
   connection") — Vercel functions are serverless, so you want PgBouncer pooling, not a direct
   connection.
3. Apply the schema:
   ```sh
   cp .env.example .env.local   # fill in DATABASE_URL
   npm install
   npm run migrate
   ```
   This runs [`migrations/0001_init.sql`](migrations/0001_init.sql), which enables `pgvector`
   and creates `users`, `sessions`, `documents`, `document_chunks`, `conversations`, `messages`.

## 2. Configure secrets

Add `GEMINI_API_KEY` to `.env.local` too (get one at
https://aistudio.google.com/apikey) — the ingestion script and the local dev server both need
it.

Also set `SIGNUP_INVITE_CODE` to a passphrase of your choosing — sign-up requires it (and is
disabled entirely if it's unset), so the app isn't open to anyone who stumbles on the URL. Share
the code directly with the elders you want using it.

```sh
npm run dev
```

Sign up with an email/password (and the invite code) from the app UI — the first user isn't
special; promote yourself to `role = 'admin'` directly in the `users` table later if you want an
admin marker.

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

## 4. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel (Framework Preset: Vite — Vercel
   auto-detects it and picks up `api/` as serverless functions with no extra config).
2. In the Vercel project's Environment Variables, set:
   - `DATABASE_URL` — the same Neon pooled connection string
   - `GEMINI_API_KEY`
   - `SIGNUP_INVITE_CODE` — required for sign-up to work at all; give this code only to the
     elders you want using the app
3. Deploy. There's nothing else to configure — the frontend and the `api/` functions ship
   together from the same build.

## Notes on translations

KJV is public domain. NLT and ESV are copyrighted (Tyndale House / Crossway); the app only
stores and serves the text you already licensed/own a copy of via your own Drive and Neon
project — nothing is redistributed publicly.

## Local development

```sh
npm run dev       # start the Vite dev server (frontend only — see below)
npm run build     # production build
npm run preview   # preview the production build
```

`npm run dev` serves the frontend but does **not** run the `api/` functions — for those, use the
[Vercel CLI](https://vercel.com/docs/cli) locally:

```sh
npm i -g vercel
vercel dev
```

which serves both the Vite frontend and the `api/` serverless functions together, using the
same `.env.local`.
