import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog } from '@/design-system/components';
import { paths } from '@/app/paths';
import { Award } from 'lucide-react';
import { startPlan, usePlanProgressFor, type Plan } from './plans';
import { useEntries } from './journal';
import styles from './CompletedPlanActions.module.css';

/** Revisiting preserves completion; restarting requires an explicit reset confirmation. */
export function CompletedPlanActions({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [error, setError] = useState('');
  const restart = async () => {
    setRestarting(true);
    setError('');
    try {
      await startPlan(plan.id);
      navigate(paths.planDay(plan.id, 1));
    } catch {
      setError('Could not restart this plan. Please try again.');
    } finally {
      setRestarting(false);
    }
  };
  return (
    <section className={styles.completed} aria-label="Completed plan actions">
      <PlanKeepsake plan={plan} />
      <div className={styles.actions}>
        <Button variant="gold" onClick={() => navigate(paths.planDay(plan.id, 1))}>
          Revisit readings
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          Start again
        </Button>
      </div>
      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (!restarting) setConfirming(open);
        }}
        size="sm"
        title="Start this plan again?"
        description="This resets this plan’s reading progress and completion dates. Your journal, notes and highlights are kept. To keep your completion record, choose Revisit readings instead."
        footer={
          <>
            <Button variant="ghost" disabled={restarting} onClick={() => setConfirming(false)}>
              Keep completion
            </Button>
            <Button variant="primary" loading={restarting} onClick={() => void restart()}>
              Reset and start again
            </Button>
          </>
        }
      >
        {error && <p role="alert">{error}</p>}
      </Dialog>
    </section>
  );
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** A quiet keepsake for a finished plan: when you began and finished, and what you wrote. */
function PlanKeepsake({ plan }: { plan: Plan }) {
  const progress = usePlanProgressFor(plan.id);
  const reflections = useEntries()?.filter((e) => e.planId === plan.id).length ?? 0;
  const doneTimes = Object.values(progress?.doneAt ?? {});
  const finishedAt = doneTimes.length ? Math.max(...doneTimes) : progress?.updatedAt;
  return (
    <div className={styles.keepsake}>
      <Award size={28} className={styles.keepsakeIcon} aria-hidden />
      <div>
        <p className={styles.keepsakeTitle}>You finished {plan.name}</p>
        <p className={styles.keepsakeMeta}>
          {progress && `Began ${dateFormat.format(progress.startedAt)}`}
          {progress && finishedAt && ` · finished ${dateFormat.format(finishedAt)}`}
          {reflections > 0 &&
            ` · ${reflections} ${reflections === 1 ? 'reflection' : 'reflections'} written`}
        </p>
      </div>
    </div>
  );
}
