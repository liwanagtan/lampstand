import { useEffect } from 'react';
import { formatRef } from '@/features/bible/ref';
import { localDate, verseOfTheDay } from '@/features/bible-app/dailyVerses';
import { useEntries } from '@/features/bible-app/journal';
import {
  currentDay,
  formatDay,
  isLessons,
  usePlanProgress,
  usePlans,
} from '@/features/bible-app/plans';
import { useSettings } from '@/features/settings/settingsStore';
import { setBackgroundCheck, showReminder } from './notify';
import { nextReminderAt, readToday, reminderMessage } from './reminders';

/** While Lampstand runs, the day's reminder goes out at your time — unless you've already read. */
export function useReminders(): void {
  const reminders = useSettings((s) => s.reminders);
  const plans = usePlans();
  const progress = usePlanProgress();
  const entries = useEntries();

  useEffect(() => {
    void setBackgroundCheck(reminders.enabled || Boolean(reminders.reading?.enabled));
  }, [reminders.enabled, reminders.reading?.enabled]);

  useEffect(() => {
    if (!plans || !progress || !entries) return;
    const schedule = (kind: 'morning' | 'reading') => {
      const choice = kind === 'morning' ? reminders : reminders.reading;
      if (!choice?.enabled) return null;
      const due = nextReminderAt(choice.time, new Date(), choice.lastNotified);
      if (due === null) return null;
      return window.setTimeout(() => {
        const now = new Date();
        const today = localDate(now);
        const { set, reminders: r } = useSettings.getState();
        if (kind === 'morning') void set('reminders', { ...r, lastNotified: today });
        else void set('reminders', { ...r, reading: { ...r.reading!, lastNotified: today } });
        if (readToday(progress, entries, today)) return;
        // Name the reading that's up next in the plan you touched most recently.
        let next: Parameters<typeof reminderMessage>[0] = null;
        for (const pr of [...progress].sort((a, b) => b.updatedAt - a.updatedAt)) {
          const plan = plans.find((p) => p.id === pr.planId);
          const status = plan && currentDay(plan, pr, now);
          if (plan && status?.kind === 'read') {
            const day = plan.days[status.day - 1];
            next = {
              plan: plan.name,
              label: `${isLessons(plan) ? 'Lesson' : 'Day'} ${status.day}`,
              passage: day && formatDay(day),
              title: day?.title,
            };
            break;
          }
        }
        const msg = reminderMessage(next, formatRef(verseOfTheDay(now).range));
        void showReminder(msg.title, msg.body, `lampstand-${kind}-reminder`);
      }, due - Date.now());
    };
    const ids = [schedule('morning'), schedule('reading')];
    return () =>
      ids.forEach((id) => {
        if (id !== null) window.clearTimeout(id);
      });
  }, [reminders, plans, progress, entries]);
}
