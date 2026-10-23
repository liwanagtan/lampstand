// Compact numbers for word study data (scripts/build-wordstudy.ts), shared by the build and the app.

/** A Strong's number as one integer: Hebrew as is (H5216 → 5216), Greek plus 10000 (G3056 → 13056). */
export function strongKey(lang: 'H' | 'G', n: number): number {
  return lang === 'G' ? 10000 + n : n;
}

/** 13056 → "G3056". */
export function strongLabel(key: number): string {
  return key >= 10000 ? `G${key - 10000}` : `H${key}`;
}

/** The lexicon file holding a Strong's number: 100 numbers to a file (H5216 → "H52"). */
export function strongChunk(key: number): string {
  return `${key >= 10000 ? 'G' : 'H'}${Math.floor((key % 10000) / 100)}`;
}

/** A verse as one integer: book index (0 = Genesis), chapter and verse (PSA 119:105 → 18119105). */
export function verseKey(bookIndex: number, chapter: number, verse: number): number {
  return bookIndex * 1_000_000 + chapter * 1000 + verse;
}

export function fromVerseKey(key: number): { bookIndex: number; chapter: number; verse: number } {
  return {
    bookIndex: Math.floor(key / 1_000_000),
    chapter: Math.floor((key % 1_000_000) / 1000),
    verse: key % 1000,
  };
}
