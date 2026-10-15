const rtf =
  typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600_000],
  ['month', 30 * 24 * 3600_000],
  ['week', 7 * 24 * 3600_000],
  ['day', 24 * 3600_000],
  ['hour', 3600_000],
  ['minute', 60_000],
];

export function relativeTime(ts: number, now = Date.now()): string {
  const diff = ts - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      const v = Math.round(diff / ms);
      if (unit === 'minute' && v === 0) return 'just now';
      return rtf ? rtf.format(v, unit) : `${Math.abs(v)} ${unit}s ago`;
    }
  }
  return 'just now';
}

/** "Sun, Oct 18, 2026" from an ISO date (no timezone shift). */
export function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
