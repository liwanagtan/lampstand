// Words on the TV in Show the Bible: highlighting, the word staged in the Words column, and the
// W key that sends it or takes it off.
import { create } from 'zustand';
import { fromOsis } from '@/features/bible/ref';
import { useControl } from '@/features/present/live/controlStore';
import type { LiveWord } from '@/features/present/live/types';

/** Highlighted words on the TV at once (clicked on the Live pane). */
export const EMPHASIS_MAX = 12;

/** The word chosen in the Words column: previewed there, sent to the TV with Show on screen. */
export const useStagedWord = create<{ word: LiveWord | null }>(() => ({ word: null }));

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

/** Choose a word in the Words column; the TV doesn't change. */
export function stageWord(word: LiveWord) {
  useStagedWord.setState({ word });
}

/** The staged word, if it belongs to the passage on screen. */
export function stagedFor(ref: string | undefined): LiveWord | null {
  const word = useStagedWord.getState().word;
  return word && ref && overlayHas(ref, word.verse) ? word : null;
}

export function showWord(word: LiveWord) {
  useStagedWord.setState({ word });
  useControl.getState().dispatch({ type: 'showWord', word });
}

/** Take the word off the TV, or send the staged one (W in the console). */
export function toggleWord() {
  const control = useControl.getState();
  if (control.live.word) return control.dispatch({ type: 'hideWord' });
  const staged = stagedFor(control.live.overlay?.ref);
  if (staged) showWord(staged);
}
