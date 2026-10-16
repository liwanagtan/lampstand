import { parseRefDetailed, toOsis } from '@/features/bible/ref';
import { DAILY_VERSES, localDate, verseOfTheDay } from './dailyVerses';

describe('verse of the day', () => {
  it('has at least a year of distinct, valid references', () => {
    expect(DAILY_VERSES.length).toBeGreaterThanOrEqual(366);
    const ids = new Set<string>();
    for (const ref of DAILY_VERSES) {
      const r = parseRefDetailed(ref);
      if (!r.ok) throw new Error(`${ref}: ${r.hint}`);
      expect(r.range.start.book).toBe(r.range.end.book);
      ids.add(toOsis(r.range));
    }
    expect(ids.size).toBe(DAILY_VERSES.length);
  });

  it('changes at local midnight and is the same all day', () => {
    const morning = verseOfTheDay(new Date(2026, 9, 16, 0, 5));
    const night = verseOfTheDay(new Date(2026, 9, 16, 23, 55));
    const tomorrow = verseOfTheDay(new Date(2026, 9, 17, 0, 5));
    expect(morning.ref).toBe(night.ref);
    expect(tomorrow.ref).not.toBe(morning.ref);
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('does not repeat within a year', () => {
    const seen = new Set<string>();
    for (let d = 0; d < 365; d++) seen.add(verseOfTheDay(new Date(2026, 0, 1 + d)).ref);
    expect(seen.size).toBe(365);
  });
});
