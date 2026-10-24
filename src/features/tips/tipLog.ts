// What someone has done, for Ember's tips: a tip comes just after the thing it builds on, and a
// feature someone already uses never gets its tip. Recent times per event, on this device only.
const KEY = 'lampstand.tipLog';
const KEEP = 30;
const DAY = 86_400_000;

export type TipLog = Record<string, number[]>;

export function readTipLog(): TipLog {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TipLog) : {};
  } catch {
    return {};
  }
}

export function recordTipEvent(event: string, now = Date.now()): TipLog {
  const log = readTipLog();
  log[event] = [...(log[event] ?? []), now].slice(-KEEP);
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // Nothing to remember it in; tips simply come later, or not at all.
  }
  return log;
}

/** How many times `event` happened, in the last `days` days if given. */
export function countOf(log: TipLog, event: string, now: number, days?: number): number {
  const times = log[event] ?? [];
  return days === undefined ? times.length : times.filter((t) => now - t < days * DAY).length;
}
