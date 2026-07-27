// Thin fetch wrapper for the /api routes. Same-origin on Vercel, so the
// session cookie rides along automatically with credentials: 'include'.
import type { Citation, DocumentCategory, Profile } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error ?? `Request to ${path} failed (${res.status})`);
  }
  return json as T;
}

export interface RawDocumentRow {
  id: string;
  category: DocumentCategory;
  title: string;
  abbreviation: string | null;
  translation: string | null;
  author: string | null;
  source_note: string | null;
  page_count: number | null;
  ingested: boolean;
  chunk_count: number;
  created_at: string;
}

export interface RawConversationRow {
  id: string;
  title: string;
  created_at: string;
}

export interface RawMessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export const api = {
  signUp: (email: string, password: string, inviteCode: string, displayName?: string) =>
    request<{ user: Profile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, inviteCode, displayName }),
    }),

  signIn: (email: string, password: string) =>
    request<{ user: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signOut: () => request<{ ok: true }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: Profile | null }>('/api/auth/me'),

  documents: () => request<{ documents: RawDocumentRow[] }>('/api/documents'),

  conversations: () => request<{ conversations: RawConversationRow[] }>('/api/conversations'),

  messages: (conversationId: string) =>
    request<{ messages: RawMessageRow[] }>(`/api/conversations/${conversationId}/messages`),

  askGuidance: (question: string, conversationId?: string, translation?: string) =>
    request<{ answer: string; citations: Citation[]; conversationId: string }>('/api/guidance', {
      method: 'POST',
      body: JSON.stringify({ question, conversationId, translation }),
    }),

  seedLibrary: () => request<{ seeded: number }>('/api/admin/seed-library', { method: 'POST' }),

  adminIngestStart: (documentId: string) =>
    request<{ ok: true }>('/api/admin/ingest-start', {
      method: 'POST',
      body: JSON.stringify({ documentId }),
    }),

  adminIngestBatch: (
    documentId: string,
    chunks: { content: string; pageNumber: number | null; chunkIndex: number }[]
  ) =>
    request<{ inserted: number }>('/api/admin/ingest-batch', {
      method: 'POST',
      body: JSON.stringify({ documentId, chunks }),
    }),

  adminIngestFinish: (documentId: string, pageCount: number) =>
    request<{ ok: true; chunkCount: number }>('/api/admin/ingest-finish', {
      method: 'POST',
      body: JSON.stringify({ documentId, pageCount }),
    }),
};
