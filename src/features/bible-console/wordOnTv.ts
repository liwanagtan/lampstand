// Words on the TV in Show the Bible: highlighting, the studied word (WordStudyTools) and the W
// key that hides it or brings it back.
import { useCallback } from 'react';
import { create } from 'zustand';
import { fromOsis } from '@/features/bible/ref';
import {
  WORD_STUDY_TRANSLATION,
  useBookWords,
  verseWords,
  type WordSpan,
} from '@/features/bible-app/wordStudy';
import { usePassage } from '@/slides/usePassage';
import { useControl } from '@/features/present/live/controlStore';
import type { LiveWord } from '@/features/present/live/types';

/** Highlighted words on the TV at once (clicked on the Live pane). */
export const EMPHASIS_MAX = 12;

/** The word last put on the TV, so it can come back after the class has been asked. */
export const useLastWord = create<{ word: LiveWord | null }>(() => ({ word: null }));

/** "PSA.119.105" → its parts. */
export function parseVerse(osis: string) {
  const [book = '', c = '0', v = '0'] = osis.split('.');
  return { book, chapter: Number(c), verse: Number(v) };
}

/** Whether a verse ("PSA.119.105") is in the passage on screen ("PSA.119.105-PSA.119.106"). */
export function overlayHas(ref: string, osis: string): boolean {
  const r = fromOsis(ref);
  const v = parseVerse(osis);
  if (!r || r.start.book !== v.book) return false;
  const at = v.chapter * 1000 + v.verse;
  return at >= r.start.chapter * 1000 + r.start.verse && at <= r.end.chapter * 1000 + r.end.verse;
}

/**
 * The linked words of what the Live pane shows of a verse (BSB on screen only). A long verse can
 * be split across pages, so the shown text is found in the whole verse and the links moved to it.
 */
export function useWordsFor(ref: string | null, translation: string | null) {
  const bsb = translation === WORD_STUDY_TRANSLATION;
  const { passage } = usePassage(bsb ? ref : null, WORD_STUDY_TRANSLATION);
  const book = ref ? (fromOsis(ref)?.start.book ?? null) : null;
  const words = useBookWords(bsb ? book : null);
  return useCallback(
    (osis: string, text: string): WordSpan[] | null => {
      if (!bsb || !words) return null;
      const whole = passage?.verses.find((v) => v.osis === osis)?.text ?? text;
      const at = whole.indexOf(text);
      if (at < 0) return null;
      const v = parseVerse(osis);
      return verseWords(words, v.chapter, v.verse)
        .filter((s) => s.start >= at && s.start + s.length <= at + text.length)
        .map((s) => ({ ...s, start: s.start - at }));
    },
    [bsb, words, passage],
  );
}

export function showWord(word: LiveWord) {
  useLastWord.setState({ word });
  useControl.getState().dispatch({ type: 'showWord', word });
}

/** Hide the word on the TV, or bring the last one back (W in the console). */
export function toggleWord() {
  const control = useControl.getState();
  if (control.live.word) return control.dispatch({ type: 'hideWord' });
  const last = useLastWord.getState().word;
  const overlay = control.live.overlay;
  if (last && overlay && overlayHas(overlay.ref, last.verse)) showWord(last);
}
