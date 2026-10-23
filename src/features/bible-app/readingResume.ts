import { accountStorageKey } from '@/features/account/storage';

const PLAN_KEY = 'lampstand.recentPlanDay.v1';
const BIBLE_KEY = 'lampstand.biblePosition.v1';
const PLAN_SCROLL_KEY = 'lampstand.planScroll.v1';

export interface RecentPlanDay {
  planId: string;
  day: number;
}

export function rememberPlanDay(planId: string, day: number): void {
  if (!planId || !Number.isInteger(day) || day < 1) return;
  try {
    localStorage.setItem(accountStorageKey(PLAN_KEY), JSON.stringify({ planId, day }));
  } catch {
    // Resuming is a convenience; reading still works when storage is unavailable.
  }
}

export function recentPlanDay(): RecentPlanDay | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(accountStorageKey(PLAN_KEY)) ?? 'null',
    ) as Partial<RecentPlanDay> | null;
    return value &&
      typeof value.planId === 'string' &&
      Number.isInteger(value.day) &&
      value.day! > 0
      ? { planId: value.planId, day: value.day! }
      : null;
  } catch {
    return null;
  }
}

type BiblePositions = Record<string, number>;
const chapterKey = (book: string, chapter: number) => `${book}.${chapter}`;

function biblePositions(): BiblePositions {
  try {
    const value = JSON.parse(localStorage.getItem(accountStorageKey(BIBLE_KEY)) ?? '{}') as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as BiblePositions)
      : {};
  } catch {
    return {};
  }
}

export function biblePosition(book: string, chapter: number): number {
  const value = biblePositions()[chapterKey(book, chapter)];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export function rememberBiblePosition(book: string, chapter: number, top: number): void {
  if (!Number.isFinite(top) || top < 0) return;
  try {
    const positions = biblePositions();
    delete positions[chapterKey(book, chapter)];
    positions[chapterKey(book, chapter)] = Math.round(top);
    const entries = Object.entries(positions).slice(-80);
    localStorage.setItem(accountStorageKey(BIBLE_KEY), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Keep the reader usable if the browser refuses local storage.
  }
}

export function isPlanDayPath(path: string): boolean {
  return /^\/plans\/[^/]+\/\d+$/.test(path);
}

export function planScrollPosition(path: string): number {
  if (!isPlanDayPath(path)) return 0;
  try {
    const value = JSON.parse(localStorage.getItem(accountStorageKey(PLAN_SCROLL_KEY)) ?? '{}') as Record<
      string,
      number
    >;
    const top = value[path];
    return typeof top === 'number' && Number.isFinite(top) && top >= 0 ? top : 0;
  } catch {
    return 0;
  }
}

export function rememberPlanScroll(path: string, top: number): void {
  if (!isPlanDayPath(path) || !Number.isFinite(top) || top < 0) return;
  try {
    const stored = JSON.parse(localStorage.getItem(accountStorageKey(PLAN_SCROLL_KEY)) ?? '{}') as Record<
      string,
      number
    >;
    delete stored[path];
    stored[path] = Math.round(top);
    localStorage.setItem(
      accountStorageKey(PLAN_SCROLL_KEY),
      JSON.stringify(Object.fromEntries(Object.entries(stored).slice(-100))),
    );
  } catch {
    // A full or disabled browser store must not block reading.
  }
}

export function clearPlanResume(planId: string): void {
  try {
    if (recentPlanDay()?.planId === planId) localStorage.removeItem(accountStorageKey(PLAN_KEY));
    const stored = JSON.parse(localStorage.getItem(accountStorageKey(PLAN_SCROLL_KEY)) ?? '{}') as Record<
      string,
      number
    >;
    for (const path of Object.keys(stored)) {
      if (path.startsWith(`/plans/${planId}/`)) delete stored[path];
    }
    localStorage.setItem(accountStorageKey(PLAN_SCROLL_KEY), JSON.stringify(stored));
  } catch {
    // Resuming is optional if browser storage is unavailable.
  }
}
