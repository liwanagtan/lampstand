import { db } from '@/db/db';
import { defaultVerseCounts } from '@/features/bible/ref';
import {
  PLANS,
  formatReading,
  nextUnread,
  planDay,
  planSchedule,
  setDayRead,
  startPlan,
} from './plans';

describe('reading plans', () => {
  it.each(PLANS.map((p) => [p.id, p] as const))(
    '%s covers every chapter once, in order, in the right number of days',
    (_, plan) => {
      const days = planSchedule(plan);
      expect(days).toHaveLength(plan.days);
      expect(days.every((d) => d.length > 0)).toBe(true);
      const flat = days.flat();
      const expected = plan.books.flatMap((b) =>
        (defaultVerseCounts(b) ?? []).map((_, i) => `${b}.${i + 1}`),
      );
      expect(flat.map((c) => `${c.book}.${c.chapter}`)).toEqual(expected);
    },
  );

  it('balances by verses, not chapters', () => {
    const plan = PLANS.find((p) => p.id === 'psalms-proverbs-30')!;
    const day119 = planSchedule(plan).find((d) =>
      d.some((c) => c.book === 'PSA' && c.chapter === 119),
    )!;
    // Psalm 119 (176 verses) is most of a day on its own.
    expect(day119.length).toBeLessThanOrEqual(2);
  });

  it('formats a day reading', () => {
    expect(
      formatReading([
        { book: 'GEN', chapter: 1 },
        { book: 'GEN', chapter: 2 },
        { book: 'GEN', chapter: 3 },
      ]),
    ).toBe('Genesis 1–3');
    expect(formatReading([{ book: 'PSA', chapter: 119 }])).toBe('Psalm 119');
    expect(
      formatReading([
        { book: 'MAL', chapter: 4 },
        { book: 'MAT', chapter: 1 },
      ]),
    ).toBe('Malachi 4; Matthew 1');
    expect(formatReading([{ book: 'JUD', chapter: 1 }])).toBe('Jude');
  });

  it('tracks progress and today', async () => {
    await db.plans.clear();
    await startPlan('gospels-40');
    await setDayRead('gospels-40', 1, true);
    await setDayRead('gospels-40', 2, true);
    await setDayRead('gospels-40', 2, false);
    const p = (await db.plans.get('gospels-40'))!;
    expect(p.done).toEqual([1]);
    const plan = PLANS.find((x) => x.id === 'gospels-40')!;
    expect(nextUnread(p, plan)).toBe(2);
    const start = new Date(p.startedAt);
    const later = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4, 12);
    expect(planDay(p, plan, later)).toBe(5);
    expect(planDay(p, plan, new Date(start.getFullYear() + 1, 0, 1))).toBe(40);
  });
});
