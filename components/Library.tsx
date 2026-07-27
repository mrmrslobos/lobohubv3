import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/apiClient';
import type { DocumentCategory, LibraryDocument } from '../types';

const CATEGORY_META: Record<DocumentCategory, { label: string; icon: string }> = {
  bible: { label: 'Bible Translations', icon: '📜' },
  egw: { label: "Ellen G. White Writings", icon: '✒️' },
  manual: { label: 'SDA Church Manual', icon: '⚖️' },
};

const Library: React.FC = () => {
  const [docs, setDocs] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.documents().then(({ documents }) => {
      setDocs(
        documents.map((d) => ({
          id: d.id,
          category: d.category,
          title: d.title,
          abbreviation: d.abbreviation,
          translation: d.translation,
          author: d.author,
          source_note: d.source_note,
          page_count: d.page_count,
          ingested: d.ingested,
          chunk_count: d.chunk_count,
          created_at: d.created_at,
        }))
      );
      setLoading(false);
    });
  }, []);

  const grouped = useMemo(() => {
    const filtered = docs.filter((d) =>
      `${d.title} ${d.abbreviation ?? ''}`.toLowerCase().includes(search.toLowerCase())
    );
    const byCategory: Record<DocumentCategory, LibraryDocument[]> = { bible: [], egw: [], manual: [] };
    for (const d of filtered) byCategory[d.category].push(d);
    return byCategory;
  }, [docs, search]);

  const totalIngested = docs.filter((d) => d.ingested).length;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-100">Library</h1>
          <p className="text-sm text-ink-400">
            {docs.length === 0
              ? 'No documents registered yet — run `npm run seed:library` to populate the catalog.'
              : `${totalIngested} of ${docs.length} documents ready for guidance search.`}
          </p>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the library…"
          className="w-full max-w-xs rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-100 outline-none focus:border-gold"
        />
      </div>

      {loading && <p className="text-sm text-ink-400">Loading…</p>}

      {!loading &&
        (Object.keys(CATEGORY_META) as DocumentCategory[]).map((category) => {
          const items = grouped[category];
          if (items.length === 0) return null;
          const meta = CATEGORY_META[category];
          return (
            <section key={category} className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-400">
                <span>{meta.icon}</span>
                {meta.label}
                <span className="text-ink-400/60">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-ink-600 bg-ink-800 p-4 transition hover:border-gold/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-ink-100">{doc.title}</p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          doc.ingested ? 'bg-gold/15 text-gold' : 'bg-ink-600/40 text-ink-400'
                        }`}
                      >
                        {doc.ingested ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                    {doc.abbreviation && <p className="mt-1 text-xs text-ink-400">{doc.abbreviation}</p>}
                    {doc.ingested && (
                      <p className="mt-2 text-[11px] text-ink-400/70">
                        {doc.chunk_count} passages{doc.page_count ? ` · ${doc.page_count} pages` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
    </div>
  );
};

export default Library;
