// Reading plans (Bible app): built-in plans generated from the canon, a sample lesson plan, and
// plans imported from .lampstand-plan.json files. Progress is one record per plan.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { PlanProgressRecord } from '@/db/types';
import { BOOKS, BOOK_BY_CODE } from '@/features/bible/books';
import {
  defaultVerseCounts,
  formatRef,
  verseCountInRange,
  type RefRange,
} from '@/features/bible/ref';
import { parsePlanFile, type Plan, type PlanDay } from '@/schema/plan';
import { localDayNumber } from './dailyVerses';
import parables from './plans/parables.lampstand-plan.json';

export type { Plan, PlanDay };

interface Generated {
  id: string;
  name: string;
  description: string;
  days: number;
  from: string;
  to: string;
  books?: string[];
  categories: string[];
  cover: string;
}

const GENERATED: Generated[] = [
  {
    id: 'bible-year',
    name: 'The Bible in a year',
    description: 'Genesis to Revelation in 365 days, about 15 minutes a day.',
    days: 365,
    from: 'GEN',
    to: 'REV',
    categories: ['through-the-bible'],
    cover: 'sunrise-hills',
  },
  {
    id: 'nt-90',
    name: 'New Testament in 90 days',
    description: 'The life of Jesus and the early church, about three chapters a day.',
    days: 90,
    from: 'MAT',
    to: 'REV',
    categories: ['through-the-bible', 'life-of-jesus'],
    cover: 'misty-valley',
  },
  {
    id: 'gospels-40',
    name: 'The Gospels in 40 days',
    description: 'Matthew, Mark, Luke and John: walk with Jesus for forty days.',
    days: 40,
    from: 'MAT',
    to: 'JHN',
    categories: ['four-gospels', 'life-of-jesus'],
    cover: 'park-path',
  },
  {
    id: 'psalms-proverbs-30',
    name: 'Psalms and Proverbs in 30 days',
    description: 'A month of prayer, praise and wisdom.',
    days: 30,
    from: 'PSA',
    to: 'PRO',
    books: ['PSA', 'PRO'],
    categories: ['psalms-of-david', 'wisdom'],
    cover: 'river-sunrise',
  },
];

interface ChapterRef {
  book: string;
  chapter: number;
}

const bookCodes = (g: Generated) => {
  if (g.books) return g.books;
  const a = BOOKS.findIndex((b) => b.code === g.from);
  const b = BOOKS.findIndex((b) => b.code === g.to);
  return BOOKS.slice(a, b + 1).map((b) => b.code);
};

/**
 * Splits chapters into days with roughly equal verse counts (so Psalm 119 isn't squeezed in
 * with five other psalms). Every day gets at least one chapter.
 */
export function splitChapters(books: readonly string[], dayCount: number): ChapterRef[][] {
  const chapters: { ref: ChapterRef; verses: number }[] = [];
  for (const book of books) {
    (defaultVerseCounts(book) ?? []).forEach((verses, i) =>
      chapters.push({ ref: { book, chapter: i + 1 }, verses }),
    );
  }
  const total = chapters.reduce((n, c) => n + c.verses, 0);
  const days: ChapterRef[][] = [];
  let i = 0;
  let done = 0;
  for (let d = 0; d < dayCount; d++) {
    const left = dayCount - d;
    const target = (total * (d + 1)) / dayCount;
    const day: ChapterRef[] = [];
    while (i < chapters.length && chapters.length - i > left - 1) {
      const c = chapters[i]!;
      if (day.length > 0 && done + c.verses - target > c.verses / 2) break;
      day.push(c.ref);
      done += c.verses;
      i++;
      if (done >= target) break;
    }
    days.push(day);
  }
  while (i < chapters.length) days[days.length - 1]!.push(chapters[i++]!.ref);
  return days;
}

/** Consecutive chapters of one book become one reading ("Genesis 1–3"). */
function chaptersToReadings(day: ChapterRef[]): RefRange[] {
  const out: RefRange[] = [];
  for (const c of day) {
    const last = out[out.length - 1];
    const lastVerse = defaultVerseCounts(c.book)?.[c.chapter - 1] ?? 1;
    if (last && last.end.book === c.book && last.end.chapter === c.chapter - 1) {
      last.end = { book: c.book, chapter: c.chapter, verse: lastVerse };
    } else {
      out.push({
        start: { book: c.book, chapter: c.chapter, verse: 1 },
        end: { book: c.book, chapter: c.chapter, verse: lastVerse },
      });
    }
  }
  return out;
}

let builtins: Plan[] | null = null;

/** The plans that ship with Lampstand. */
export function builtinPlans(): Plan[] {
  if (builtins) return builtins;
  const generated: Plan[] = GENERATED.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    pace: 'daily',
    source: 'builtin',
    categories: g.categories,
    audience: 'personal',
    cover: g.cover,
    days: splitChapters(bookCodes(g), g.days).map((d) => ({ readings: chaptersToReadings(d) })),
  }));
  const sample = parsePlanFile(parables, 'builtin');
  if (!sample.ok) throw new Error(`Bundled plan is invalid: ${sample.errors.join('; ')}`);
  builtins = [...generated, sample.plan];
  return builtins;
}

/** Built-in plans plus imported ones (imported plans with a built-in id are ignored). */
export function usePlans(): Plan[] | undefined {
  return useLiveQuery(async () => {
    const base = builtinPlans();
    const ids = new Set(base.map((p) => p.id));
    const imported = (await db.planDefs.orderBy('importedAt').toArray())
      .map((r) => parsePlanFile(r.file))
      .flatMap((r) => (r.ok && !ids.has(r.plan.id) ? [r.plan] : []));
    return [...base, ...imported];
  }, []);
}

export function usePlan(id: string): Plan | null | undefined {
  const plans = usePlans();
  return plans === undefined ? undefined : (plans.find((p) => p.id === id) ?? null);
}

export type ImportResult =
  { ok: true; plan: Plan; replaced: boolean } | { ok: false; errors: string[] };

/** Imports (or updates) a plan from a .lampstand-plan.json file's text. */
export async function importPlan(text: string): Promise<ImportResult> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["This file isn't valid JSON."] };
  }
  const r = parsePlanFile(data);
  if (!r.ok) return r;
  if (builtinPlans().some((p) => p.id === r.plan.id))
    return {
      ok: false,
      errors: [`“${r.plan.id}” is the id of a built-in plan. Choose another id.`],
    };
  const replaced = Boolean(await db.planDefs.get(r.plan.id));
  await db.planDefs.put({
    id: r.plan.id,
    file: data as never,
    importedAt: Date.now(),
  });
  return { ok: true, plan: r.plan, replaced };
}

/** Removes an imported plan and its progress. */
export async function removePlan(id: string): Promise<void> {
  await db.transaction('rw', db.planDefs, db.plans, async () => {
    await db.planDefs.delete(id);
    await db.plans.delete(id);
  });
}

// ---- Reading text helpers ----

/** "Genesis 1–3", "Psalm 23", "Luke 15:11–32". */
export function formatReading(r: RefRange): string {
  const { start, end } = r;
  const lastVerse = defaultVerseCounts(end.book)?.[end.chapter - 1];
  const whole = start.book === end.book && start.verse === 1 && end.verse === lastVerse;
  if (!whole) return formatRef(r);
  const book = BOOK_BY_CODE.get(start.book)!;
  if ((defaultVerseCounts(start.book)?.length ?? 0) === 1) return book.name;
  if (start.chapter === end.chapter) return `${book.refName} ${start.chapter}`;
  return `${book.name} ${start.chapter}–${end.chapter}`;
}

export const formatDay = (day: PlanDay) => day.readings.map(formatReading).join('; ');

/** About how long a day takes to read aloud-ish (~10 verses a minute). */
export function readingMinutes(day: PlanDay): number {
  const verses = day.readings.reduce((n, r) => n + verseCountInRange(r), 0);
  return Math.max(1, Math.round(verses / 10));
}

/** One chunk per chapter, for drawing a reading with chapter headings. */
export function chapterChunks(
  r: RefRange,
): { book: string; chapter: number; from: number; to: number }[] {
  const out: { book: string; chapter: number; from: number; to: number }[] = [];
  const startIdx = BOOKS.findIndex((b) => b.code === r.start.book);
  const endIdx = BOOKS.findIndex((b) => b.code === r.end.book);
  for (let bi = startIdx; bi <= endIdx; bi++) {
    const book = BOOKS[bi]!.code;
    const counts = defaultVerseCounts(book) ?? [];
    const c0 = bi === startIdx ? r.start.chapter : 1;
    const c1 = bi === endIdx ? r.end.chapter : counts.length;
    for (let c = c0; c <= c1; c++) {
      const from = bi === startIdx && c === r.start.chapter ? r.start.verse : 1;
      const to = bi === endIdx && c === r.end.chapter ? r.end.verse : (counts[c - 1] ?? 1);
      out.push({ book, chapter: c, from, to });
    }
  }
  return out;
}

// ---- Progress ----

export type DayStatus =
  /** This day is the one to read now. */
  | { kind: 'read'; day: number }
  /** Weekly plan: this week's lesson is done; the next one unlocks on `unlocks`. */
  | { kind: 'waiting'; day: number; next: number; unlocks: Date }
  /** Every day is done. */
  | { kind: 'finished' };

const sundayOnOrBefore = (dayNumber: number) => {
  // 1970-01-01 was a Thursday, so day 0 is 4 days after a Sunday.
  return dayNumber - ((dayNumber + 4) % 7);
};

/** What the reader should see for a plan right now. */
export function currentDay(plan: Plan, progress: PlanProgressRecord, now = new Date()): DayStatus {
  const done = new Set(progress.done);
  const total = plan.days.length;
  if (done.size >= total && plan.days.every((_, i) => done.has(i + 1))) return { kind: 'finished' };
  if (plan.pace === 'daily') {
    for (let d = 1; d <= total; d++) if (!done.has(d)) return { kind: 'read', day: d };
    return { kind: 'finished' };
  }
  if (plan.pace === 'monthly') return monthlyDay(plan, progress, now, done);
  const startWeek = sundayOnOrBefore(localDayNumber(new Date(progress.startedAt)));
  const week = Math.floor((localDayNumber(now) - startWeek) / 7);
  const lesson = Math.min(total, week + 1);
  if (!done.has(lesson)) return { kind: 'read', day: lesson };
  // This week's lesson is done: earlier missed lessons can still be read now.
  for (let d = 1; d < lesson; d++) if (!done.has(d)) return { kind: 'read', day: d };
  if (lesson >= total) return { kind: 'finished' };
  const unlocksDay = startWeek + (week + 1) * 7;
  const unlocks = new Date(unlocksDay * 86_400_000);
  return {
    kind: 'waiting',
    day: lesson,
    next: lesson + 1,
    unlocks: new Date(unlocks.getUTCFullYear(), unlocks.getUTCMonth(), unlocks.getUTCDate()),
  };
}

/** Monthly lessons: a new one each calendar month, counted from the month the plan started. */
function monthlyDay(
  plan: Plan,
  progress: PlanProgressRecord,
  now: Date,
  done: Set<number>,
): DayStatus {
  const total = plan.days.length;
  const start = new Date(progress.startedAt);
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  const lesson = Math.min(total, Math.max(1, months + 1));
  if (!done.has(lesson)) return { kind: 'read', day: lesson };
  for (let d = 1; d < lesson; d++) if (!done.has(d)) return { kind: 'read', day: d };
  if (lesson >= total) return { kind: 'finished' };
  return {
    kind: 'waiting',
    day: lesson,
    next: lesson + 1,
    unlocks: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

/** The day after `day` that can be read straight away (daily plans), or null. */
export function readableNext(plan: Plan, progress: PlanProgressRecord, day: number): number | null {
  if (plan.pace !== 'daily') return null;
  const done = new Set(progress.done);
  for (let d = day + 1; d <= plan.days.length; d++) if (!done.has(d)) return d;
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
    const doneAt = { ...p.doneAt };
    if (read) {
      done.add(day);
      doneAt[day] = Date.now();
    } else {
      done.delete(day);
      delete doneAt[day];
    }
    await db.plans.put({
      ...p,
      done: [...done].sort((a, b) => a - b),
      doneAt,
      updatedAt: Date.now(),
    });
  });
}

export function usePlanProgress(): PlanProgressRecord[] | undefined {
  return useLiveQuery(() => db.plans.toArray(), []);
}

export function usePlanProgressFor(planId: string): PlanProgressRecord | null | undefined {
  return useLiveQuery(async () => (await db.plans.get(planId)) ?? null, [planId]);
}

/** Weekly and monthly plans are lessons; daily plans are days. */
export const isLessons = (plan: Plan) => plan.pace !== 'daily';

/** "This week's lesson", "This month's lesson" or "Up next". */
export function currentLabel(plan: Plan): string {
  if (plan.pace === 'weekly') return "This week's lesson";
  if (plan.pace === 'monthly') return "This month's lesson";
  return 'Up next';
}
