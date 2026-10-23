// Word study: the Hebrew or Greek word behind a word of the Berean Standard Bible (public domain),
// with STEP Bible's brief lexicons (CC BY 4.0). Built by scripts/build-wordstudy.ts; each book and
// each lexicon file is fetched when first needed, then kept offline by the service worker.
import { useEffect, useState } from 'react';
import { strongChunk } from './wordStudyCodes';

export const WORD_STUDY_CREDIT =
  'Words linked by the Berean Standard Bible (public domain). Meanings from STEP Bible, www.STEPBible.org (CC BY 4.0), shortened.';

/** The translation whose words are linked; other translations study a verse through it. */
export const WORD_STUDY_TRANSLATION = 'BSB';

/** One linked word in a verse: where it is in the BSB text and its Strong's number. */
export interface WordSpan {
  start: number;
  length: number;
  strong: number;
}

interface BookWords {
  book: string;
  /** Chapters → verses → flat [start, length, strong, …]. */
  chapters: number[][][];
}

export interface WordEntry {
  /** Original word, transliteration, part of speech, gloss, short meaning, verses. */
  w: string;
  t: string;
  p: string;
  g: string;
  m: string[];
  r: number[];
}

function cached<T>(url: string, cache: Map<string, Promise<T | null>>): Promise<T | null> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}${url}`)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .catch(() => null);
    cache.set(url, p);
    // A failed load (offline before the file was saved) can be retried next time.
    void p.then((v) => v === null && cache.delete(url));
  }
  return p;
}

const books = new Map<string, Promise<BookWords | null>>();
const lexicon = new Map<string, Promise<Record<string, WordEntry> | null>>();

export const loadBookWords = (book: string) => cached(`words/${book}.json`, books);

export async function loadWord(strong: number): Promise<WordEntry | null> {
  const chunk = await cached(`words/lex/${strongChunk(strong)}.json`, lexicon);
  return chunk?.[strong] ?? null;
}

/** The linked words of one verse, in text order. */
export function verseWords(
  book: BookWords | null | undefined,
  chapter: number,
  verse: number,
): WordSpan[] {
  const flat = book?.chapters[chapter - 1]?.[verse - 1] ?? [];
  const out: WordSpan[] = [];
  for (let i = 0; i + 2 < flat.length; i += 3)
    out.push({ start: flat[i]!, length: flat[i + 1]!, strong: flat[i + 2]! });
  return out;
}

/** A book's linked words: undefined while loading, null when unavailable (e.g. offline). */
export function useBookWords(book: string | null): BookWords | null | undefined {
  const [state, setState] = useState<{ book: string; words: BookWords | null } | null>(null);
  useEffect(() => {
    if (!book) return;
    let alive = true;
    void loadBookWords(book).then((words) => alive && setState({ book, words }));
    return () => {
      alive = false;
    };
  }, [book]);
  if (!book) return null;
  return state?.book === book ? state.words : undefined;
}

/** A lexicon entry: undefined while loading, null when unavailable. */
export function useWord(strong: number | null): WordEntry | null | undefined {
  const [state, setState] = useState<{ strong: number; entry: WordEntry | null } | null>(null);
  useEffect(() => {
    if (strong === null) return;
    let alive = true;
    void loadWord(strong).then((entry) => alive && setState({ strong, entry }));
    return () => {
      alive = false;
    };
  }, [strong]);
  if (strong === null) return null;
  return state?.strong === strong ? state.entry : undefined;
}

/** A verse's text cut into plain runs and linked words, for drawing underlines. */
export function splitVerse(
  text: string,
  spans: WordSpan[],
): ({ text: string } | { text: string; word: WordSpan; index: number })[] {
  const out: ({ text: string } | { text: string; word: WordSpan; index: number })[] = [];
  let at = 0;
  spans.forEach((s, index) => {
    // The links were built against this text; skip any that no longer fit it.
    if (s.start < at || s.start + s.length > text.length) return;
    if (s.start > at) out.push({ text: text.slice(at, s.start) });
    out.push({ text: text.slice(s.start, s.start + s.length), word: s, index });
    at = s.start + s.length;
  });
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
