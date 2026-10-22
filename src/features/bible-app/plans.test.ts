import { db } from '@/db/db';
import { defaultVerseCounts, parseRef } from '@/features/bible/ref';
import { parsePlanFile } from '@/schema/plan';
import {
  activePlanCount,
  builtinPlans,
  chapterChunks,
  currentDay,
  formatDay,
  formatReading,
  importPlan,
  readingMinutes,
  removePlan,
  nextReadingDate,
  setDayRead,
  setPlanPaused,
  setPlanRhythm,
  startPlan,
} from './plans';

const plan = (id: string) => builtinPlans().find((p) => p.id === id)!;
const progress = (startedAt: Date, done: number[] = []) => ({
  planId: 'x',
  startedAt: startedAt.getTime(),
  done,
  updatedAt: 0,
});

describe('built-in reading plans', () => {
  it('counts only plans still in progress for pacing advice', () => {
    const plans = [plan('gospels-40'), plan('nt-90'), plan('psalms-proverbs-30')];
    const records = plans.map((item) => ({ ...progress(new Date()), planId: item.id }));
    records[2]!.done = plans[2]!.days.map((_, index) => index + 1);
    expect(activePlanCount(plans, records)).toBe(2);
    expect(activePlanCount(plans, records, 'gospels-40')).toBe(1);
  });

  it.each(['bible-year', 'nt-90', 'gospels-40', 'psalms-proverbs-30'])(
    '%s covers every chapter once, in order',
    (id) => {
      const p = plan(id);
      const chapters = p.days.flatMap((d) =>
        d.readings.flatMap((r) => chapterChunks(r).map((c) => `${c.book}.${c.chapter}`)),
      );
      expect(new Set(chapters).size).toBe(chapters.length);
      const first = chapters[0]!.split('.')[0]!;
      const last = chapters[chapters.length - 1]!.split('.')[0]!;
      expect(chapters).toContain(`${first}.1`);
      expect(chapters).toContain(`${last}.${defaultVerseCounts(last)!.length}`);
      expect(p.days.every((d) => d.readings.length > 0)).toBe(true);
    },
  );

  it('ships a valid weekly lesson plan', () => {
    const p = plan('parables-8-weeks');
    expect(p.pace).toBe('weekly');
    expect(p.days).toHaveLength(8);
    expect(p.days.every((d) => d.title && d.note && d.questions?.length)).toBe(true);
  });

  it('formats readings', () => {
    expect(formatDay(plan('bible-year').days[0]!)).toBe('Genesis 1–3');
    expect(formatReading(parseRef('Psalm 119')!)).toBe('Psalm 119');
    expect(formatReading(parseRef('Luke 15:11-32')!)).toBe('Luke 15:11–32');
    expect(formatReading(parseRef('Jude 1-25')!)).toBe('Jude');
    expect(formatReading(parseRef('Genesis 1-3')!)).toBe('Genesis 1–3');
    expect(readingMinutes(plan('bible-year').days[0]!)).toBeGreaterThan(5);
  });
});

describe('plan files', () => {
  const file = {
    format: 'lampstand-plan',
    version: 1,
    id: 'test-plan',
    name: 'Test',
    description: 'A test plan.',
    pace: 'daily',
    days: [{ readings: ['John 1:1-18'] }],
  };

  it('rejects bad references with a readable message', () => {
    const r = parsePlanFile({ ...file, days: [{ readings: ['Hezekiah 4:1'] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/days › 0 › readings › 0/);
  });

  it('imports, updates and removes a plan', async () => {
    await db.planDefs.clear();
    expect(await importPlan(JSON.stringify(file))).toMatchObject({ ok: true, replaced: false });
    expect(await importPlan(JSON.stringify({ ...file, name: 'Test 2' }))).toMatchObject({
      ok: true,
      replaced: true,
    });
    expect(await importPlan('{nope')).toMatchObject({ ok: false });
    expect(await importPlan(JSON.stringify({ ...file, id: 'bible-year' }))).toMatchObject({
      ok: false,
    });
    await startPlan('test-plan');
    await removePlan('test-plan');
    expect(await db.planDefs.count()).toBe(0);
    expect(await db.plans.get('test-plan')).toBeUndefined();
  });
});

describe('which day to read', () => {
  it('daily plans go to the first unread day', () => {
    const p = plan('gospels-40');
    expect(currentDay(p, progress(new Date(2026, 0, 1), [1, 2]))).toEqual({ kind: 'read', day: 3 });
    const all = p.days.map((_, i) => i + 1);
    expect(currentDay(p, progress(new Date(2026, 0, 1), all))).toEqual({ kind: 'finished' });
  });

  it('weekly plans unlock a lesson each Sunday', () => {
    const p = plan('parables-8-weeks');
    // Started on Wednesday 14 Oct 2026; that week's Sunday was 11 Oct.
    const start = new Date(2026, 9, 14, 10);
    expect(currentDay(p, progress(start), new Date(2026, 9, 16))).toEqual({ kind: 'read', day: 1 });
    const waiting = currentDay(p, progress(start, [1]), new Date(2026, 9, 16));
    expect(waiting).toMatchObject({ kind: 'waiting', day: 1, next: 2 });
    if (waiting.kind === 'waiting') {
      expect(waiting.unlocks.getDay()).toBe(0);
      expect(waiting.unlocks.getDate()).toBe(18);
    }
    // Next Sunday, lesson 2 is up; an older unread lesson still comes first.
    expect(currentDay(p, progress(start, [1]), new Date(2026, 9, 18))).toEqual({
      kind: 'read',
      day: 2,
    });
    expect(currentDay(p, progress(start, [2]), new Date(2026, 9, 20))).toEqual({
      kind: 'read',
      day: 1,
    });
    expect(currentDay(p, progress(start), new Date(2026, 9, 26))).toEqual({ kind: 'read', day: 1 });
  });

  it('marks days read', async () => {
    await db.plans.clear();
    await startPlan('gospels-40');
    await setDayRead('gospels-40', 1, true);
    await setDayRead('gospels-40', 2, true);
    await setDayRead('gospels-40', 2, false);
    expect((await db.plans.get('gospels-40'))!.done).toEqual([1]);
  });

  it('pauses without losing completed days, then resumes at the next unread day', async () => {
    await db.plans.clear();
    await startPlan('gospels-40');
    await setDayRead('gospels-40', 1, true);
    await setPlanPaused('gospels-40', true);
    const paused = (await db.plans.get('gospels-40'))!;
    expect(currentDay(plan('gospels-40'), paused).kind).toBe('paused');
    expect(activePlanCount([plan('gospels-40')], [paused])).toBe(0);
    await setPlanPaused('gospels-40', false);
    const resumed = (await db.plans.get('gospels-40'))!;
    expect(resumed.done).toEqual([1]);
    expect(resumed.doneAt?.[1]).toBe(paused.doneAt?.[1]);
    expect(currentDay(plan('gospels-40'), resumed)).toEqual({ kind: 'read', day: 2 });
  });

  it('changes an authored weekly plan to a personal rhythm without resetting progress', async () => {
    await db.plans.clear();
    await startPlan('parables-8-weeks');
    await setDayRead('parables-8-weeks', 1, true);
    await setPlanRhythm('parables-8-weeks', 'every-few-days');
    const changed = (await db.plans.get('parables-8-weeks'))!;
    expect(changed.done).toEqual([1]);
    expect(changed.rhythm).toBe('every-few-days');
    expect(currentDay(plan('parables-8-weeks'), changed)).toEqual({ kind: 'read', day: 2 });
    await setPlanRhythm('parables-8-weeks', null);
    const original = (await db.plans.get('parables-8-weeks'))!;
    expect(original.rhythm).toBeUndefined();
    expect(original.done).toEqual([1]);
    expect(currentDay(plan('parables-8-weeks'), original).kind).toBe('waiting');
  });

  it('suggests dates by local calendar day without creating an overdue backlog', () => {
    const p = { ...progress(new Date(2026, 9, 22)), doneAt: { 1: new Date(2026, 9, 22, 22).getTime() } };
    expect(nextReadingDate(p, 'every-few-days', new Date(2026, 9, 23))?.getDate()).toBe(25);
    expect(nextReadingDate(p, 'every-few-days', new Date(2026, 9, 30))?.getDate()).toBe(30);
    const changedToday = { ...p, rhythmChangedAt: new Date(2026, 9, 23, 9).getTime() };
    expect(nextReadingDate(changedToday, 'every-few-days', new Date(2026, 9, 23, 10))?.getDate()).toBe(23);
    const monthEnd = { ...p, doneAt: { 1: new Date(2026, 9, 31, 23).getTime() } };
    expect(nextReadingDate(monthEnd, 'every-few-days', new Date(2026, 10, 1))?.getMonth()).toBe(10);
    expect(nextReadingDate(monthEnd, 'every-few-days', new Date(2026, 10, 1))?.getDate()).toBe(3);
  });
});

describe('monthly lessons', () => {
  it('unlock one each calendar month', async () => {
    const { parsePlanFile } = await import('@/schema/plan');
    const r = parsePlanFile({
      format: 'lampstand-plan',
      version: 2,
      id: 'monthly-test',
      name: 'Monthly',
      description: 'Three months.',
      pace: 'monthly',
      days: [{ readings: ['John 1'] }, { readings: ['John 2'] }, { readings: ['John 3'] }],
    });
    if (!r.ok) throw new Error(r.errors.join());
    const start = new Date(2026, 9, 20);
    expect(currentDay(r.plan, progress(start), new Date(2026, 9, 28))).toEqual({
      kind: 'read',
      day: 1,
    });
    const waiting = currentDay(r.plan, progress(start, [1]), new Date(2026, 9, 28));
    expect(waiting).toMatchObject({ kind: 'waiting', next: 2 });
    if (waiting.kind === 'waiting') expect(waiting.unlocks.getMonth()).toBe(10);
    expect(currentDay(r.plan, progress(start, [1]), new Date(2026, 10, 2))).toEqual({
      kind: 'read',
      day: 2,
    });
    expect(currentDay(r.plan, progress(start), new Date(2026, 11, 2))).toEqual({
      kind: 'read',
      day: 1,
    });
  });
});
