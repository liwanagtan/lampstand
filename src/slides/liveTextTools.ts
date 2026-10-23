// Words you can click on the console's Live pane (Screen › Show the Bible). Only the console
// provides LiveTextTools; the TV never does, so it draws the verse exactly as before.
import { createContext, useContext } from 'react';
import type { WordSpan } from '@/features/bible-app/wordStudy';
import { splitEmphasis } from './emphasis';

export interface LiveTextTools {
  /** Highlight: click any word to light it up. Words: click an underlined word to study it. */
  mode: 'highlight' | 'words';
  onHighlight: (word: string) => void;
  /** The linked words of a verse's text on screen (BSB only), or null. */
  wordsFor: (osis: string, text: string) => WordSpan[] | null;
  /** The word on the TV, shown picked out. */
  active: { osis: string; strong: number } | null;
  onWord: (osis: string, strong: number, text: string) => void;
}

export const LiveTextContext = createContext<LiveTextTools | null>(null);
export const useLiveText = () => useContext(LiveTextContext);

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

interface Piece {
  text: string;
  emphasis: boolean;
  /** A word to highlight (Highlight mode). */
  word?: boolean;
  /** A word to study (Words mode). */
  strong?: number;
}

/** A verse's text cut into what the Live pane draws: highlighted runs, and clickable words. */
export function livePieces(
  text: string,
  emphasis: readonly string[] | undefined,
  mode: LiveTextTools['mode'],
  spans: WordSpan[] | null,
): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const run of splitEmphasis(text, emphasis)) {
    const start = at;
    at += run.text.length;
    const cuts: { from: number; to: number; strong?: number }[] =
      mode === 'highlight'
        ? [...run.text.matchAll(WORD)].map((m) => ({
            from: m.index,
            to: m.index + m[0].length,
          }))
        : (spans ?? [])
            .filter((w) => w.start >= start && w.start + w.length <= at)
            .map((w) => ({
              from: w.start - start,
              to: w.start - start + w.length,
              strong: w.strong,
            }));
    let last = 0;
    for (const c of cuts) {
      if (c.from < last) continue;
      if (c.from > last) out.push({ text: run.text.slice(last, c.from), emphasis: run.emphasis });
      out.push({
        text: run.text.slice(c.from, c.to),
        emphasis: run.emphasis,
        ...(mode === 'highlight' ? { word: true } : { strong: c.strong }),
      });
      last = c.to;
    }
    if (last < run.text.length) out.push({ text: run.text.slice(last), emphasis: run.emphasis });
  }
  return out;
}
