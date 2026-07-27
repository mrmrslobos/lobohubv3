import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient';
import type { ChatMessage, Citation } from '../types';

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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-ink-100">Ask for Guidance</h1>
          <p className="text-sm text-ink-400">
            Ask as an elder — Berea answers grounded in Scripture, Ellen White's writings, and the Church Manual.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-400">
          <span>Translation</span>
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value as (typeof TRANSLATIONS)[number])}
            className="rounded-lg border border-ink-600 bg-ink-800 px-2 py-1.5 text-ink-100 outline-none focus:border-gold"
          >
            {TRANSLATIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-banner-line bg-banner-bg px-4 py-3 text-xs text-banner-ink">
        Berea is a study companion, not a substitute for your pastor. In situations involving abuse, self-harm, or
        immediate danger, please contact emergency services and your conference pastoral care line directly.
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-ink-600 bg-ink-800/40 p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-ink-400">
            <span className="mb-3 text-4xl">📖</span>
            <p className="max-w-sm text-sm">
              Ask something like "How should I counsel a member struggling with doubt about the Sabbath?" or
              "What does the Church Manual say about reinstating a member?"
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-2xl rounded-lg px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gold text-gold-on'
                  : 'border border-ink-600 bg-ink-800 text-ink-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-ink-700 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Sources</p>
                  {m.citations.slice(0, 5).map((c, i) => (
                    <div key={i} className="text-xs text-ink-400">
                      <span className="font-semibold italic text-rubric">
                        {c.abbreviation ?? c.title}
                        {c.page ? `, p. ${c.page}` : ''}
                      </span>{' '}
                      <span className="text-ink-400/70">— {CATEGORY_LABEL[c.category]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-ink-400">
              Searching the library…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="Type your question…"
          className="flex-1 resize-none rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-sm text-ink-100 outline-none focus:border-gold"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-gold-on transition hover:bg-gold-dark disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GuidanceChat;
