-- Berea: SDA Pastoral Guidance — initial schema
-- Run via `supabase db push`, or paste into the Supabase SQL editor.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Profiles (one row per auth.users, role gates access to the ingest/admin UI)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'elder' check (role in ('elder', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Library: documents (one row per PDF) and document_chunks (RAG unit)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
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

create index if not exists documents_category_idx on public.documents (category);
create unique index if not exists documents_category_abbreviation_idx
  on public.documents (category, abbreviation) where abbreviation is not null;

-- text-embedding-004 (Gemini) produces 768-dim vectors
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  content text not null,
  page_number int,
  chunk_index int not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_document_idx on public.document_chunks (document_id);
create index if not exists document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

create policy "documents: read all (authenticated)" on public.documents
  for select using (auth.role() = 'authenticated');

create policy "document_chunks: read all (authenticated)" on public.document_chunks
  for select using (auth.role() = 'authenticated');

-- writes to documents/document_chunks happen via the service-role key
-- (ingestion script), so no insert/update policy is granted to end users.

-- ---------------------------------------------------------------------------
-- Vector search RPC used by the `guidance` edge function
-- ---------------------------------------------------------------------------
create or replace function public.match_document_chunks(
  query_embedding vector(768),
  match_count int default 8,
  filter_categories text[] default array['bible', 'egw', 'manual']
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  page_number int,
  similarity float,
  title text,
  abbreviation text,
  category text
)
language sql stable
as $$
  select
    c.id as chunk_id,
    c.document_id,
    c.content,
    c.page_number,
    1 - (c.embedding <=> query_embedding) as similarity,
    d.title,
    d.abbreviation,
    d.category
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where d.category = any (filter_categories)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Conversations & messages (per-user chat history)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations: own rows" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages: own conversation" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
