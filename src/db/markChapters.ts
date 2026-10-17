// Which chapters a mark touches, so a note on John 3:36–4:2 shows in John 3 and John 4.
import { BOOKS, BOOK_INDEX } from '@/features/bible/books';

/** No book has more chapters than this; keys past a book's end are never looked up. */
const MAX_CHAPTERS = 150;

/** Chapter keys ("JHN.3") for a canonical ref like JHN.3.36-JHN.4.2. */
export function markChapters(ref: string): string[] {
  const points = ref.split('-').map((p) => /^([1-3A-Z]{3})\.(\d+)\.\d+$/.exec(p));
  const [s, e = s] = points;
  if (!s || !e) return [];
  const startBook = BOOK_INDEX.get(s[1]!);
  const endBook = BOOK_INDEX.get(e[1]!);
  if (startBook === undefined || endBook === undefined || endBook < startBook) return [];
  const out: string[] = [];
  for (let b = startBook; b <= endBook; b++) {
    const c0 = b === startBook ? Number(s[2]) : 1;
    const c1 = b === endBook ? Number(e[2]) : MAX_CHAPTERS;
    for (let c = c0; c <= c1; c++) out.push(`${BOOKS[b]!.code}.${c}`);
  }
  return out;
}
