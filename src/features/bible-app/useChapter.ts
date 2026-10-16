import { useEffect, useState } from 'react';
import { db } from '@/db/db';
import { getTranslation, useBible } from '@/features/bible/bibleStore';
import { getPassage, type Passage } from '@/features/bible/passage';
import { verseCountsFor } from '@/features/bible/versification';

/** All verses of one chapter in one translation. */
export function useChapter(code: string | null, book: string, chapter: number): Passage | null {
  const translations = useBible((s) => s.translations);
  const [state, setState] = useState<{ key: string; passage: Passage } | null>(null);
  const key = `${code}|${book}|${chapter}`;
  useEffect(() => {
    if (!code) return;
    const t = translations.find((x) => x.code === code) ?? getTranslation(code);
    if (!t) return;
    const count = verseCountsFor(t)(book)?.[chapter - 1];
    if (!count) return;
    let alive = true;
    void getPassage(db, t, {
      start: { book, chapter, verse: 1 },
      end: { book, chapter, verse: count },
    }).then((passage) => alive && setState({ key, passage }));
    return () => {
      alive = false;
    };
  }, [key, code, book, chapter, translations]);
  return state?.key === key ? state.passage : null;
}

/** Chapters in a book for a translation (falls back to KJV versification). */
export function chapterCount(code: string, book: string): number {
  return verseCountsFor(getTranslation(code))(book)?.length ?? 0;
}
