export type DocumentCategory = 'bible' | 'egw' | 'manual';

export interface LibraryDocument {
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

export interface Citation {
  documentId: string;
  title: string;
  abbreviation: string | null;
  category: DocumentCategory;
  excerpt: string;
  page: number | null;
  similarity: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  role: 'elder' | 'admin';
}
