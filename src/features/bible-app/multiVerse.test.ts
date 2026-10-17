import { db } from '@/db/db';
import { markChapters } from '@/db/markChapters';
import { fromOsis } from '@/features/bible/ref';
import { chapterMarksFrom, saveNote, setHighlight, toggleBookmark } from './marks';
import { nextSelection, pickSelection, selectionRange } from './readerStore';

const range = (id: string) => fromOsis(id)!;

describe('tapping verses to select a range', () => {
  it('taps once to select, taps another to stretch, taps the lone verse to clear', () => {
    const one = nextSelection(null, 12, false);
    expect(one).toEqual({ start: 12, end: 12 });
    expect(nextSelection(one, 18, false)).toEqual({ start: 12, end: 18 });
    expect(nextSelection(one, 9, false)).toEqual({ start: 9, end: 12 });
    expect(nextSelection(one, 12, false)).toBeNull();
  });

  it('starts over after a range; Shift stretches from the start', () => {
    const r = { start: 12, end: 18 };
    expect(nextSelection(r, 20, false)).toEqual({ start: 20, end: 20 });
    expect(nextSelection(r, 22, true)).toEqual({ start: 12, end: 22 });
  });

  it('the Screen console picks one verse per click', () => {
    expect(pickSelection({ start: 16, end: 16 }, 18, false)).toEqual({ start: 18, end: 18 });
    expect(pickSelection({ start: 16, end: 16 }, 16, false)).toBeNull();
    expect(pickSelection({ start: 16, end: 16 }, 18, true)).toEqual({ start: 16, end: 18 });
  });

  it('a typed range across chapters marks the whole range', () => {
    const span = range('JHN.3.36-JHN.4.2');
    expect(selectionRange('JHN', 3, { start: 36, end: 36, span })).toBe(span);
    expect(nextSelection({ start: 36, end: 36, span }, 36, false)).toEqual({ start: 36, end: 36 });
  });
});

describe('marks across chapters', () => {
  beforeEach(() => db.marks.clear());

  it('lists every chapter a ref touches', () => {
    expect(markChapters('JHN.3.16')).toEqual(['JHN.3']);
    expect(markChapters('JHN.3.36-JHN.5.2')).toEqual(['JHN.3', 'JHN.4', 'JHN.5']);
    expect(markChapters('nonsense')).toEqual([]);
  });

  it('a cross-chapter note and bookmark show in both chapters', async () => {
    await saveNote(null, range('JHN.3.34-JHN.4.2'), 'Both chapters');
    await toggleBookmark(range('JHN.3.34-JHN.4.2'));
    const in3 = await db.marks.where('chapters').equals('JHN.3').toArray();
    const in4 = await db.marks.where('chapters').equals('JHN.4').toArray();
    expect(in3).toHaveLength(2);
    expect(in4).toHaveLength(2);

    const three = chapterMarksFrom(in3, 'JHN', 3);
    expect(three.bookmarks.has(34)).toBe(true);
    expect(three.notes.has(36)).toBe(true); // runs to the end of John 3
    expect(three.noteSpans).toEqual([expect.objectContaining({ start: 34, end: 36 })]);

    const four = chapterMarksFrom(in4, 'JHN', 4);
    expect(four.bookmarks.has(1)).toBe(true);
    expect(four.notes.has(2)).toBe(true);
    expect(four.noteSpans).toEqual([expect.objectContaining({ start: 1, end: 2 })]);
  });

  it('highlights a range across chapters verse by verse', async () => {
    await setHighlight(range('JHN.3.35-JHN.4.1'), 'green');
    expect(await db.marks.count()).toBe(3);
    expect((await db.marks.get('h:JHN.4.1'))?.chapters).toEqual(['JHN.4']);
  });

  it('a single-verse note gets no bracket', async () => {
    await saveNote(null, range('ROM.8.28'), 'One verse');
    const rows = await db.marks.where('chapters').equals('ROM.8').toArray();
    expect(chapterMarksFrom(rows, 'ROM', 8).noteSpans).toEqual([]);
  });
});
