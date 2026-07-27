// The sidebar meter and the guidance empty state both want the same "how much of
// the library is searchable" number. Cache the in-flight promise at module scope so
// mounting both doesn't fire the document list twice.
import { useEffect, useState } from 'react';
import { api } from './apiClient';

export interface LibraryStats {
  ready: number;
  total: number;
}

let pending: Promise<LibraryStats> | null = null;

export function libraryStats(): Promise<LibraryStats> {
  if (!pending) {
    pending = api
      .documents()
      .then(({ documents }) => ({
        ready: documents.filter((d) => d.ingested).length,
        total: documents.length,
      }))
      .catch(() => ({ ready: 0, total: 0 }));
  }
  return pending;
}

/** Lets a freshly-ingested book show up in the meter without a page reload. */
export function invalidateLibraryStats() {
  pending = null;
}

export function useLibraryStats(): LibraryStats | null {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  useEffect(() => {
    let active = true;
    libraryStats().then((s) => {
      if (active) setStats(s);
    });
    return () => {
      active = false;
    };
  }, []);
  return stats;
}
