// A passage's name from its id, for link previews and the daily verse (no Worker APIs here).
import { BOOK_BY_CODE } from '../src/features/bible/books';

const OSIS =
  /^([1-3]?[A-Z]{2,3})\.(\d{1,3})(?:\.(\d{1,3}))?(?:-(?:[1-3]?[A-Z]{2,3}\.)?(?:\d{1,3}\.)?(\d{1,3}))?$/;

/** "GEN.28.15" → "Genesis 28:15"; "PSA.23.1-PSA.23.3" → "Psalm 23:1–3". Null if not a passage. */
export function referenceFor(osis: string): string | null {
  const m = OSIS.exec(osis);
  const book = m && BOOK_BY_CODE.get(m[1]!);
  if (!m || !book) return null;
  const [, , chapter, verse, end] = m;
  if (!verse) return `${book.refName} ${chapter}`;
  return `${book.refName} ${chapter}:${verse}${end && end !== verse ? `–${end}` : ''}`;
}
