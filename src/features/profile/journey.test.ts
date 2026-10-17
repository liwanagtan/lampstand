import type { JournalEntryRecord, MarkRecord, PlanProgressRecord } from '@/db/types';
import type { Plan } from '@/schema/plan';
import { journeyLine, journeyStats, profileGreeting } from './journey';

const at = (s: string) => new Date(s);
const DAY = 86_400_000;

describe('profile greeting', () => {
  it('greets by time of day', () => {
    expect(profileGreeting('Ana', at('2026-10-17T08:00'), null)).toBe('Good morning, Ana');
    expect(profileGreeting('Ana', at('2026-10-17T14:00'), null)).toBe('Good afternoon, Ana');
    expect(profileGreeting('Ana', at('2026-10-17T19:00'), null)).toBe('Good evening, Ana');
    expect(profileGreeting('Ana', at('2026-10-17T23:30'), null)).toBe('Still up, Ana?');
  });

  it('welcomes you back after a few days away', () => {
    const now = at('2026-10-17T08:00');
    expect(profileGreeting('Ana', now, now.getTime() - 4 * DAY)).toBe('Welcome back, Ana');
    expect(profileGreeting('Ana', now, now.getTime() - DAY)).toBe('Good morning, Ana');
  });

  it('has a plain title without a name', () => {
    expect(profileGreeting('  ', at('2026-10-17T08:00'), null)).toBe('Your profile');
  });
});

const plan = (id: string, days: number) =>
  ({
    id,
    name: id,
    days: Array.from({ length: days }, () => ({ readings: [] })),
  }) as unknown as Plan;
const progress = (planId: string, done: number[], doneAt: Record<number, number>) =>
  ({ planId, startedAt: 1, done, doneAt, updatedAt: 2 }) as PlanProgressRecord;

describe('journey summary', () => {
  const now = at('2026-10-17T10:00');
  const oct = (d: number) => at(`2026-10-${String(d).padStart(2, '0')}T09:00`).getTime();

  it('counts distinct days this month and splits plans going and finished', () => {
    const s = journeyStats({
      plans: [plan('a', 2), plan('b', 3)],
      progress: [
        progress('a', [1, 2], { 1: oct(3), 2: oct(4) }),
        progress('b', [1], { 1: oct(4) }),
      ],
      entries: [{ date: '2026-10-05', createdAt: oct(5) } as JournalEntryRecord],
      marks: [
        { createdAt: oct(5) } as MarkRecord,
        { createdAt: at('2026-09-30T09:00').getTime() } as MarkRecord,
      ],
      now,
    });
    expect(s.daysThisMonth).toBe(3);
    expect(s.going.map((g) => g.plan.id)).toEqual(['b']);
    expect(s.finished.map((f) => f.plan.id)).toEqual(['a']);
    expect(s.since).toBe(1);
    expect(journeyLine(s)).toBe('1 plan going · 3 days read this month');
  });

  it('has a gentle line when there is nothing yet', () => {
    const s = journeyStats({ plans: [], progress: [], entries: [], marks: [], now });
    expect(journeyLine(s)).toBe('Your reading, reflections and marks, all in one place.');
    expect(s.since).toBeNull();
  });
});
