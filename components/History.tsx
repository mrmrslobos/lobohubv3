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
      <h1 className="mb-5 font-serif text-[22px] font-semibold tracking-tight text-ink-100">History</h1>
      {loading && <p className="text-[13px] text-ink-400">Loading…</p>}
      {!loading && conversations.length === 0 && (
        <p className="text-[13px] text-ink-400">No past conversations yet — ask Berea a question to get started.</p>
      )}
      <div className="flex flex-col gap-1.5">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="block w-full rounded-lg border border-hair bg-ink-900 px-3.5 py-2.5 text-left transition-colors hover:border-hair-strong hover:bg-ink-800"
          >
            <p className="font-serif text-[15px] leading-snug text-ink-100">{c.title}</p>
            <p className="mt-1 text-[11px] text-ink-500">{new Date(c.createdAt).toLocaleString()}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default History;
