import { BOOKS, BOOK_INDEX } from './books';
import type { RefRange, VerseCounts, VersePoint } from './ref';

/** The verse after (delta = 1) or before (delta = -1) a point, crossing chapters and books. */
export function stepVerse(p: VersePoint, delta: 1 | -1, counts: VerseCounts): VersePoint | null {
  let bi = BOOK_INDEX.get(p.book)!;
  let { chapter, verse } = p;
  verse += delta;
  for (;;) {
    const chapters = counts(BOOKS[bi]!.code) ?? [];
    if (verse >= 1 && verse <= (chapters[chapter - 1] ?? 0))
      return { book: BOOKS[bi]!.code, chapter, verse };
    if (delta > 0) {
      chapter += 1;
      verse = 1;
      if (chapter > chapters.length) {
        bi += 1;
        chapter = 1;
        if (bi >= BOOKS.length) return null;
      }
    } else {
      chapter -= 1;
      if (chapter < 1) {
        bi -= 1;
        if (bi < 0) return null;
        chapter = (counts(BOOKS[bi]!.code) ?? []).length;
      }
      verse = (counts(BOOKS[bi]!.code) ?? [])[chapter - 1] ?? 0;
    }
  }
}

/** The single verse after the range (next) or before it (previous). */
export function adjacentVerse(
  range: RefRange,
  delta: 1 | -1,
  counts: VerseCounts,
): RefRange | null {
  const p = stepVerse(delta > 0 ? range.end : range.start, delta, counts);
  return p ? { start: p, end: p } : null;
}
