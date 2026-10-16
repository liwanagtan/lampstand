import { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { Button, Dialog, cx } from '@/design-system/components';
import type { PlanProgressRecord } from '@/db/types';
import {
  PLANS,
  formatReading,
  nextUnread,
  planDay,
  planSchedule,
  setDayRead,
  startPlan,
  stopPlan,
  usePlanProgress,
  type PlanDef,
} from './plans';
import { useOpenInReader } from './useOpenInReader';
import styles from './Daily.module.css';

/** Reading plans: start one, read a day at a time, tick days off. */
export function PlansPage() {
  const progress = usePlanProgress();
  const byId = new Map((progress ?? []).map((p) => [p.planId, p]));
  const active = PLANS.filter((p) => byId.has(p.id));
  const available = PLANS.filter((p) => !byId.has(p.id));
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Reading plans</p>
      <h1 className={styles.title}>Read through the Bible</h1>
      <p className={styles.lede}>
        Readings are balanced by length, so each day takes about the same time. Missed a day? Pick
        up where you left off.
      </p>
      <div className={styles.stack}>
        {active.map((plan) => (
          <ActivePlan key={plan.id} plan={plan} progress={byId.get(plan.id)!} />
        ))}
        {progress && available.length > 0 && (
          <div className={styles.grid}>
            {available.map((plan) => (
              <section key={plan.id} className={styles.card} aria-label={plan.name}>
                <div className={styles.cardHead}>
                  <h2 className={styles.cardTitle}>{plan.name}</h2>
                  <span className={styles.cardMeta}>{plan.days} days</span>
                </div>
                <p className={styles.muted}>{plan.description}</p>
                <p className={styles.muted}>
                  Day 1: <strong>{formatReading(planSchedule(plan)[0]!)}</strong>
                </p>
                <div className={styles.row}>
                  <Button variant="primary" onClick={() => void startPlan(plan.id)}>
                    Start plan
                  </Button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivePlan({ plan, progress }: { plan: PlanDef; progress: PlanProgressRecord }) {
  const open = useOpenInReader();
  const [stopping, setStopping] = useState(false);
  const days = planSchedule(plan);
  const done = new Set(progress.done);
  const today = planDay(progress, plan);
  const next = nextUnread(progress, plan);
  const pct = Math.round((done.size / plan.days) * 100);
  const behind = next !== null && next < today ? today - next : 0;
  const reading = next ? days[next - 1]! : null;

  return (
    <section className={styles.card} aria-label={plan.name}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{plan.name}</h2>
        <span className={styles.cardMeta}>
          {done.size} of {plan.days} days · {pct}%
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
      {reading ? (
        <>
          <p className={styles.muted}>
            Next: day {next}
            {behind > 0 ? ` · ${behind} ${behind === 1 ? 'day' : 'days'} to catch up` : ''}
          </p>
          <p className={styles.reading}>{formatReading(reading)}</p>
          <div className={styles.row}>
            <Button
              icon={<BookOpen size={16} />}
              onClick={() =>
                open(
                  { start: { ...reading[0]!, verse: 1 }, end: { ...reading[0]!, verse: 1 } },
                  false,
                )
              }
            >
              Read
            </Button>
            <Button
              variant="primary"
              icon={<Check size={16} />}
              onClick={() => void setDayRead(plan.id, next!, true)}
            >
              Mark day {next} read
            </Button>
            <Button variant="ghost" className={styles.push} onClick={() => setStopping(true)}>
              Stop plan
            </Button>
          </div>
        </>
      ) : (
        <div className={styles.row}>
          <p className={styles.done}>
            <Check size={16} aria-hidden /> You finished {plan.name.toLowerCase()}. Well done!
          </p>
          <Button className={styles.push} onClick={() => void startPlan(plan.id)}>
            Start again
          </Button>
        </div>
      )}
      <ol className={styles.days} aria-label={`${plan.name} days`}>
        {days.map((d, i) => {
          const n = i + 1;
          const isDone = done.has(n);
          const label = formatReading(d);
          return (
            <li
              key={n}
              className={cx(styles.day, isDone && styles.dayDone, n === today && styles.dayToday)}
            >
              <input
                type="checkbox"
                checked={isDone}
                aria-label={`Day ${n}: ${label}`}
                onChange={(e) => void setDayRead(plan.id, n, e.target.checked)}
              />
              <span className={styles.dayNum}>Day {n}</span>
              <span className={styles.dayRead} title={label}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <Dialog
        open={stopping}
        onOpenChange={setStopping}
        size="sm"
        title={`Stop ${plan.name.toLowerCase()}?`}
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
