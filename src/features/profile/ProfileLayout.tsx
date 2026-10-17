import { usePhoneTitle } from '@/app/topBar';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { cx } from '@/design-system/components';
import { paths } from '@/app/paths';
import { useSettings } from '@/features/settings/settingsStore';
import { Avatar } from './Avatar';
import { journeyLine, previousVisit, profileGreeting } from './journey';
import { useJourneyStats } from './useJourneyStats';
import styles from './Profile.module.css';

const TABS = [
  { to: paths.profile, label: 'Journey', end: true },
  { to: paths.profileYou, label: 'Profile' },
  { to: paths.settings, label: 'Settings' },
];

/** Profile: a greeting by name, then Journey · Profile · Settings (docs/PRD-ADDENDUM-GROW.md). */
export function ProfileLayout() {
  const name = useSettings((s) => s.profile.name);
  const stats = useJourneyStats();
  const greeting = profileGreeting(name, new Date(), previousVisit());
  usePhoneTitle(greeting);
  return (
    <div className={styles.page} data-enter>
      <header className={styles.header}>
        <Avatar size={64} className={styles.heroAvatar} />
        <div className={styles.headText}>
          <h1 className={`${styles.greeting} phone-hidden`}>{greeting}</h1>
          {name.trim() ? (
            <p className={styles.line}>{stats ? journeyLine(stats) : ' '}</p>
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
