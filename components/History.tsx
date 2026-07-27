import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Conversation } from '../types';

interface HistoryProps {
  onSelect: (conversationId: string) => void;
}

const History: React.FC<HistoryProps> = ({ onSelect }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('conversations')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setConversations((data ?? []).map((c) => ({ id: c.id, title: c.title, createdAt: c.created_at })));
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">History</h1>
      {loading && <p className="text-sm text-stone-500">Loading…</p>}
      {!loading && conversations.length === 0 && (
        <p className="text-sm text-stone-500">No past conversations yet — ask Berea a question to get started.</p>
      )}
      <div className="space-y-2">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="block w-full rounded-xl border border-stone-800 bg-stone-900 px-4 py-3 text-left text-sm text-stone-200 transition hover:border-berea-600"
          >
            <p className="font-medium">{c.title}</p>
            <p className="mt-1 text-xs text-stone-500">{new Date(c.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default History;
