import type { PassageVerse } from '@/features/bible/passage';
import { TYPE } from '@/templates/metrics';
import {
  BIBLE_LAYOUT,
  approxMeasure,
  countLines,
  paginate,
  readingPages,
  verseBox,
} from './paginate';

function verses(n: number, words = 20): PassageVerse[] {
  return Array.from({ length: n }, (_, i) => ({
    osis: `PSA.119.${i + 1}`,
    chapter: 119,
    verse: i + 1,
    text: Array.from({ length: words }, (_, w) => `word${w}`).join(' ') + '.',
    missing: false,
  }));
}

describe('paginate', () => {
  it('pages readings in pairs without splitting, losing, or duplicating verses', () => {
    const input = verses(5, 80);
    input[1]!.missing = true;
    const pages = readingPages(input, 'lampstand');
    expect(pages.map((p) => p.segments.map((v) => v.verse))).toEqual([[1, 2], [3, 4], [5]]);
    expect(pages[0]!.segments[0]!.text).toBe(input[0]!.text);
    expect(pages[0]!.segments[1]!.missing).toBe(true);
    expect(pages[0]!.segments[1]!.text).toContain('not included');
    expect(readingPages([], 'lampstand')).toEqual([]);
  });
  it('keeps a short passage on one page at full size', () => {
    const pages = paginate(verses(1, 12), verseBox('slide'), approxMeasure);
    expect(pages).toHaveLength(1);
    expect(pages[0]!.size).toBe(TYPE.verse);
  });

  it('splits long passages at verse boundaries and never drops text', () => {
    const input = verses(30);
    const pages = paginate(input, verseBox('lowerThird'), approxMeasure);
    expect(pages.length).toBeGreaterThan(5);
    const verseNums = pages.flatMap((p) => p.segments.map((s) => s.verse));
    expect(verseNums).toEqual(input.map((v) => v.verse));
    for (const p of pages) expect(p.size).toBeGreaterThanOrEqual(TYPE.minimumBody);
  });

  it('fits more on a full screen page than in a lower third', () => {
    const input = verses(20);
    expect(paginate(input, verseBox('fullScreen')).length).toBeLessThan(
      paginate(input, verseBox('lowerThird')).length,
    );
  });

  it('splits one very long verse at sentence breaks, keeping all words', () => {
    const long =
      Array.from(
        { length: 12 },
        (_, i) => `Sentence ${i} has several words in it to fill space`,
      ).join('. ') + '.';
    const pages = paginate(
      [{ osis: 'EST.8.9', chapter: 8, verse: 9, text: long, missing: false }],
      verseBox('lowerThird'),
    );
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((p) => p.segments.map((s) => s.text)).join(' ')).toBe(long);
    expect(pages[0]!.segments[0]!.showNumber).toBe(true);
    expect(pages[1]!.segments[0]!.showNumber).toBe(false);
  });

  it('every page fits its box', () => {
    const box = verseBox('sidePanel');
    for (const p of paginate(verses(25), box)) {
      const text = p.segments.map((s) => `00 ${s.text}`).join(' ');
      expect(
        countLines(text, box.width, p.size, approxMeasure) * p.size * 1.35,
      ).toBeLessThanOrEqual(box.height);
    }
  });
});

describe('paginate for Show the Bible (a verse per line, whole verses)', () => {
  it('never cuts a verse across pages, even one too long for a page', () => {
    const input = [
      ...verses(3),
      ...verses(1, 400).map((v) => ({ ...v, verse: 4, osis: 'PSA.119.4' })),
    ];
    const pages = paginate(input, verseBox('fullScreen'), approxMeasure, BIBLE_LAYOUT);
    const segments = pages.flatMap((p) => p.segments);
    // Each verse appears once, whole, with its number.
    expect(segments.map((s) => s.verse)).toEqual([1, 2, 3, 4]);
    expect(segments.every((s) => s.showNumber)).toBe(true);
    expect(segments.map((s) => s.text)).toEqual(input.map((v) => v.text));
    // The long verse has a page of its own, smaller.
    const last = pages[pages.length - 1]!;
    expect(last.segments.map((s) => s.verse)).toEqual([4]);
    expect(last.size).toBeLessThan(TYPE.minimumBody);
  });

  it('allows for each verse starting a new line', () => {
    const input = verses(12, 6);
    const flowing = paginate(input, verseBox('fullScreen'), approxMeasure);
    const lines = paginate(input, verseBox('fullScreen'), approxMeasure, BIBLE_LAYOUT);
    const size = (p: typeof lines) => p.reduce((n, page) => n + page.size, 0) / p.length;
    // Short verses on their own lines take more room: more pages, or smaller type.
    expect(lines.length > flowing.length || size(lines) < size(flowing)).toBe(true);
  });
});
