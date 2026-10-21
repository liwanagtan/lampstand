import { Link } from 'react-router-dom';
import { CircleCheck, ChevronRight, BookOpen } from 'lucide-react';
import { paths } from '@/app/paths';
import { ActivePlan } from '@/features/bible-app/ActivePlan';
import { currentDay } from '@/features/bible-app/plans';
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
  // Nothing yet: no zeros, just one welcome with a way to begin. The timeline stays mounted
  // either way, so an entry sheet opened from the welcome survives the first save.
  const empty = Boolean(stats && stats.since === null);
  return (
    <>
      <a href="#your-journal" className={styles.journalShortcut}>
        Open your journal <ChevronRight size={16} aria-hidden />
      </a>
      {!empty && (
        <section aria-label="Your journey so far">
          <dl className={styles.summary}>
            <Stat value={stats?.daysThisMonth} label="Days read this month" />
            {plansOn && <Stat value={stats?.going.length} label="Plans going" />}
            {plansOn && <Stat value={stats?.finished.length} label="Plans finished" />}
          </dl>
        </section>
      )}

      {stats && !empty && <ReadingCalendar days={stats.activityDays} />}

      {plansOn && stats && !empty && (
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
                <div key={plan.id}>
                  <div className="laptop-only">
                    <ActivePlan plan={plan} progress={progress} />
                  </div>
                  <Link to={paths.planPage(plan.id)} className={styles.journeyPlan}>
                    <BookOpen size={24} aria-hidden />
                    <span>
                      <strong>{plan.name}</strong>
                      <small>
                        {progress.done.length} of {plan.days.length} ·{' '}
                        {currentDay(plan, progress).kind === 'read'
                          ? 'Next reading ready'
                          : 'Reading in progress'}
                      </small>
                    </span>
                    <ChevronRight size={18} aria-hidden />
                  </Link>
                </div>
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

      <JourneyTimeline welcome={empty} />
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

function ReadingCalendar({ days }: { days: readonly string[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const offset = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  const active = new Set(days);
  return (
    <section className={styles.calendar} aria-label="Days you read this month">
      <div className={styles.calendarHead}>
        <h2>{new Intl.DateTimeFormat(undefined, { month: 'long' }).format(now)}</h2>
        <span>Days you read</span>
      </div>
      <div className={styles.calendarGrid}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
          <span key={i} className={styles.calendarWeekday} aria-hidden>
            {label}
          </span>
        ))}
      </div>
      <div className={styles.calendarGrid}>
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const n = i + 1;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
          const read = active.has(key);
          return (
            <span
              key={n}
              className={styles.calendarDay}
              data-read={read || undefined}
              aria-current={n === now.getDate() ? 'date' : undefined}
              aria-label={`${key}${read ? ': read' : ''}`}
            >
              {n}
            </span>
          );
        })}
      </div>
    </section>
  );
}
