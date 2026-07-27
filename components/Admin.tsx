import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/apiClient';
import { extractAndChunkPdf } from '../lib/pdfIngest';
import type { DocumentCategory, LibraryDocument } from '../types';

const CATEGORY_META: Record<DocumentCategory, { label: string; icon: string }> = {
  bible: { label: 'Bible Translations', icon: '📜' },
  egw: { label: "Ellen G. White Writings", icon: '✒️' },
  manual: { label: 'SDA Church Manual', icon: '⚖️' },
};

const BATCH_SIZE = 20;

type RowStatus =
  | { state: 'idle' }
  | { state: 'extracting' }
  | { state: 'embedding'; done: number; total: number }
  | { state: 'done' }
  | { state: 'error'; message: string };

const Admin: React.FC = () => {
  const [docs, setDocs] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadDocs = () => {
    setLoading(true);
    api.documents().then(({ documents }) => {
      setDocs(documents as LibraryDocument[]);
      setLoading(false);
    });
  };

  useEffect(loadDocs, []);

  const grouped = useMemo(() => {
    const filtered = docs.filter((d) =>
      `${d.title} ${d.abbreviation ?? ''}`.toLowerCase().includes(search.toLowerCase())
    );
    const byCategory: Record<DocumentCategory, LibraryDocument[]> = { bible: [], egw: [], manual: [] };
    for (const d of filtered) byCategory[d.category].push(d);
    return byCategory;
  }, [docs, search]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedLibrary();
      loadDocs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to seed the catalog.');
    } finally {
      setSeeding(false);
    }
  };

  const handleFile = async (doc: LibraryDocument, file: File) => {
    setRowStatus((prev) => ({ ...prev, [doc.id]: { state: 'extracting' } }));
    try {
      const { chunks, pageCount } = await extractAndChunkPdf(file);

      await api.adminIngestStart(doc.id);
      setRowStatus((prev) => ({ ...prev, [doc.id]: { state: 'embedding', done: 0, total: chunks.length } }));

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE).map((c) => ({
          content: c.content,
          pageNumber: c.pageNumber,
          chunkIndex: c.chunkIndex,
        }));
        await api.adminIngestBatch(doc.id, batch);
        setRowStatus((prev) => ({
          ...prev,
          [doc.id]: { state: 'embedding', done: Math.min(i + BATCH_SIZE, chunks.length), total: chunks.length },
        }));
      }

      await api.adminIngestFinish(doc.id, pageCount);
      setRowStatus((prev) => ({ ...prev, [doc.id]: { state: 'done' } }));
      loadDocs();
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [doc.id]: { state: 'error', message: err instanceof Error ? err.message : 'Ingestion failed.' },
      }));
    }
  };

  const totalIngested = docs.filter((d) => d.ingested).length;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-100">Admin — Ingest Library</h1>
          <p className="text-sm text-ink-400">
            {docs.length === 0
              ? 'No documents registered yet.'
              : `${totalIngested} of ${docs.length} documents ready for guidance search.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the library…"
            className="w-full max-w-xs rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-ink-100 outline-none focus:border-gold"
          />
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 text-xs font-semibold text-ink-200 transition hover:border-gold disabled:opacity-50"
          >
            {seeding ? 'Seeding…' : 'Refresh catalog'}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-banner-line bg-banner-bg px-4 py-3 text-xs text-banner-ink">
        Upload a PDF for any book below to extract, chunk, and embed it — all in your browser and this tab, so
        keep it open until a book finishes processing. Re-uploading a "Ready" book replaces its existing content.
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
              <div className="space-y-2">
                {items.map((doc) => {
                  const status = rowStatus[doc.id] ?? { state: 'idle' as const };
                  const busy = status.state === 'extracting' || status.state === 'embedding';
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col gap-2 rounded-lg border border-ink-600 bg-ink-800 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-ink-100">{doc.title}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              doc.ingested ? 'bg-gold/15 text-gold' : 'bg-ink-600/40 text-ink-400'
                            }`}
                          >
                            {doc.ingested ? 'Ready' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-ink-400">
                          {doc.abbreviation}
                          {doc.ingested ? ` · ${doc.chunk_count} passages` : ''}
                        </p>
                        {status.state === 'extracting' && (
                          <p className="mt-1 text-xs text-gold">Extracting text from the PDF…</p>
                        )}
                        {status.state === 'embedding' && (
                          <p className="mt-1 text-xs text-gold">
                            Embedding {status.done}/{status.total} passages…
                          </p>
                        )}
                        {status.state === 'error' && <p className="mt-1 text-xs text-red-400">{status.message}</p>}
                        {status.state === 'done' && <p className="mt-1 text-xs text-gold">Done!</p>}
                      </div>
                      <div className="shrink-0">
                        <input
                          ref={(el) => {
                            fileInputs.current[doc.id] = el;
                          }}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) handleFile(doc, file);
                          }}
                        />
                        <button
                          onClick={() => fileInputs.current[doc.id]?.click()}
                          disabled={busy}
                          className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-gold-on transition hover:bg-gold-dark disabled:opacity-50"
                        >
                          {doc.ingested ? 'Replace PDF' : 'Upload PDF'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
    </div>
  );
};

export default Admin;
