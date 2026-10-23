import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/design-system/components';
import { LampLockup } from '@/design-system/LampMark';
import { useAccount } from '@/features/account/accountStore';
import { accountClient } from '@/features/account/client';
import styles from './InsightsPage.module.css';

interface Report {
  daily: { day: string; name: string; events: number; devices: number }[];
  active: { day: string; daily: number; weekly: number }[];
  retention: { cohort_day: string; after: 1 | 7 | 28; cohort: number; returned: number }[];
}

const LABELS: Record<string, string> = {
  welcome_started: 'Welcome started',
  google_chosen: 'Chose Google',
  guest_chosen: 'Chose guest',
  save_offer_shown: 'Offered to save',
  welcome_completed: 'Welcome completed',
  guest_import_started: 'Guest import started',
  guest_import_completed: 'Guest import completed',
  guest_import_failed: 'Guest import failed',
  plan_started: 'Plan started',
  plan_day_completed: 'Plan day completed',
  reading_resumed: 'Reading resumed',
  chapter_read: 'Read a chapter',
  sync_failed: 'Sync failed',
  sync_recovered: 'Sync recovered',
  account_deleted: 'Account deleted',
};

const percent = (part: number, whole: number) =>
  whole ? `${Math.round((part / whole) * 100)}%` : '–';

function useReport(days: number) {
  const signedIn = useAccount((s) => s.status === 'signed-in');
  const [state, setState] = useState<{ report?: Report; error?: string }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!accountClient || !signedIn) return;
    let live = true;
    void accountClient.rpc('usage_report', { days }).then(({ data, error }) => {
      if (!live) return;
      if (!error) return setState({ report: data as Report });
      setState({
        error:
          error.code === '42501'
            ? 'This account cannot see insights. Add its email to usage_admins in Supabase.'
            : error.code === 'PGRST202' || error.code === '42P01'
              ? 'Insights are not set up yet: run supabase/usage-insights.sql in Supabase.'
              : 'Insights could not load. Check your connection and try again.',
      });
    });
    return () => {
      live = false;
    };
  }, [days, signedIn, attempt]);
  return { ...state, signedIn, retry: () => setAttempt((n) => n + 1) };
}

/** Maintainers only: anonymous daily totals (supabase/usage-insights.sql). */
export function InsightsPage() {
  const [days, setDays] = useState(30);
  const { report, error, signedIn, retry } = useReport(days);

  const totals = new Map<string, { events: number; devices: number }>();
  for (const row of report?.daily ?? []) {
    const t = totals.get(row.name) ?? { events: 0, devices: 0 };
    totals.set(row.name, { events: t.events + row.events, devices: t.devices + row.devices });
  }
  const sum = (name: string) => totals.get(name)?.events ?? 0;
  const latest = report?.active.at(-1);
  const cohorts = [...new Set(report?.retention.map((r) => r.cohort_day))].sort().reverse();

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <Link to="/" aria-label="Lampstand home">
          <LampLockup size={28} title="Lampstand" />
        </Link>
        <h1>Usage insights</h1>
        <p>
          Anonymous daily totals. An active device read a chapter, resumed reading or worked on a
          plan that day. Today is added tomorrow.
        </p>
        <div className={styles.range} role="radiogroup" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
            >
              {d} days
            </button>
          ))}
        </div>
      </header>

      {!signedIn ? (
        <p className={styles.notice}>Sign in with a maintainer’s Google account to see insights.</p>
      ) : error ? (
        <div className={styles.notice} role="alert">
          <p>{error}</p>
          <Button onClick={retry}>Try again</Button>
        </div>
      ) : !report ? (
        <p className={styles.notice} aria-busy="true">
          Loading…
        </p>
      ) : (
        <>
          <dl className={styles.tiles}>
            <div>
              <dt>Active devices, last day</dt>
              <dd>{latest?.daily ?? '–'}</dd>
            </div>
            <div>
              <dt>Active devices, last 7 days</dt>
              <dd>{latest?.weekly ?? '–'}</dd>
            </div>
            <div>
              <dt>Chose Google / guest</dt>
              <dd>
                {sum('google_chosen')} / {sum('guest_chosen')}
              </dd>
            </div>
            <div>
              <dt>Finished Welcome</dt>
              <dd>{percent(sum('welcome_completed'), sum('welcome_started'))}</dd>
            </div>
          </dl>

          <section aria-labelledby="active-title">
            <h2 id="active-title">Active devices by day</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">That day</th>
                  <th scope="col">7 days to that day</th>
                </tr>
              </thead>
              <tbody>
                {[...report.active].reverse().map((a) => (
                  <tr key={a.day}>
                    <th scope="row">{a.day}</th>
                    <td>{a.daily}</td>
                    <td>{a.weekly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="events-title">
            <h2 id="events-title">Events in this period</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Times</th>
                  <th scope="col">Device-days</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(LABELS).map((name) => (
                  <tr key={name}>
                    <th scope="row">{LABELS[name]}</th>
                    <td>{totals.get(name)?.events ?? 0}</td>
                    <td>{totals.get(name)?.devices ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="retention-title">
            <h2 id="retention-title">Returning devices</h2>
            <p>
              Of the devices first seen on a day, the share active again 1, 7 and 28 days later.
            </p>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">First seen</th>
                  <th scope="col">Devices</th>
                  <th scope="col">Day 1</th>
                  <th scope="col">Day 7</th>
                  <th scope="col">Day 28</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((day) => {
                  const of = (after: number) =>
                    report.retention.find((r) => r.cohort_day === day && r.after === after);
                  const size = of(1)?.cohort ?? of(7)?.cohort ?? of(28)?.cohort ?? 0;
                  return (
                    <tr key={day}>
                      <th scope="row">{day}</th>
                      <td>{size}</td>
                      {[1, 7, 28].map((after) => {
                        const r = of(after);
                        return <td key={after}>{r ? percent(r.returned, r.cohort) : '–'}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
