import { useState } from 'react';
import { Button, Dialog } from '@/design-system/components';
import type { PlanProgressRecord } from '@/db/types';
import {
  currentDay,
  nextReadingDate,
  setPlanPaused,
  setPlanRhythm,
  type Plan,
  type PlanRhythm,
} from './plans';
import styles from './Daily.module.css';

type Choice = PlanRhythm | 'plan';

const personalChoices: { value: PlanRhythm; label: string; detail: string }[] = [
  {
    value: 'open',
    label: 'At my own pace',
    detail: 'No suggested dates. Pick up the next unread reading whenever you are ready.',
  },
  { value: 'daily', label: 'Every day', detail: 'A gentle daily target.' },
  { value: 'every-few-days', label: 'Every few days', detail: 'A reading about every three days.' },
  { value: 'weekly', label: 'Once a week', detail: 'One reading each week.' },
];

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long', month: 'short', day: 'numeric',
});

export function PlanPacingControls({
  plan,
  progress,
  compact = false,
}: {
  plan: Plan;
  progress: PlanProgressRecord;
  compact?: boolean;
}) {
  const initial: Choice = progress.rhythm ?? (plan.pace === 'daily' ? 'open' : 'plan');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Choice>(initial);
  const [previewAt, setPreviewAt] = useState(0);
  if (compact) return null;

  const paused = Boolean(progress.pausedAt);
  const nextDate = nextReadingDate(progress);
  const rhythmName = personalChoices.find((choice) => choice.value === progress.rhythm)?.label;
  const selectedDate = selected === 'plan'
    ? null
    : nextReadingDate(
        selected === initial ? progress : { ...progress, rhythmChangedAt: previewAt },
        selected,
        previewAt ? new Date(previewAt) : undefined,
      );
  const interval = selected === 'daily' ? 1 : selected === 'every-few-days' ? 3 : selected === 'weekly' ? 7 : 0;
  const previewDates = selectedDate && interval
    ? Array.from({ length: Math.min(3, plan.days.length - progress.done.length) }, (_, index) =>
        dateFormat.format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + interval * index)))
    : [];
  const original = currentDay(plan, { ...progress, rhythm: undefined, pausedAt: undefined });
  const choices = plan.pace === 'daily'
    ? personalChoices
    : [
        {
          value: 'plan' as const,
          label: 'Keep the plan schedule',
          detail: `Lessons open ${plan.pace === 'weekly' ? 'weekly' : 'monthly'} as written.`,
        },
        ...personalChoices,
      ];

  return (
    <section className={styles.pacingControls} aria-label="Reading pace">
      {!paused && nextDate && (
        <p className={styles.pacingHint}>
          {rhythmName} · Suggested next reading: {dateFormat.format(nextDate)}. You can read sooner.
        </p>
      )}
      <div className={styles.pacingActions}>
        <Button
          variant="ghost"
          onClick={() => {
            setSelected(progress.rhythm ?? (plan.pace === 'daily' ? 'open' : 'plan'));
            setPreviewAt(Date.now());
            setOpen(true);
          }}
        >
          Adjust pace
        </Button>
        <Button variant="ghost" onClick={() => void setPlanPaused(progress.planId, !paused)}>
          {paused ? 'Resume plan' : 'Pause plan'}
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Choose your reading pace"
        description="This changes when unread readings are suggested. Finished readings and journal entries stay as they are."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => void setPlanRhythm(progress.planId, selected === 'plan' ? null : selected).then(() => setOpen(false))}
            >
              Save pace
            </Button>
          </>
        }
      >
        <div className={styles.pacingChoices} role="radiogroup" aria-label="Reading pace">
          {choices.map((choice) => (
            <label key={choice.value} className={styles.pacingChoice}>
              <input
                type="radio"
                name={`plan-rhythm-${progress.planId}`}
                value={choice.value}
                checked={selected === choice.value}
                onChange={() => setSelected(choice.value)}
              />
              <span><strong>{choice.label}</strong><small>{choice.detail}</small></span>
            </label>
          ))}
        </div>
        <p className={styles.pacingPreview}>
          {selected === 'plan'
            ? original.kind === 'waiting'
              ? `The next lesson opens ${dateFormat.format(original.unlocks)} under this plan's schedule.`
              : 'The next unread lesson is ready under this plan’s schedule.'
            : selectedDate
              ? `Next suggested readings: ${previewDates.join(' · ')}. These are gentle targets; you can read sooner.`
              : 'No suggested dates. Your next unread reading is ready whenever you are.'}
        </p>
      </Dialog>
    </section>
  );
}
