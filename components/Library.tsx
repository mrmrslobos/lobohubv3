import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/apiClient';
import type { DocumentCategory, LibraryDocument } from '../types';
import { IconAdmin, IconLibrary, IconSearch } from './icons';

const CATEGORY_META: Record<DocumentCategory, { label: string; Icon: React.FC<React.SVGProps<SVGSVGElement>> }> = {
  bible: { label: 'Bible Translations', Icon: IconLibrary },
  egw: { label: 'Ellen G. White Writings', Icon: IconLibrary },
  manual: { label: 'SDA Church Manual', Icon: IconAdmin },
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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-semibold tracking-tight text-ink-100">Library</h1>
          <p className="mt-0.5 text-[13px] text-ink-400">
            {docs.length === 0
              ? 'No documents registered yet — run `npm run seed:library` to populate the catalog.'
              : `${totalIngested} of ${docs.length} documents ready for guidance search.`}
          </p>
        </div>
        <div className="relative w-full max-w-xs">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the library…"
            className="w-full rounded-lg border border-hair bg-ink-900 py-2 pl-9 pr-3 text-[13px] text-ink-100 outline-none placeholder:text-ink-500 focus:border-hair-strong"
          />
        </div>
      </div>

      {loading && <p className="text-[13px] text-ink-400">Loading…</p>}

      {!loading &&
        (Object.keys(CATEGORY_META) as DocumentCategory[]).map((category) => {
          const items = grouped[category];
          if (items.length === 0) return null;
          const meta = CATEGORY_META[category];
          return (
            <section key={category} className="mb-7">
              <h2 className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500">
                <meta.Icon className="h-3.5 w-3.5" />
                {meta.label}
                <span className="tabular-nums">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-lg border border-hair bg-ink-900 p-3 transition-colors hover:border-hair-strong"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-snug text-ink-100">{doc.title}</p>
                      <span
                        className={`flex shrink-0 items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] ${
                          doc.ingested ? 'text-good' : 'text-ink-500'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${doc.ingested ? 'bg-good' : 'bg-ink-500'}`} />
                        {doc.ingested ? 'Ready' : 'Pending'}
                      </span>
                    </div>
                    {doc.abbreviation && <p className="mt-1 text-[11px] text-ink-500">{doc.abbreviation}</p>}
                    {doc.ingested && (
                      <p className="mt-1.5 text-[11px] tabular-nums text-ink-500">
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
