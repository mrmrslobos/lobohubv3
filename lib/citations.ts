// The guidance model cites retrieved excerpts inline as bracketed numbers ([1], [3]),
// where the number is the excerpt's position in the list handed to it — which is the
// same order as the `citations` array on the response. This turns that flat string
// into renderable segments plus the de-duplicated, re-numbered set of sources the
// answer actually leaned on, so the rail shows four cards rather than all eight
// retrieved passages.
import type { Citation } from '../types';

export type AnswerSegment =
  | { type: 'text'; value: string }
  | { type: 'cite'; label: number };

export interface CitedSource extends Citation {
  /** 1-based position in the rendered source list. */
  label: number;
}

export interface ParsedAnswer {
  segments: AnswerSegment[];
  sources: CitedSource[];
}

const MARKER = /\[(\d{1,2})\]/g;

export function parseAnswer(content: string, citations: Citation[] | undefined): ParsedAnswer {
  const all = citations ?? [];

  // First pass: which excerpts were actually cited, in order of first appearance.
  const order: number[] = [];
  for (const match of content.matchAll(MARKER)) {
    const index = Number(match[1]) - 1;
    if (all[index] && !order.includes(index)) order.push(index);
  }

  // No usable markers — older messages, or the model ignored the instruction.
  // Fall back to listing every retrieved passage and leaving the prose untouched.
  if (order.length === 0) {
    return {
      segments: [{ type: 'text', value: content }],
      sources: all.slice(0, 5).map((c, i) => ({ ...c, label: i + 1 })),
    };
  }

  const labelFor = new Map(order.map((index, i) => [index, i + 1]));

  const segments: AnswerSegment[] = [];
  let cursor = 0;
  for (const match of content.matchAll(MARKER)) {
    const index = Number(match[1]) - 1;
    const label = labelFor.get(index);
    if (label === undefined) continue; // a number with no matching excerpt — leave it as prose
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ type: 'text', value: content.slice(cursor, start) });
    segments.push({ type: 'cite', label });
    cursor = start + match[0].length;
  }
  if (cursor < content.length) segments.push({ type: 'text', value: content.slice(cursor) });

  return {
    segments,
    sources: order.map((index, i) => ({ ...all[index], label: i + 1 })),
  };
}
