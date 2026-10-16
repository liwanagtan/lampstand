// Reading plans (Bible app): generated from the Bible's structure, balanced by verse count.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { PlanProgressRecord } from '@/db/types';
import { BOOKS, BOOK_BY_CODE } from '@/features/bible/books';
import { defaultVerseCounts } from '@/features/bible/ref';
import { localDayNumber } from './dailyVerses';

export interface ChapterRef {
  book: string;
  chapter: number;
}

export interface PlanDef {
  id: string;
  name: string;
  description: string;
  days: number;
  books: readonly string[];
}

const codes = (from: string, to: string) => {
  const a = BOOKS.findIndex((b) => b.code === from);
  const b = BOOKS.findIndex((b) => b.code === to);
  return BOOKS.slice(a, b + 1).map((b) => b.code);
};

export const PLANS: readonly PlanDef[] = [
  {
    id: 'bible-year',
    name: 'The Bible in a year',
    description: 'Genesis to Revelation in 365 days, about 15 minutes a day.',
    days: 365,
    books: codes('GEN', 'REV'),
  },
  {
    id: 'nt-90',
    name: 'New Testament in 90 days',
    description: 'The life of Jesus and the early church, about three chapters a day.',
    days: 90,
    books: codes('MAT', 'REV'),
  },
  {
    id: 'gospels-40',
    name: 'The Gospels in 40 days',
    description: 'Matthew, Mark, Luke and John: walk with Jesus for forty days.',
    days: 40,
    books: codes('MAT', 'JHN'),
  },
  {
    id: 'psalms-proverbs-30',
    name: 'Psalms and Proverbs in 30 days',
    description: 'A month of prayer, praise and wisdom.',
    days: 30,
    books: ['PSA', 'PRO'],
  },
];

export const PLAN_BY_ID = new Map(PLANS.map((p) => [p.id, p]));

const scheduleCache = new Map<string, ChapterRef[][]>();

/**
 * Splits a plan's chapters into days with roughly equal verse counts (so Psalm 119 isn't
 * squeezed in with five other psalms). Every day gets at least one chapter.
 */
export function planSchedule(plan: PlanDef): ChapterRef[][] {
  const cached = scheduleCache.get(plan.id);
  if (cached) return cached;
  const chapters: { ref: ChapterRef; verses: number }[] = [];
  for (const book of plan.books) {
    (defaultVerseCounts(book) ?? []).forEach((verses, i) =>
      chapters.push({ ref: { book, chapter: i + 1 }, verses }),
    );
  }
  const total = chapters.reduce((n, c) => n + c.verses, 0);
  const days: ChapterRef[][] = [];
  let i = 0;
  let done = 0;
  for (let d = 0; d < plan.days; d++) {
    const left = plan.days - d;
    const target = (total * (d + 1)) / plan.days;
    const day: ChapterRef[] = [];
    // Take chapters until this day reaches its share, leaving one chapter per remaining day.
    while (i < chapters.length && chapters.length - i > left - 1) {
      const c = chapters[i]!;
      const over = done + c.verses - target;
      if (day.length > 0 && over > c.verses / 2) break;
      day.push(c.ref);
      done += c.verses;
      i++;
      if (done >= target) break;
    }
    days.push(day);
  }
  // Anything left over (rounding) joins the last day.
  while (i < chapters.length) days[days.length - 1]!.push(chapters[i++]!.ref);
  scheduleCache.set(plan.id, days);
  return days;
}

/** "Genesis 1–3", "Psalm 119", "Malachi 4; Matthew 1". */
export function formatReading(day: readonly ChapterRef[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < day.length) {
    const start = day[i]!;
    let end = start;
    while (
      i + 1 < day.length &&
      day[i + 1]!.book === start.book &&
      day[i + 1]!.chapter === end.chapter + 1
    )
      end = day[++i]!;
    const book = BOOK_BY_CODE.get(start.book)!;
    const single = (defaultVerseCounts(start.book)?.length ?? 0) === 1;
    const name = start.chapter === end.chapter ? book.refName : book.name;
    parts.push(
      single
        ? book.name
        : start.chapter === end.chapter
          ? `${name} ${start.chapter}`
          : `${name} ${start.chapter}–${end.chapter}`,
    );
    i++;
  }
  return parts.join('; ');
}

/** Which plan day is "today" (1-based), counting the start day as day 1. */
export function planDay(progress: PlanProgressRecord, plan: PlanDef, now = new Date()): number {
  const started = localDayNumber(new Date(progress.startedAt));
  return Math.min(plan.days, Math.max(1, localDayNumber(now) - started + 1));
}

/** The first day not yet read, or null when the plan is finished. */
export function nextUnread(progress: PlanProgressRecord, plan: PlanDef): number | null {
  const done = new Set(progress.done);
  for (let d = 1; d <= plan.days; d++) if (!done.has(d)) return d;
  return null;
}

export async function startPlan(planId: string): Promise<void> {
  const now = Date.now();
  await db.plans.put({ planId, startedAt: now, done: [], updatedAt: now });
}

export async function stopPlan(planId: string): Promise<void> {
  await db.plans.delete(planId);
}

export async function setDayRead(planId: string, day: number, read: boolean): Promise<void> {
  await db.transaction('rw', db.plans, async () => {
    const p = await db.plans.get(planId);
    if (!p) return;
    const done = new Set(p.done);
    if (read) done.add(day);
    else done.delete(day);
    await db.plans.put({ ...p, done: [...done].sort((a, b) => a - b), updatedAt: Date.now() });
  });
}

export function usePlanProgress(): PlanProgressRecord[] | undefined {
  return useLiveQuery(() => db.plans.toArray(), []);
}
