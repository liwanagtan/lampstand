// Checks the generated word study files (public/words, scripts/build-wordstudy.ts) against the
// bundled BSB text they underline.
import { existsSync, readFileSync } from 'node:fs';
import type { TranslationFile } from '@/schema/translation';
import { BOOKS } from '@/features/bible/books';
import { splitVerse, verseWords, type WordEntry } from './wordStudy';
import { fromVerseKey, strongChunk } from './wordStudyCodes';

const bsb = JSON.parse(readFileSync('public/bibles/bsb.json', 'utf8')) as TranslationFile;
const read = <T>(path: string) => JSON.parse(readFileSync(`public/words/${path}`, 'utf8')) as T;
type BookWords = { book: string; chapters: number[][][] };

describe('word study data', () => {
  it('has a file for each of the 66 books, shaped like the BSB', () => {
    BOOKS.forEach((b, i) => {
      const words = read<BookWords>(`${b.code}.json`);
      expect(words.book).toBe(b.code);
      expect(words.chapters.length).toBe(bsb.books[i]!.chapters.length);
    });
  });

  it('underlines whole words inside the BSB text, in order, without overlaps', () => {
    let linked = 0;
    BOOKS.forEach((b, i) => {
      const words = read<BookWords>(`${b.code}.json`);
      words.chapters.forEach((ch, c) =>
        ch.forEach((_, v) => {
          const text = bsb.books[i]!.chapters[c]![v] ?? '';
          const spans = verseWords(words, c + 1, v + 1);
          let end = 0;
          for (const s of spans) {
            expect(s.start).toBeGreaterThanOrEqual(end);
            end = s.start + s.length;
            expect(end).toBeLessThanOrEqual(text.length);
            // Starts and ends on a word boundary.
            expect(/[A-Za-z]/.test(text[s.start - 1] ?? ' ')).toBe(false);
            expect(/[A-Za-z]/.test(text[end] ?? ' ')).toBe(false);
          }
          expect(
            splitVerse(text, spans)
              .map((r) => r.text)
              .join(''),
          ).toBe(text);
          linked += spans.length;
        }),
      );
    });
    expect(linked).toBeGreaterThan(250_000);
    // Every verse of the Bible: slower than the default limit.
  }, 60_000);

  it('links Psalm 119:105 to lamp, feet, light and path', () => {
    const psa = read<BookWords>('PSA.json');
    const text = bsb.books[18]!.chapters[118]![104]!;
    const words = splitVerse(text, verseWords(psa, 119, 105))
      .filter((r) => 'word' in r)
      .map((r) => r.text);
    expect(words).toEqual(['word', 'lamp', 'feet', 'light', 'path']);
    const lamp = read<Record<string, WordEntry>>(`lex/${strongChunk(5216)}.json`)[5216]!;
    expect(lamp).toMatchObject({ w: 'נֵר', t: 'ner', g: 'lamp' });
    expect(lamp.r.map(fromVerseKey)).toContainEqual({ bookIndex: 18, chapter: 119, verse: 105 });
  });

  it('has a lexicon entry, with verses, for every linked word', () => {
    const strongs = new Set<number>();
    for (const b of BOOKS)
      for (const ch of read<BookWords>(`${b.code}.json`).chapters)
        for (const flat of ch) for (let k = 2; k < flat.length; k += 3) strongs.add(flat[k]!);
    const chunks = new Map<string, Record<string, WordEntry>>();
    for (const s of strongs) {
      const name = strongChunk(s);
      expect(existsSync(`public/words/lex/${name}.json`)).toBe(true);
      if (!chunks.has(name)) chunks.set(name, read(`lex/${name}.json`));
      const entry = chunks.get(name)![s];
      expect(entry, `entry for ${s}`).toBeDefined();
      expect(entry!.g.length).toBeGreaterThan(0);
      expect(entry!.r.length).toBeGreaterThan(0);
    }
  }, 60_000);
});
