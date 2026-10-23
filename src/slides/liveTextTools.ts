// Extra marks on a verse's words, beyond its highlights (Screen › Show the Bible):
// - LiveTextTools: the console's Live pane makes every word clickable to highlight it. Only the
//   console provides it; the TV never does.
// - StudyMarks: while word study is open, the studyable words are underlined (the TV too), and
//   the word on screen gets a soft box. Separate from the gold of clicked highlights.
import { createContext, useContext } from 'react';
import type { WordSpan } from '@/features/bible-app/wordStudy';
import { splitEmphasis } from './emphasis';

export interface LiveTextTools {
  /** Light a word up on the TV, or turn it off. */
  onHighlight: (word: string) => void;
}

export const LiveTextContext = createContext<LiveTextTools | null>(null);
export const useLiveText = () => useContext(LiveTextContext);

export interface StudyMarks {
  /** The studyable words of what is shown of a verse, or null. */
  spansFor: (osis: string, text: string) => WordSpan[] | null;
  /** The word on screen. */
  active: { osis: string; strong: number } | null;
}

export const StudyMarksContext = createContext<StudyMarks | null>(null);
export const useStudyMarks = () => useContext(StudyMarksContext);

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

export interface Token {
  text: string;
  /** Lit up by a clicked highlight (gold). */
  emphasis: boolean;
  /** Part of a studyable word (underlined), with its Strong's number. */
  strong: number | null;
  /** A word you can click (Live pane). */
  word: boolean;
}

/**
 * A verse's text as tokens carrying every mark: words and the gaps between them, each with its
 * highlight and its study underline. A study word of several words ("one and only") keeps its
 * underline across the spaces inside it.
 */
export function verseTokens(
  text: string,
  emphasis: readonly string[] | undefined,
  spans: WordSpan[] | null,
): Token[] {
  const emph = new Array<boolean>(text.length).fill(false);
  let at = 0;
  for (const run of splitEmphasis(text, emphasis)) {
    if (run.emphasis) emph.fill(true, at, at + run.text.length);
    at += run.text.length;
  }
  const study = new Array<number | null>(text.length).fill(null);
  for (const s of spans ?? [])
    study.fill(s.strong, s.start, Math.min(text.length, s.start + s.length));

  const out: Token[] = [];
  const push = (from: number, to: number, word: boolean) => {
    // Gaps split where their marks change; a word takes the marks of its first letter.
    let start = from;
    for (let i = from + 1; i <= to; i++) {
      const cut = i === to || (!word && (emph[i] !== emph[start] || study[i] !== study[start]));
      if (!cut) continue;
      out.push({ text: text.slice(start, i), emphasis: emph[start]!, strong: study[start]!, word });
      start = i;
    }
  };
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index > last) push(last, m.index, false);
    push(m.index, m.index + m[0].length, true);
    last = m.index + m[0].length;
  }
  if (last < text.length) push(last, text.length, false);
  return out;
}
