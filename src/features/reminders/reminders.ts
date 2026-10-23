// Daily reading reminders (docs/PRD-ADDENDUM-GROW.md, milestone 29). Everything stays on the
// device: a notification at your time while Lampstand runs (or, on Android, from the installed
// app's background check), and a daily event you can add to your phone's calendar.
import type { JournalEntryRecord, PlanProgressRecord } from '@/db/types';
import { localDate } from '@/features/bible-app/dailyVerses';

/** Whether you've already read today: a plan day finished or a reflection written. */
export function readToday(
  progress: readonly PlanProgressRecord[],
  entries: readonly JournalEntryRecord[],
  today: string,
): boolean {
  const planDone = progress.some((p) =>
    Object.values(p.doneAt ?? {}).some((t) => localDate(new Date(t)) === today),
  );
  return planDone || entries.some((e) => e.date === today);
}

/** When today's reminder is due (ms), or null if it already went out or the time has passed. */
export function nextReminderAt(
  time: string,
  now: Date,
  lastNotified: string | null,
): number | null {
  const [h, m] = time.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return null;
  if (lastNotified === localDate(now)) return null;
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  return at.getTime() >= now.getTime() ? at.getTime() : null;
}

/**
 * The reminder's words: the passage that's up next in your plan, with the day's title ("Psalm 1
 * is ready" / "Rooted like a tree · Day 1 of …"), else the verse of the day.
 */
export function reminderMessage(
  next: { plan: string; label: string; passage?: string; title?: string } | null,
  verse: string,
) {
  if (!next) return { title: 'Time for today’s reading', body: `Today’s verse: ${verse}` };
  const where = `${next.label} of ${next.plan}`;
  return next.passage
    ? { title: `${next.passage} is ready`, body: next.title ? `${next.title} · ${where}` : where }
    : { title: `${where} is ready`, body: 'A few quiet minutes in the Word.' };
}

/** "07:30" → "7:30 AM" in the person's locale. */
export function formatTime(time: string): string {
  const [h = 7, m = 0] = time.split(':').map(Number);
  const d = new Date(2026, 0, 1, h, m);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Daily calendar events with alerts, bundled into one file. */
export function remindersIcs(
  choices: readonly { time: string; kind: 'morning' | 'reading' }[],
  url: string,
  now = new Date(),
): string {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = choices.flatMap(({ time, kind }) => {
    const [h = 7, m = 0] = time.split(':').map(Number);
    return [
      'BEGIN:VEVENT',
      `UID:lampstand-${kind}-${day}@lampstand`,
      `DTSTAMP:${stamp}`,
      // Floating local time: the reminder follows you across time zones.
      `DTSTART:${day}T${pad(h)}${pad(m)}00`,
      'DURATION:PT10M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${kind === 'morning' ? 'Morning reading' : 'Evening reading'} — Lampstand`,
      `DESCRIPTION:A few quiet minutes in the Word. Open Lampstand: ${url}`,
      `URL:${url}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Time for today’s reading',
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    ];
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lampstand//Reading reminder//EN',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/** One daily calendar event, kept for existing callers. */
export function reminderIcs(
  time: string,
  url: string,
  now = new Date(),
  kind: 'morning' | 'reading' = 'reading',
): string {
  return remindersIcs([{ time, kind }], url, now);
}
