// Which verse, and whether it is morning yet, in someone's own time zone (no Worker APIs here).
import days from './daily-verses.json';

/** The date and clock time in a time zone, e.g. { date: '2026-10-24', time: '08:00', day }. */
export function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  // Whole local days since 1970, as the app counts them, so both pick the same verse.
  const day = Math.floor(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86_400_000,
  );
  return { date, time: `${parts.hour}:${parts.minute}`, day };
}

/** Today's verse for a local day number: the same list and order as the app's Today. */
export function verseForDay(day: number) {
  return days[day % days.length]!;
}

export function isValidZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
