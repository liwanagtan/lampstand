import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { cx } from '@/design-system/components';
import { paths } from '@/app/paths';
import { useIsPhone } from '@/app/useIsPhone';
import { useSettings } from '@/features/settings/settingsStore';
import { Avatar } from './Avatar';
import { journeyLine, previousVisit, profileGreeting } from './journey';
import { useJourneyStats } from './useJourneyStats';
import styles from './Profile.module.css';

const TABS = [
  { to: paths.profile, label: 'Journey', end: true },
  { to: paths.profileYou, label: 'About you' },
  { to: paths.settings, label: 'Settings' },
];

/** Profile: a greeting by name, then Journey · Profile · Settings (docs/PRD-ADDENDUM-GROW.md). */
export function ProfileLayout() {
  const phone = useIsPhone();
  const name = useSettings((s) => s.profile.name);
  const stats = useJourneyStats();
  const greeting = profileGreeting(name, new Date(), previousVisit());
  // On a phone the full header belongs to Journey; About you and Settings get a slim one, so
  // their own content starts near the top.
  const { pathname } = useLocation();
  const slim = phone && pathname !== paths.profile;
  return (
    <div className={styles.page} data-enter>
      <header className={cx(styles.header, slim && styles.slimHeader)}>
        <Avatar size={64} className={styles.heroAvatar} />
        <div className={styles.headText}>
          <h1 className={styles.greeting}>{phone ? name.trim() || 'Your profile' : greeting}</h1>
          {phone && !slim && stats?.since && (
            <p className={styles.mobileSince}>
              Reading with Lampstand since{' '}
              {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(
                stats.since,
              )}
            </p>
          )}
          {name.trim() ? (
            <p className={`${styles.line} laptop-only`}>{stats ? journeyLine(stats) : ' '}</p>
          ) : (
            <p className={styles.line}>
              <Link to={paths.profileYou} className={styles.addName}>
                Add your name
              </Link>{' '}
              so Lampstand can greet you.
            </p>
          )}
        </div>
      </header>
      <nav className={styles.tabs} aria-label="Profile sections">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => cx(styles.tab, isActive && styles.tabActive)}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.body}>
        <Outlet />
      </div>
    </div>
  );
}
