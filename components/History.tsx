import React, { useEffect, useState } from 'react';
import { api } from '../lib/apiClient';
import type { Conversation } from '../types';

interface HistoryProps {
  onSelect: (conversationId: string) => void;
}

const History: React.FC<HistoryProps> = ({ onSelect }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.conversations().then(({ conversations }) => {
      setConversations(conversations.map((c) => ({ id: c.id, title: c.title, createdAt: c.created_at })));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="mb-4 font-serif text-2xl font-semibold tracking-tight text-ink-100">History</h1>
      {loading && <p className="text-sm text-ink-400">Loading…</p>}
      {!loading && conversations.length === 0 && (
        <p className="text-sm text-ink-400">No past conversations yet — ask Berea a question to get started.</p>
      )}
      <div className="space-y-2">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="block w-full rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-left text-sm text-ink-200 transition hover:border-gold"
          >
            <p className="font-medium text-ink-100">{c.title}</p>
            <p className="mt-1 text-xs text-ink-400">{new Date(c.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default History;
