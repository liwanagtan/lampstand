// Checks the bundled translation files (public/bibles) — PRD §13 milestone 4 done criteria.
import { readFileSync } from 'node:fs';
import type { TranslationFile } from '@/schema/translation';
import { TranslationFileSchema } from '@/schema/translation';
import { BOOKS } from './books';
import { defaultVerseCounts } from './ref';
import { buildIndex, searchIndex } from './searchCore';

const CODES = ['bsb', 'kjv', 'web'] as const;
const files = Object.fromEntries(
  CODES.map((c) => [
    c,
    JSON.parse(readFileSync(`public/bibles/${c}.json`, 'utf8')) as TranslationFile,
  ]),
) as Record<(typeof CODES)[number], TranslationFile>;

// WEB places the Romans doxology at 14:24-26 instead of 16:25-27.
const KNOWN_GAPS: Record<string, string[]> = { web: ['ROM.16.26', 'ROM.16.27'] };

describe.each(CODES)('%s', (code) => {
  const file = files[code];

  it('is a valid translation file with the 66 books in order', () => {
    expect(TranslationFileSchema.safeParse(file).success).toBe(true);
    expect(file.books.map((b) => b.osis)).toEqual(BOOKS.map((b) => b.code));
  });

  it('resolves every book, chapter and verse of the standard versification', () => {
    const lookup = new Map(file.books.map((b) => [b.osis, b.chapters]));
    const unresolved: string[] = [];
    for (const book of BOOKS) {
      const counts = defaultVerseCounts(book.code)!;
      counts.forEach((n, ci) => {
        for (let v = 1; v <= n; v++) {
          if (lookup.get(book.code)?.[ci]?.[v - 1] === undefined)
            unresolved.push(`${book.code}.${ci + 1}.${v}`);
        }
      });
    }
    expect(unresolved).toEqual(KNOWN_GAPS[code] ?? []);
  });

  it('has clean text', () => {
    const all = file.books.flatMap((b) => b.chapters.flat());
    const bad = /<|>|\{|\}|`|\[|\]|\b[a-z]+God\b/;
    expect(all.filter((t) => bad.test(t)).slice(0, 3)).toEqual([]);
    expect(all.filter((t) => t.trim() === '').length).toBeLessThan(20);
  });
});

it('John 3:16 reads correctly in KJV', () => {
  const jhn = files.kjv.books.find((b) => b.osis === 'JHN')!;
  expect(jhn.chapters[2]![15]).toMatch(/^For God so loved the world/);
});

describe('word search on KJV', () => {
  const docs = files.kjv.books.flatMap((b) =>
    b.chapters.flatMap((ch, ci) =>
      ch.map((text, vi) => ({ id: `${b.osis}.${ci + 1}.${vi + 1}`, text })),
    ),
  );
  const index = buildIndex(docs.filter((d) => d.text));

  it('ranks exact phrase matches first', () => {
    const hits = searchIndex(index, '"so loved"');
    expect(hits.slice(0, 3).map((h) => h.osis)).toContain('JHN.3.16');
    expect(hits[0]?.exact).toBe(true);
  });

  it('answers in under 150 ms', () => {
    const queries = [
      'lamp unto my feet',
      'shepherd',
      'faith hope charity',
      'light of the world',
      'be still',
    ];
    for (const q of queries) {
      const t0 = performance.now();
      const hits = searchIndex(index, q);
      expect(performance.now() - t0).toBeLessThan(150);
      expect(hits.length).toBeGreaterThan(0);
    }
    expect(searchIndex(index, 'lamp unto my feet')[0]?.osis).toBe('PSA.119.105');
  });
});
