import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Check, Clock } from 'lucide-react';
import { Button, Dialog } from '@/design-system/components';
import type { PlanProgressRecord } from '@/db/types';
import { paths } from '@/app/paths';
import {
  currentDay,
  currentLabel,
  formatDay,
  isLessons,
  readingMinutes,
  startPlan,
  stopPlan,
  type Plan,
} from './plans';
import styles from './Daily.module.css';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** An active plan: progress, and only the reading that's up next. */
export function ActivePlan({
  plan,
  progress,
  compact = false,
}: {
  plan: Plan;
  progress: PlanProgressRecord;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const [stopping, setStopping] = useState(false);
  const status = currentDay(plan, progress);
  const total = plan.days.length;
  const pct = Math.round((progress.done.length / total) * 100);
  const unit = isLessons(plan) ? 'Lesson' : 'Day';
  const day = status.kind === 'read' ? plan.days[status.day - 1]! : null;

  return (
    <section className={styles.card} aria-label={plan.name}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>
          <Link to={paths.planPage(plan.id)} className={styles.cardLink}>
            {plan.name}
          </Link>
        </h2>
        <span className={styles.cardMeta}>
          {progress.done.length} of {total} · {pct}%
        </span>
      </div>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={`${plan.name} progress`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={styles.progressBar} style={{ width: `${pct}%` }} />
      </div>
      {status.kind === 'read' && day && (
        <>
          <p className={styles.muted}>
            {currentLabel(plan)} · {unit} {status.day}
          </p>
          <p className={styles.reading}>{day.title ?? formatDay(day)}</p>
          <p className={styles.readingMeta}>
            {day.title && <span>{formatDay(day)}</span>}
            <span>
              <Clock size={13} aria-hidden /> {readingMinutes(day)} min
            </span>
          </p>
          <div className={styles.row}>
            <Button
              variant="primary"
              icon={<BookOpen size={16} />}
              onClick={() => navigate(paths.planDay(plan.id, status.day))}
            >
              Read {unit.toLowerCase()} {status.day}
            </Button>
            {!compact && (
              <Button variant="ghost" className={styles.push} onClick={() => setStopping(true)}>
                Stop plan
              </Button>
            )}
          </div>
        </>
      )}
      {status.kind === 'waiting' && (
        <>
          <p className={styles.done}>
            <Check size={16} aria-hidden /> {unit} {status.day} done
          </p>
          <p className={styles.muted}>
            {unit} {status.next} opens {dateFormat.format(status.unlocks)}.
          </p>
        </>
      )}
      {status.kind === 'finished' && (
        <div className={styles.row}>
          <p className={styles.done}>
            <Check size={16} aria-hidden /> Plan complete. Well done!
          </p>
          {!compact && (
            <Button className={styles.push} onClick={() => void startPlan(plan.id)}>
              Start again
            </Button>
          )}
        </div>
      )}
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
    </section>
  );
}
