import { splitVerse, verseWords } from './wordStudy';
import { fromVerseKey, strongChunk, strongKey, strongLabel, verseKey } from './wordStudyCodes';

describe('word study codes', () => {
  it('packs Strong’s numbers and verses into integers and back', () => {
    expect(strongKey('H', 5216)).toBe(5216);
    expect(strongKey('G', 3056)).toBe(13056);
    expect(strongLabel(5216)).toBe('H5216');
    expect(strongLabel(13056)).toBe('G3056');
    expect(strongChunk(5216)).toBe('H52');
    expect(strongChunk(13056)).toBe('G30');
    expect(strongChunk(strongKey('G', 25))).toBe('G0');
    const key = verseKey(18, 119, 105);
    expect(key).toBe(18119105);
    expect(fromVerseKey(key)).toEqual({ bookIndex: 18, chapter: 119, verse: 105 });
  });
});

describe('verseWords and splitVerse', () => {
  const text = 'Your word is a lamp to my feet and a light to my path.';
  const book = {
    book: 'PSA',
    chapters: Array.from({ length: 119 }, (_, c) =>
      c === 118
        ? Array.from({ length: 105 }, (_, v) => (v === 104 ? [5, 4, 1697, 15, 4, 5216] : []))
        : [],
    ),
  };

  it('reads one verse’s linked words', () => {
    expect(verseWords(book, 119, 105)).toEqual([
      { start: 5, length: 4, strong: 1697 },
      { start: 15, length: 4, strong: 5216 },
    ]);
    expect(verseWords(book, 119, 1)).toEqual([]);
    expect(verseWords(null, 119, 105)).toEqual([]);
  });

  it('cuts a verse into plain runs and words, covering every character once', () => {
    const runs = splitVerse(text, verseWords(book, 119, 105));
    expect(runs.map((r) => r.text).join('')).toBe(text);
    expect(runs.filter((r) => 'word' in r).map((r) => r.text)).toEqual(['word', 'lamp']);
  });

  it('skips links that don’t fit the text', () => {
    const runs = splitVerse('Short.', [{ start: 2, length: 40, strong: 1 }]);
    expect(runs).toEqual([{ text: 'Short.' }]);
  });
});
