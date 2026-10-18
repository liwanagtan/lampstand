import { useState } from 'react';
import { BellRing, CalendarPlus } from 'lucide-react';
import { Button, Input, Toggle, toast } from '@/design-system/components';
import { Section } from '@/features/settings/Section';
import { useSettings } from '@/features/settings/settingsStore';
import { askPermission, notificationsSupported, showReminder } from './notify';
import { formatTime, reminderIcs } from './reminders';
import styles from './RemindersSection.module.css';

/** Settings › Reminders: a daily nudge to read, as a notification and in your calendar. */
export function RemindersSection() {
  const reminders = useSettings((s) => s.reminders);
  const set = useSettings((s) => s.set);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  );

  const turn = async (on: boolean) => {
    if (on) {
      const p = await askPermission();
      setPermission(p);
      if (p === 'granted')
        void showReminder('Reminders are on', `See you at ${formatTime(reminders.time)}.`);
    }
    await set('reminders', { ...reminders, enabled: on, lastNotified: null });
  };

  const addToCalendar = () => {
    const blob = new Blob([reminderIcs(reminders.time, location.origin + '/')], {
      type: 'text/calendar',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lampstand-reading-reminder.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast({ title: 'Open the file to add a daily reminder to your calendar', tone: 'success' });
  };

  return (
    <Section
      title="Reminders"
      description="A daily nudge at your reading time. On days you've already read, it stays quiet."
    >
      <Toggle
        checked={reminders.enabled}
        onChange={(on) => void turn(on)}
        label="Remind me to read"
        description={`Every day at ${formatTime(reminders.time)}.`}
      />
      <Input
        label="Reading time"
        type="time"
        value={reminders.time}
        onChange={(e) =>
          e.target.value &&
          void set('reminders', { ...reminders, time: e.target.value, lastNotified: null })
        }
        className={styles.time}
      />
      {reminders.enabled && permission === 'denied' && (
        <p className={styles.warn} role="status">
          Notifications are blocked for Lampstand. Allow them in your browser or phone settings, or
          add the reminder to your calendar below.
        </p>
      )}
      {permission === 'unsupported' && (
        <p className={styles.warn} role="status">
          This browser can't show notifications. Add the reminder to your calendar instead.
        </p>
      )}
      <div className={styles.calendar}>
        <Button icon={<CalendarPlus size={16} />} onClick={addToCalendar}>
          Add to my calendar
        </Button>
        <p className={styles.note}>
          <BellRing size={14} aria-hidden />
          Notifications come while Lampstand is open or in the background, and from the installed
          app on Android. A calendar reminder works on every phone, even with Lampstand closed.
        </p>
      </div>
    </Section>
  );
}
