import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button, Dialog, IconButton, Menu } from '@/design-system/components';
import type { PlanProgressRecord } from '@/db/types';
import {
  currentDay,
  nextReadingDate,
  setPlanPaused,
  setPlanRhythm,
  stopPlan,
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
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

/** The suggested next reading under your chosen pace, as one quiet line. */
export function PlanPaceHint({ progress }: { progress: PlanProgressRecord }) {
  const nextDate = nextReadingDate(progress);
  if (progress.pausedAt || !nextDate) return null;
  const rhythmName = personalChoices.find((choice) => choice.value === progress.rhythm)?.label;
  return (
    <p className={styles.pacingHint}>
      {rhythmName ? `${rhythmName} · ` : ''}Next suggested: {dateFormat.format(nextDate)}
    </p>
  );
}

/**
 * Plan options (⋯): adjust pace, pause or resume, stop. Kept in a menu so the reading stays the
 * one clear action; a paused plan also shows Resume plainly.
 */
export function PlanOptions({ plan, progress }: { plan: Plan; progress: PlanProgressRecord }) {
  const initial: Choice = progress.rhythm ?? (plan.pace === 'daily' ? 'open' : 'plan');
  const [stopping, setStopping] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Choice>(initial);
  const [previewAt, setPreviewAt] = useState(0);

  const paused = Boolean(progress.pausedAt);
  const selectedDate =
    selected === 'plan'
      ? null
      : nextReadingDate(
          selected === initial ? progress : { ...progress, rhythmChangedAt: previewAt },
          selected,
          previewAt ? new Date(previewAt) : undefined,
        );
  const interval =
    selected === 'daily' ? 1 : selected === 'every-few-days' ? 3 : selected === 'weekly' ? 7 : 0;
  const previewDates =
    selectedDate && interval
      ? Array.from({ length: Math.min(3, plan.days.length - progress.done.length) }, (_, index) =>
          dateFormat.format(
            new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate() + interval * index,
            ),
          ),
        )
      : [];
  const original = currentDay(plan, { ...progress, rhythm: undefined, pausedAt: undefined });
  const choices =
    plan.pace === 'daily'
      ? personalChoices
      : [
          {
            value: 'plan' as const,
            label: 'Keep the plan schedule',
            detail: `Lessons open ${plan.pace === 'weekly' ? 'weekly' : 'monthly'} as written.`,
          },
          ...personalChoices,
        ];

  const adjust = () => {
    setSelected(progress.rhythm ?? (plan.pace === 'daily' ? 'open' : 'plan'));
    setPreviewAt(Date.now());
    setOpen(true);
  };

  return (
    <>
      {paused && (
        <Button variant="ghost" onClick={() => void setPlanPaused(progress.planId, false)}>
          Resume plan
        </Button>
      )}
      <Menu
        label={`${plan.name} options`}
        trigger={
          <IconButton
            label="Plan options"
            icon={<MoreHorizontal size={18} />}
            className={styles.optionsButton}
          />
        }
        items={[
          { label: 'Adjust pace', onSelect: adjust },
          {
            label: paused ? 'Resume plan' : 'Pause plan',
            onSelect: () => void setPlanPaused(progress.planId, !paused),
          },
          { label: 'Stop plan', onSelect: () => setStopping(true), separatorBefore: true },
        ]}
      />
      <Dialog
        open={stopping}
        onOpenChange={setStopping}
        size="sm"
        title={`Stop ${plan.name}?`}
        description="Your progress on this plan is removed. You can start it again any time."
        footer={
          <>
            <Button variant="ghost" onClick={() => setStopping(false)}>
              Keep going
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setStopping(false);
                void stopPlan(plan.id);
              }}
            >
              Stop plan
            </Button>
          </>
        }
      />
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Choose your reading pace"
        description="This changes when unread readings are suggested. Finished readings and journal entries stay as they are."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                void setPlanRhythm(progress.planId, selected === 'plan' ? null : selected).then(
                  () => setOpen(false),
                )
              }
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
              <span>
                <strong>{choice.label}</strong>
                <small>{choice.detail}</small>
              </span>
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
    </>
  );
}
