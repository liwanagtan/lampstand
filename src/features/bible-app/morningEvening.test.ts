import { readFileSync } from 'node:fs';
import { dayKey, halfOfDay } from './morningEvening';

describe('Morning and Evening', () => {
  it('picks the day and the half', () => {
    expect(dayKey(new Date('2026-10-19T08:00'))).toBe('10-19');
    expect(halfOfDay(new Date('2026-10-19T16:59'))).toBe('morning');
    expect(halfOfDay(new Date('2026-10-19T17:00'))).toBe('evening');
  });

  it('has a morning and an evening for all 366 days, each with a reference', () => {
    const book = JSON.parse(readFileSync('public/devotionals/morning-evening.json', 'utf8')) as {
      days: Record<
        string,
        {
          morning?: { ref: string | null; body: string[] };
          evening?: { ref: string | null; body: string[] };
        }
      >;
    };
    expect(Object.keys(book.days)).toHaveLength(366);
    expect(book.days['02-29']?.morning?.body.length).toBeGreaterThan(0);
    for (const d of Object.values(book.days)) {
      expect(d.morning?.ref).toBeTruthy();
      expect(d.evening?.ref).toBeTruthy();
    }
  });
});
