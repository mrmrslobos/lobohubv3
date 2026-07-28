import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient';
import { parseAnswer, type CitedSource } from '../lib/citations';
import { useLibraryStats } from '../lib/libraryStats';
import { useAuth } from './AuthContext';
import type { ChatMessage, Citation } from '../types';
import { IconChevron, IconSend } from './icons';

const TRANSLATIONS = ['ESV', 'NLT', 'KJV'] as const;
type Translation = (typeof TRANSLATIONS)[number];

// This component unmounts whenever the elder switches views, so keeping the
// choice in local state alone silently reverted it to the default every time.
const TRANSLATION_KEY = 'berea.translation';

function storedTranslation(): Translation {
  if (typeof localStorage === 'undefined') return 'ESV';
  const saved = localStorage.getItem(TRANSLATION_KEY);
  return TRANSLATIONS.includes(saved as Translation) ? (saved as Translation) : 'ESV';
}

const CATEGORY_LABEL: Record<Citation['category'], string> = {
  bible: 'Scripture',
  egw: 'Spirit of Prophecy',
  manual: 'Church Manual',
};

const SUGGESTIONS: { label: string; question: string }[] = [
  {
    label: 'Counselling',
    question: 'How do I counsel a member struggling with doubt about the Sabbath?',
  },
  {
    label: 'Church Manual',
    question: "What's the process for reinstating a disfellowshipped member?",
  },
  {
    label: 'Weddings',
    question: "Can an elder officiate a wedding where one partner isn't a member?",
  },
  {
    label: 'Visitation',
    question: 'What guidance is there for visiting the recently bereaved?',
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const SourceCard: React.FC<{ source: CitedSource }> = ({ source }) => (
  <div className="flex gap-2.5 rounded-lg border border-hair bg-ink-950 p-2.5">
    <span className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded border border-hair bg-ink-800 text-[10px] font-semibold tabular-nums text-accent">
      {source.label}
    </span>
    <div className="min-w-0">
      <p className="text-[12.5px] font-medium leading-snug text-ink-100">{source.title}</p>
      <p className="mt-0.5 text-[11px] tabular-nums text-ink-500">
        {[source.abbreviation, source.page ? `p. ${source.page}` : null].filter(Boolean).join(' · ')}
      </p>
      <span className="mt-1.5 inline-block rounded border border-hair px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ink-400">
        {CATEGORY_LABEL[source.category]}
      </span>
    </div>
  </div>
);

interface GuidanceChatProps {
  conversationId: string | null;
  onConversationStarted: (id: string) => void;
}

const GuidanceChat: React.FC<GuidanceChatProps> = ({ conversationId, onConversationStarted }) => {
  const { user } = useAuth();
  const stats = useLibraryStats();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [translation, setTranslation] = useState<Translation>(storedTranslation);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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

  const send = async (question: string) => {
    if (!question.trim() || sending) return;
    setInput('');
    setError(null);
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: 'user', content: question.trim(), createdAt: new Date().toISOString() },
    ]);

    try {
      const data = await api.askGuidance(question.trim(), conversationId ?? undefined, translation);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}-a`,
          role: 'assistant',
          content: data.answer,
          citations: data.citations,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (!conversationId && data.conversationId) onConversationStarted(data.conversationId);
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

  // The rail mirrors the most recent answer — that's the one being read.
  const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant');
  const railSources = lastAnswer ? parseAnswer(lastAnswer.content, lastAnswer.citations).sources : [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-hair px-5 py-3">
          <span className="truncate text-[13px] text-ink-400">
            {isEmpty ? 'Guidance' : <><span className="text-ink-500">Guidance / </span><span className="font-medium text-ink-100">{messages[0]?.content.slice(0, 48)}</span></>}
          </span>
          <div className="relative ml-auto shrink-0">
            <select
              value={translation}
              onChange={(e) => {
                const next = e.target.value as Translation;
                setTranslation(next);
                localStorage.setItem(TRANSLATION_KEY, next);
              }}
              aria-label="Bible translation"
              className="appearance-none rounded-md border border-hair bg-transparent py-1 pl-2.5 pr-7 text-[11px] font-medium text-ink-200 outline-none focus:border-hair-strong"
            >
              {TRANSLATIONS.map((t) => (
                <option key={t} value={t} className="bg-ink-900">
                  {t}
                </option>
              ))}
            </select>
            <IconChevron className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-500" />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          {isEmpty ? (
            <div className="mx-auto max-w-[640px]">
              <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink-100">
                {greeting()}, {user?.displayName ?? user?.email?.split('@')[0] ?? 'Elder'}.
              </h1>
              <p className="mt-1.5 text-[13px] text-ink-400">
                {stats && stats.total > 0
                  ? `${stats.ready} books indexed and searchable — Scripture, the Spirit of Prophecy, and the Church Manual.`
                  : 'Ask a question and Berea answers from Scripture, the Spirit of Prophecy, and the Church Manual.'}
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.question}
                    onClick={() => send(s.question)}
                    className="rounded-lg border border-hair bg-ink-900 p-3 text-left transition-colors hover:border-hair-strong hover:bg-ink-800"
                  >
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-500">
                      {s.label}
                    </span>
                    <span className="mt-1.5 block font-serif text-[15px] leading-snug text-ink-200">
                      {s.question}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-[640px] flex-col gap-8">
              {messages.map((m) => {
                if (m.role === 'user') {
                  return (
                    <div key={m.id}>
                      <h2 className="text-balance font-serif text-[22px] font-semibold leading-snug tracking-tight text-ink-100">
                        {m.content}
                      </h2>
                    </div>
                  );
                }
                const { segments, sources } = parseAnswer(m.content, m.citations);
                return (
                  <div key={m.id} className="-mt-5">
                    <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-500">
                      <span>
                        {sources.length} {sources.length === 1 ? 'source' : 'sources'}
                      </span>
                      {sources.length > 0 && (
                        <>
                          <span className="h-[3px] w-[3px] rounded-full bg-ink-500" />
                          <span>{[...new Set(sources.map((s) => CATEGORY_LABEL[s.category]))].join(' · ')}</span>
                        </>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap font-serif text-[16.5px] leading-[1.78] text-ink-200">
                      {segments.map((seg, i) =>
                        seg.type === 'text' ? (
                          <React.Fragment key={i}>{seg.value}</React.Fragment>
                        ) : (
                          <sup
                            key={i}
                            className="pl-px font-sans text-[0.62em] font-semibold tabular-nums text-accent"
                          >
                            {seg.label}
                          </sup>
                        )
                      )}
                    </div>
                    {sources.length > 0 && (
                      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:hidden">
                        {sources.map((s) => (
                          <SourceCard key={s.label} source={s} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {sending && (
                <p className="-mt-5 font-serif text-[16.5px] italic text-ink-500">Searching the library…</p>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pb-5">
          {error && <p className="mb-2 text-[12px] text-red-400">{error}</p>}
          <div className="mx-auto flex max-w-[640px] items-end gap-2 rounded-xl border border-hair bg-ink-900 py-2 pl-3.5 pr-2 focus-within:border-hair-strong">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={isEmpty ? 'Ask anything…' : 'Ask a follow-up…'}
              className="max-h-32 flex-1 resize-none bg-transparent py-1.5 text-[14px] text-ink-100 outline-none placeholder:text-ink-500"
            />
            <button
              onClick={() => send(input)}
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-on transition disabled:opacity-40"
            >
              <IconSend className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <aside className="hidden w-[268px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-hair bg-ink-900 p-3.5 lg:flex">
        <div className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500">
          <span>Sources</span>
          {railSources.length > 0 && <span className="tabular-nums">{railSources.length}</span>}
        </div>
        {railSources.length === 0 ? (
          <p className="mt-1 text-[12px] leading-relaxed text-ink-500">
            Every answer cites the passages it drew on. They'll appear here as you ask.
          </p>
        ) : (
          railSources.map((s) => <SourceCard key={s.label} source={s} />)
        )}
      </aside>
    </div>
  );
};

export default GuidanceChat;
