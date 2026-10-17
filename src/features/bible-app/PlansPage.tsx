import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Check, Clock, GraduationCap, Upload } from 'lucide-react';
import { Button, Chip, Dialog, toast } from '@/design-system/components';
import type { PlanProgressRecord } from '@/db/types';
import {
  currentDay,
  formatDay,
  importPlan,
  readingMinutes,
  removePlan,
  startPlan,
  stopPlan,
  usePlanProgress,
  usePlans,
  type Plan,
} from './plans';
import styles from './Daily.module.css';
import { paths } from '@/app/paths';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

/** Reading plans: start one, then read one day (or lesson) at a time. */
export function PlansPage() {
  const plans = usePlans();
  const progress = usePlanProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const byId = new Map((progress ?? []).map((p) => [p.planId, p]));
  const active = (plans ?? []).filter((p) => byId.has(p.id));
  const available = (plans ?? []).filter((p) => !byId.has(p.id));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const r = await importPlan(await file.text());
    if (fileRef.current) fileRef.current.value = '';
    if (!r.ok) return setErrors(r.errors);
    toast({
      title: r.replaced ? `Updated “${r.plan.name}”` : `Added “${r.plan.name}”`,
      tone: 'success',
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.headRow}>
        <div>
          <p className={styles.eyebrow}>Reading plans</p>
          <h1 className={styles.title}>Read through the Bible</h1>
        </div>
        <Button icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
          Import plan
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Choose a plan file"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      <p className={styles.lede}>
        One reading at a time, balanced by length. Missed a day? Just pick up where you left off.
      </p>
      <div className={styles.stack}>
        {active.length > 0 && (
          <div className={styles.grid}>
            {active.map((plan) => (
              <ActivePlan key={plan.id} plan={plan} progress={byId.get(plan.id)!} />
            ))}
          </div>
        )}
        {plans && available.length > 0 && (
          <>
            {active.length > 0 && <h2 className={styles.sectionTitle}>More plans</h2>}
            <div className={styles.grid}>
              {available.map((plan) => (
                <AvailablePlan key={plan.id} plan={plan} />
              ))}
            </div>
          </>
        )}
      </div>
      <Dialog
        open={Boolean(errors)}
        onOpenChange={(o) => !o && setErrors(null)}
        size="sm"
        title="This plan couldn't be imported"
        description="Fix these in the file and try again."
        footer={
          <Button variant="primary" onClick={() => setErrors(null)}>
            OK
          </Button>
        }
      >
        <ul className={styles.errorList}>
          {errors?.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

function PlanBadges({ plan }: { plan: Plan }) {
  return (
    <span className={styles.badges}>
      {plan.pace === 'weekly' && (
        <Chip icon={<GraduationCap size={12} />} tone="accent">
          Weekly lessons
        </Chip>
      )}
      {plan.source === 'imported' && <Chip>Imported</Chip>}
    </span>
  );
}

function AvailablePlan({ plan }: { plan: Plan }) {
  const [removing, setRemoving] = useState(false);
  const unit = plan.pace === 'weekly' ? 'lessons' : 'days';
  return (
    <section className={styles.card} aria-label={plan.name}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{plan.name}</h2>
        <span className={styles.cardMeta}>
          {plan.days.length} {unit}
        </span>
      </div>
      <PlanBadges plan={plan} />
      <p className={styles.muted}>{plan.description}</p>
      <div className={styles.row}>
        <Button variant="primary" onClick={() => void startPlan(plan.id)}>
          Start plan
        </Button>
        {plan.source === 'imported' && (
          <Button variant="ghost" className={styles.push} onClick={() => setRemoving(true)}>
            Remove
          </Button>
        )}
      </div>
      <Dialog
        open={removing}
        onOpenChange={setRemoving}
        size="sm"
        title={`Remove “${plan.name}”?`}
        description="The plan is removed from this computer. You can import the file again later."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(false)}>
              Keep
            </Button>
            <Button variant="primary" onClick={() => void removePlan(plan.id)}>
              Remove plan
            </Button>
          </>
        }
      />
    </section>
  );
}

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
  const unit = plan.pace === 'weekly' ? 'Lesson' : 'Day';
  const day = status.kind === 'read' ? plan.days[status.day - 1]! : null;

  return (
    <section className={styles.card} aria-label={plan.name}>
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle}>{plan.name}</h2>
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
            {plan.pace === 'weekly' ? "This week's lesson" : 'Up next'} · {unit} {status.day}
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
