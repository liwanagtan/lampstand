// Words you can click on the console's Live pane (Screen › Show the Bible) to highlight them on
// the TV. Only the console provides LiveTextTools; the TV never does, so it draws verses plain.
import { createContext, useContext } from 'react';
import { splitEmphasis } from './emphasis';

export interface LiveTextTools {
  /** Light a word up on the TV, or turn it off. */
  onHighlight: (word: string) => void;
}

export const LiveTextContext = createContext<LiveTextTools | null>(null);
export const useLiveText = () => useContext(LiveTextContext);

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

interface Piece {
  text: string;
  emphasis: boolean;
  /** A word you can click. */
  word: boolean;
}

/** A verse's text cut into what the Live pane draws: highlighted runs, and clickable words. */
export function livePieces(text: string, emphasis: readonly string[] | undefined): Piece[] {
  const out: Piece[] = [];
  for (const run of splitEmphasis(text, emphasis)) {
    let last = 0;
    for (const m of run.text.matchAll(WORD)) {
      if (m.index > last)
        out.push({ text: run.text.slice(last, m.index), emphasis: run.emphasis, word: false });
      out.push({ text: m[0], emphasis: run.emphasis, word: true });
      last = m.index + m[0].length;
    }
    if (last < run.text.length)
      out.push({ text: run.text.slice(last), emphasis: run.emphasis, word: false });
  }
  return out;
}
