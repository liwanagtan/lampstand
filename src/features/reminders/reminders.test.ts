import type { JournalEntryRecord, PlanProgressRecord } from '@/db/types';
import { nextReminderAt, readToday, reminderIcs, reminderMessage, remindersIcs } from './reminders';

const at = (s: string) => new Date(s);

describe('reading reminders', () => {
  it('knows when you have read today', () => {
    const today = '2026-10-18';
    const p = (t: number) =>
      ({
        planId: 'a',
        startedAt: 0,
        done: [1],
        doneAt: { 1: t },
        updatedAt: 0,
      }) as PlanProgressRecord;
    expect(readToday([p(at('2026-10-18T06:00').getTime())], [], today)).toBe(true);
    expect(readToday([p(at('2026-10-17T06:00').getTime())], [], today)).toBe(false);
    expect(readToday([], [{ date: today } as JournalEntryRecord], today)).toBe(true);
  });

  it('fires once a day, only at or after the chosen time', () => {
    const now = at('2026-10-18T06:30');
    expect(nextReminderAt('07:00', now, null)).toBe(at('2026-10-18T07:00').getTime());
    expect(nextReminderAt('06:00', now, null)).toBeNull();
    expect(nextReminderAt('07:00', now, '2026-10-18')).toBeNull();
    expect(nextReminderAt('bad', now, null)).toBeNull();
  });

  it('names your next plan reading, or the verse of the day', () => {
    expect(reminderMessage({ plan: 'Hope for hard days', label: 'Day 3' }, 'John 1:5').title).toBe(
      'Day 3 of Hope for hard days is ready',
    );
    expect(reminderMessage(null, 'John 1:5').body).toContain('John 1:5');
  });

  it('writes a daily calendar event with an alert', () => {
    const ics = reminderIcs('07:30', 'https://lampstand.app/', at('2026-10-18T09:00'));
    expect(ics).toContain('DTSTART:20261018T073000');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
    const morning = reminderIcs(
      '07:30',
      'https://lampstand.app/',
      at('2026-10-18T09:00'),
      'morning',
    );
    expect(morning).toContain('UID:lampstand-morning-20261018@lampstand');
    expect(ics).toContain('UID:lampstand-reading-20261018@lampstand');
  });

  it('puts both selected reminders in one calendar file', () => {
    const ics = remindersIcs(
      [
        { kind: 'morning', time: '07:00' },
        { kind: 'reading', time: '19:00' },
      ],
      'https://lampstand.app/',
      at('2026-10-18T09:00'),
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20261018T070000');
    expect(ics).toContain('DTSTART:20261018T190000');
    expect(ics).toContain('SUMMARY:Evening reading — Lampstand');
  });
});
