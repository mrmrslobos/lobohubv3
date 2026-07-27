-- Berea: SDA Pastoral Guidance — schema for Neon Postgres
-- Run with `npm run migrate` (see scripts/migrate.mjs), or paste into the
-- Neon SQL editor.

create extension if not exists pgcrypto; -- gen_random_uuid()
create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Users & sessions (Neon has no built-in auth service, so this is our own —
-- password hashes via bcrypt, opaque session tokens stored hashed, cookie-based)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text,
  role text not null default 'elder' check (role in ('elder', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_token_hash_idx on sessions (token_hash);
create index if not exists sessions_user_idx on sessions (user_id);

-- ---------------------------------------------------------------------------
-- Library: documents (one row per PDF) and document_chunks (RAG unit)
-- ---------------------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('bible', 'egw', 'manual')),
  title text not null,
  abbreviation text,
  translation text,
  author text,
  source_note text,
  drive_file_id text unique,
  storage_path text,
  page_count int,
  ingested boolean not null default false,
  chunk_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists documents_category_idx on documents (category);
create unique index if not exists documents_category_abbreviation_idx
  on documents (category, abbreviation) where abbreviation is not null;

-- text-embedding-004 (Gemini) produces 768-dim vectors
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  content text not null,
  page_number int,
  chunk_index int not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_idx on document_chunks (document_id);
create index if not exists document_chunks_embedding_idx on document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Conversations & messages (per-user chat history)
-- ---------------------------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_idx on conversations (user_id);
create index if not exists messages_conversation_idx on messages (conversation_id);

-- Note: there's no RLS here (Neon has no session-claim mechanism like Supabase's
-- auth.uid()) — every table is only ever reached through the /api routes, which
-- enforce the session -> user_id ownership checks themselves. Nothing talks to
-- Neon directly from the browser.
