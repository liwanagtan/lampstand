// Profile and Journey (docs/PRD-ADDENDUM-GROW.md, milestone 20): the greeting and the summary.
import type { JournalEntryRecord, MarkRecord, PlanProgressRecord } from '@/db/types';
import type { Plan } from '@/schema/plan';

const VISIT_KEY = 'lampstand.lastVisit';
const DAY = 24 * 60 * 60 * 1000;
/** Away this long and Profile says "Welcome back". */
export const AWAY_DAYS = 3;

let previous: number | null | undefined;

/** Remembers this visit; the one before it stays readable for the rest of the session. */
export function noteVisit(now = Date.now()): void {
  if (previous !== undefined) return;
  try {
    const raw = localStorage.getItem(VISIT_KEY);
    previous = raw ? Number(raw) || null : null;
    localStorage.setItem(VISIT_KEY, String(now));
  } catch {
    previous = null;
  }
}

/** When you were last here before this session, if known. */
export function previousVisit(): number | null {
  noteVisit();
  return previous ?? null;
}

/** "Welcome back, Ana" after a few days away; otherwise a greeting for the time of day. */
export function profileGreeting(name: string, now: Date, lastVisit: number | null): string {
  const n = name.trim();
  if (!n) return 'Your profile';
  if (lastVisit && now.getTime() - lastVisit >= AWAY_DAYS * DAY) return `Welcome back, ${n}`;
  const h = now.getHours();
  if (h >= 5 && h < 12) return `Good morning, ${n}`;
  if (h >= 12 && h < 17) return `Good afternoon, ${n}`;
  if (h >= 17 && h < 22) return `Good evening, ${n}`;
  return `Still up, ${n}?`;
}

export interface JourneyStats {
  /** Days this month with any reading, writing or marking. */
  daysThisMonth: number;
  going: { plan: Plan; progress: PlanProgressRecord }[];
  finished: { plan: Plan; progress: PlanProgressRecord; finishedAt: number }[];
  /** Your first activity, for "Reading since". */
  since: number | null;
}

const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function journeyStats(input: {
  plans: readonly Plan[];
  progress: readonly PlanProgressRecord[];
  entries: readonly JournalEntryRecord[];
  marks: readonly MarkRecord[];
  now: Date;
}): JourneyStats {
  const { plans, progress, entries, marks, now } = input;
  const month = dayKey(now.getTime()).slice(0, 7);
  const days = new Set<string>();
  const times: number[] = [];
  const byId = new Map(plans.map((p) => [p.id, p]));
  const going: JourneyStats['going'] = [];
  const finished: JourneyStats['finished'] = [];

  for (const pr of progress) {
    times.push(pr.startedAt);
    for (const t of Object.values(pr.doneAt ?? {})) days.add(dayKey(t));
    const plan = byId.get(pr.planId);
    if (!plan) continue;
    if (plan.days.every((_, i) => pr.done.includes(i + 1))) {
      const at = Math.max(pr.updatedAt, ...Object.values(pr.doneAt ?? {}));
      finished.push({ plan, progress: pr, finishedAt: at });
    } else going.push({ plan, progress: pr });
  }
  for (const e of entries) {
    days.add(e.date);
    times.push(e.createdAt);
  }
  for (const m of marks) {
    days.add(dayKey(m.createdAt));
    times.push(m.createdAt);
  }
  going.sort((a, b) => b.progress.updatedAt - a.progress.updatedAt);
  finished.sort((a, b) => b.finishedAt - a.finishedAt);
  return {
    daysThisMonth: [...days].filter((d) => d.startsWith(month)).length,
    going,
    finished,
    since: times.length ? Math.min(...times) : null,
  };
}

/** "2 plans going · 5 days read this month", or a gentle line when there's nothing yet. */
export function journeyLine(s: JourneyStats): string {
  const parts: string[] = [];
  if (s.going.length) parts.push(`${s.going.length} plan${s.going.length === 1 ? '' : 's'} going`);
  if (s.daysThisMonth)
    parts.push(`${s.daysThisMonth} day${s.daysThisMonth === 1 ? '' : 's'} read this month`);
  return parts.length
    ? parts.join(' · ')
    : 'Your reading, reflections and marks, all in one place.';
}
