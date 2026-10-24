import { useState } from 'react';
import { BellRing, CalendarPlus } from 'lucide-react';
import { Input, Toggle, toast } from '@/design-system/components';
import { Section } from '@/features/settings/Section';
import { useSettings } from '@/features/settings/settingsStore';
import { askPermission, notificationsSupported, showReminder } from './notify';
import { formatTime, remindersIcs } from './reminders';
import {
  DAILY_VERSE_TIME,
  needsHomeScreen,
  turnOffDailyVerse,
  turnOnDailyVerse,
  type PushOutcome,
} from './dailyVersePush';
import styles from './RemindersSection.module.css';

const DAILY_VERSE_PROBLEM: Record<Exclude<PushOutcome, 'on' | 'off'>, string> = {
  blocked: 'Notifications are blocked for Lampstand. Allow them in your phone or browser settings.',
  unsupported: "This browser can't receive notifications while Lampstand is closed.",
  'install-first': 'Add Lampstand to your Home Screen first, then turn this on from there.',
  unavailable: 'The verse of the day isn’t available here yet. Please try again later.',
  failed: 'Couldn’t turn that on. Check your connection and try again.',
};

/** Settings › Reminders: a daily nudge to read, as a notification and in your calendar. */
export function RemindersSection() {
  const reminders = useSettings((s) => s.reminders);
  const set = useSettings((s) => s.set);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  );
  const reading = reminders.reading ?? { enabled: false, time: '19:00', lastNotified: null };

  const turn = async (kind: 'morning' | 'reading', on: boolean) => {
    if (on) {
      const p = await askPermission();
      setPermission(p);
      if (p === 'granted')
        void showReminder(
          'Reminders are on',
          `See you at ${formatTime(kind === 'morning' ? reminders.time : reading.time)}.`,
        );
    }
    await set(
      'reminders',
      kind === 'morning'
        ? { ...reminders, enabled: on, lastNotified: null }
        : { ...reminders, reading: { ...reading, enabled: on, lastNotified: null } },
    );
  };

  const calendarChoices = [
    ...(reminders.enabled ? [{ kind: 'morning' as const, time: reminders.time }] : []),
    ...(reading.enabled ? [{ kind: 'reading' as const, time: reading.time }] : []),
  ];

  const addToCalendar = () => {
    const blob = new Blob([remindersIcs(calendarChoices, location.origin + '/')], {
      type: 'text/calendar',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lampstand-reminders.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast({ title: 'Open the file to add a daily reminder to your calendar', tone: 'success' });
  };

  const daily = reminders.dailyVerse ?? { enabled: false, time: DAILY_VERSE_TIME };
  const [dailyBusy, setDailyBusy] = useState(false);
  const setDaily = async (enabled: boolean, time = daily.time) => {
    setDailyBusy(true);
    const outcome = enabled ? await turnOnDailyVerse(time) : await turnOffDailyVerse();
    setDailyBusy(false);
    if (outcome === 'on' || outcome === 'off') {
      const r = useSettings.getState().reminders;
      await set('reminders', { ...r, dailyVerse: { enabled: outcome === 'on', time } });
      if (outcome === 'on')
        toast({
          title: `Today’s verse will come each morning at ${formatTime(time)}`,
          tone: 'success',
        });
      return;
    }
    if (outcome === 'blocked') setPermission('denied');
    toast({ title: DAILY_VERSE_PROBLEM[outcome], tone: 'warning' });
  };

  return (
    <Section
      title="Reminders"
      description="Choose when Lampstand reminds you to read. On days you've already read, reminders stay quiet."
    >
      <div className={styles.reminderGroup}>
        <Toggle
          checked={daily.enabled}
          disabled={dailyBusy}
          onChange={(on) => void setDaily(on)}
          label="Verse of the day"
          description={`Today’s verse as a notification at ${formatTime(daily.time)}, even when Lampstand is closed.`}
        />
        <div className={styles.controls}>
          <Input
            label="Verse time"
            type="time"
            value={daily.time}
            disabled={dailyBusy}
            onChange={(e) => {
              const time = e.target.value;
              if (!time) return;
              if (daily.enabled) void setDaily(true, time);
              else void set('reminders', { ...reminders, dailyVerse: { ...daily, time } });
            }}
            className={styles.time}
          />
        </div>
        {needsHomeScreen() && (
          <p className={styles.note}>
            On iPhone, add Lampstand to your Home Screen first (Share, then Add to Home Screen),
            then turn this on from there.
          </p>
        )}
      </div>
      <div className={styles.reminderGroup}>
        <Toggle
          checked={reminders.enabled}
          onChange={(on) => void turn('morning', on)}
          label="Morning reminder"
          description={`Daily at ${formatTime(reminders.time)}`}
        />
        <div className={styles.controls}>
          <Input
            label="Morning time"
            type="time"
            value={reminders.time}
            onChange={(e) =>
              e.target.value &&
              void set('reminders', { ...reminders, time: e.target.value, lastNotified: null })
            }
            className={styles.time}
          />
        </div>
      </div>
      <div className={styles.reminderGroup}>
        <Toggle
          checked={reading.enabled}
          onChange={(on) => void turn('reading', on)}
          label="Evening reminder"
          description={`Daily at ${formatTime(reading.time)}`}
        />
        <div className={styles.controls}>
          <Input
            label="Evening time"
            type="time"
            value={reading.time}
            onChange={(e) =>
              e.target.value &&
              void set('reminders', {
                ...reminders,
                reading: { ...reading, time: e.target.value, lastNotified: null },
              })
            }
            className={styles.time}
          />
        </div>
      </div>
      {(reminders.enabled || reading.enabled) && permission === 'denied' && (
        <p className={styles.warn} role="status">
          Notifications are blocked for Lampstand. Allow them in your browser or phone settings, or
          add a reminder to your calendar.
        </p>
      )}
      {permission === 'unsupported' && (
        <p className={styles.warn} role="status">
          This browser can't show notifications. Add the reminder to your calendar instead.
        </p>
      )}
      <div className={styles.calendar}>
        <button
          type="button"
          className={styles.calendarLink}
          onClick={addToCalendar}
          disabled={calendarChoices.length === 0}
        >
          <CalendarPlus size={16} aria-hidden /> Add{' '}
          {calendarChoices.length === 2 ? 'both reminders' : 'reminder'} to calendar
        </button>
        {calendarChoices.length === 0 && (
          <p className={styles.note}>Turn on a reminder to add it to your calendar.</p>
        )}
        <p className={styles.note}>
          <BellRing size={14} aria-hidden />
          Calendar alerts work when Lampstand is closed. Browser notifications depend on your
          device.
        </p>
      </div>
    </Section>
  );
}
