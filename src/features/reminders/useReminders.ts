import { useEffect } from 'react';
import { formatRef } from '@/features/bible/ref';
import { localDate, verseOfTheDay } from '@/features/bible-app/dailyVerses';
import { useEntries } from '@/features/bible-app/journal';
import { currentDay, isLessons, usePlanProgress, usePlans } from '@/features/bible-app/plans';
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
    void setBackgroundCheck(reminders.enabled);
  }, [reminders.enabled]);

  useEffect(() => {
    if (!reminders.enabled || !plans || !progress || !entries) return;
    const due = nextReminderAt(reminders.time, new Date(), reminders.lastNotified);
    if (due === null) return;
    const id = window.setTimeout(() => {
      const now = new Date();
      const today = localDate(now);
      const { set, reminders: r } = useSettings.getState();
      void set('reminders', { ...r, lastNotified: today });
      if (readToday(progress, entries, today)) return;
      // Name the reading that's up next in the plan you touched most recently.
      let next: { plan: string; label: string } | null = null;
      for (const pr of [...progress].sort((a, b) => b.updatedAt - a.updatedAt)) {
        const plan = plans.find((p) => p.id === pr.planId);
        const status = plan && currentDay(plan, pr, now);
        if (plan && status?.kind === 'read') {
          next = { plan: plan.name, label: `${isLessons(plan) ? 'Lesson' : 'Day'} ${status.day}` };
          break;
        }
      }
      const msg = reminderMessage(next, formatRef(verseOfTheDay(now).range));
      void showReminder(msg.title, msg.body);
    }, due - Date.now());
    return () => window.clearTimeout(id);
  }, [reminders, plans, progress, entries]);
}
