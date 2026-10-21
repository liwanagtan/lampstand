import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog } from '@/design-system/components';
import { paths } from '@/app/paths';
import { startPlan, type Plan } from './plans';
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
      <p>Plan complete. Well done!</p>
      <div className={styles.actions}>
        <Button variant="primary" onClick={() => navigate(paths.planDay(plan.id, 1))}>
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
