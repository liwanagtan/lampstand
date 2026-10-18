// Tyndale Open Study Notes (CC BY-SA 4.0): one file per book, fetched when first needed and
// then kept offline by the service worker. Built by scripts/build-notes.ts.
import { useEffect, useState } from 'react';
import type { RefRange } from '@/features/bible/ref';

export interface StudyNote {
  /** Start and end as [chapter, verse]; 999 means "to the end of the chapter". */
  s: [number, number];
  e: [number, number];
  html: string;
}
export interface BookNotes {
  book: string;
  summary: string | null;
  intro: string | null;
  notes: StudyNote[];
}

export const STUDY_NOTES_CREDIT =
  'Adapted from Tyndale Open Study Notes. The original work by Tyndale House Publishers is available for free at tyndaleopenresources.com. CC BY-SA 4.0.';

const cache = new Map<string, Promise<BookNotes | null>>();
function load(book: string): Promise<BookNotes | null> {
  let p = cache.get(book);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}notes/${book}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<BookNotes>) : null))
      .catch(() => null);
    cache.set(book, p);
    // Let a failed load (offline before the notes were cached) be retried next time.
    void p.then((v) => v === null && cache.delete(book));
  }
  return p;
}

/** A book's notes: undefined while loading, null when unavailable (e.g. offline, not yet saved). */
export function useStudyNotes(book: string | null): BookNotes | null | undefined {
  const [state, setState] = useState<{ book: string; notes: BookNotes | null } | null>(null);
  useEffect(() => {
    if (!book) return;
    let alive = true;
    void load(book).then((notes) => alive && setState({ book, notes }));
    return () => {
      alive = false;
    };
  }, [book]);
  if (!book) return null;
  return state?.book === book ? state.notes : undefined;
}

/** Notes that start in a chapter, by their first verse. */
export function notesByVerse(book: BookNotes | null | undefined, chapter: number) {
  const out = new Map<number, StudyNote[]>();
  for (const n of book?.notes ?? []) {
    if (n.s[0] !== chapter) continue;
    const list = out.get(n.s[1]) ?? [];
    list.push(n);
    out.set(n.s[1], list);
  }
  return out;
}

const point = (c: number, v: number) => c * 1000 + v;

/** Notes that overlap a passage (one book), in order. */
export function notesForRange(book: BookNotes | null | undefined, r: RefRange): StudyNote[] {
  if (!book || r.start.book !== book.book) return [];
  const from = point(r.start.chapter, r.start.verse);
  const to = r.end.book === r.start.book ? point(r.end.chapter, r.end.verse) : point(999, 999);
  return book.notes.filter((n) => point(n.s[0], n.s[1]) <= to && point(n.e[0], n.e[1]) >= from);
}
