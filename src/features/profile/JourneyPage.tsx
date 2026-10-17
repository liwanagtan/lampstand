import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { paths } from '@/app/paths';
import { ActivePlan } from '@/features/bible-app/ActivePlan';
import { JourneyTimeline } from '@/features/bible-app/JourneyTimeline';
import { useSettings } from '@/features/settings/settingsStore';
import { useJourneyStats } from './useJourneyStats';
import styles from './Profile.module.css';

const finishedFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Journey: a summary, your plans, then everything you have written and marked. */
export function JourneyPage() {
  const stats = useJourneyStats();
  const plansOn = useSettings((s) => s.features.plans);
  const hasPlans = Boolean(stats && (stats.going.length || stats.finished.length));
  return (
    <>
      <section aria-label="Your journey so far">
        <dl className={styles.summary}>
          <Stat value={stats?.daysThisMonth} label="Days read this month" />
          {plansOn && <Stat value={stats?.going.length} label="Plans going" />}
          {plansOn && <Stat value={stats?.finished.length} label="Plans finished" />}
        </dl>
      </section>

      {plansOn && stats && (
        <section className={styles.section} aria-label="Your plans">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Plans</h2>
            <Link to={paths.plans} className={styles.link}>
              {hasPlans ? 'Find another plan' : 'Find a plan'}
            </Link>
          </div>
          {!hasPlans && (
            <p className={styles.muted}>
              Plans you start show here, and stay once you finish them.
            </p>
          )}
          {stats.going.length > 0 && (
            <div className={styles.plans}>
              {stats.going.map(({ plan, progress }) => (
                <ActivePlan key={plan.id} plan={plan} progress={progress} />
              ))}
            </div>
          )}
          {stats.finished.length > 0 && (
            <ul className={styles.finished} aria-label="Finished plans">
              {stats.finished.map(({ plan, finishedAt }) => (
                <li key={plan.id}>
                  <Link to={paths.planPage(plan.id)} className={styles.finishedItem}>
                    <CircleCheck size={18} className={styles.finishedIcon} aria-hidden />
                    <span className={styles.finishedName}>{plan.name}</span>
                    <span className={styles.finishedDate}>
                      Finished {finishedFormat.format(finishedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <JourneyTimeline />
    </>
  );
}

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value ?? '–'}</dd>
    </div>
  );
}
