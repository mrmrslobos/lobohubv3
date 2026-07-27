import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient';
import type { ChatMessage, Citation } from '../types';
import { IconAsk, IconChevron, IconSend } from './icons';

const TRANSLATIONS = ['KJV', 'NLT', 'ESV'] as const;

const CATEGORY_LABEL: Record<Citation['category'], string> = {
  bible: 'Scripture',
  egw: 'Spirit of Prophecy',
  manual: 'Church Manual',
};

interface GuidanceChatProps {
  conversationId: string | null;
  onConversationStarted: (id: string) => void;
}

const GuidanceChat: React.FC<GuidanceChatProps> = ({ conversationId, onConversationStarted }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [translation, setTranslation] = useState<(typeof TRANSLATIONS)[number]>('KJV');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    api.messages(conversationId).then(({ messages }) => {
      setMessages(
        messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations ?? undefined,
          createdAt: m.created_at,
        }))
      );
    });
  }, [conversationId]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || sending) return;
    setInput('');
    setError(null);
    setSending(true);

    const optimisticUser: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const data = await api.askGuidance(question, conversationId ?? undefined, translation);

      const assistantMessage: ChatMessage = {
        id: `local-${Date.now()}-a`,
        role: 'assistant',
        content: data.answer,
        citations: data.citations,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (!conversationId && data.conversationId) {
        onConversationStarted(data.conversationId);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong reaching Berea. Check that DATABASE_URL and GEMINI_API_KEY are configured.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-100">Ask for Guidance</h1>
          <p className="text-sm text-ink-400">
            Ask as an elder — Berea answers grounded in Scripture, Ellen White's writings, and the Church Manual.
          </p>
        </div>
        <div className="relative shrink-0">
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value as (typeof TRANSLATIONS)[number])}
            className="appearance-none rounded-full bg-ink-800 py-2 pl-4 pr-9 text-xs font-bold text-ink-100 outline-none"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <IconChevron className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
        </div>
      </div>

      <div className="mb-4 rounded-2xl bg-ink-900 px-4 py-3 text-xs leading-relaxed text-ink-400">
        Berea is a study companion, not a substitute for your pastor. In situations involving abuse, self-harm, or
        immediate danger, please contact emergency services and your conference pastoral care line directly.
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-ink-400">
            <IconAsk className="mb-3 h-9 w-9" />
            <p className="max-w-sm text-sm">
              Ask something like "How should I counsel a member struggling with doubt about the Sabbath?" or
              "What does the Church Manual say about reinstating a member?"
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[75%] rounded-full bg-ink-800 px-4 py-2 text-sm font-medium leading-snug text-ink-100">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex max-w-2xl flex-col gap-3">
              <p className="whitespace-pre-wrap text-sm leading-[1.7] text-ink-200">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.citations.slice(0, 5).map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-semibold text-ink-400"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                      {c.abbreviation ?? c.title}
                      {c.page ? `, p. ${c.page}` : ''}
                      <span className="text-ink-400/60">— {CATEGORY_LABEL[c.category]}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {sending && <p className="text-sm italic text-ink-400">Searching the library…</p>}

        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex items-end gap-2 rounded-3xl bg-ink-900 py-2 pl-5 pr-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder="Ask a follow-up…"
          className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-ink-100 outline-none placeholder:text-ink-400"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-on transition disabled:opacity-40"
        >
          <IconSend className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default GuidanceChat;
