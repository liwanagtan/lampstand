// The word on the TV in Show the Bible (WordStudyTools), and the W key that hides it or brings
// it back.
import { create } from 'zustand';
import { fromOsis } from '@/features/bible/ref';
import { useControl } from '@/features/present/live/controlStore';
import type { LiveWord } from '@/features/present/live/types';

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
