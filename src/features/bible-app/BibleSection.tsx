import { NavLink, Outlet } from 'react-router-dom';
import { useControl } from '@/features/present/live/controlStore';
import { useBibleTvSession } from './tvActions';
import styles from './BibleSection.module.css';

const TABS: { to: string; label: string; end?: boolean }[] = [
  { to: '/bible', label: 'Read', end: true },
  { to: '/bible/today', label: 'Today' },
  { to: '/bible/plans', label: 'Plans' },
  { to: '/bible/journal', label: 'Journal' },
  { to: '/bible/notes', label: 'Notes & highlights' },
];

/** The Bible section: its own tabs, and the TV session that stays up across them. */
export function BibleSection() {
  useBibleTvSession();
  const presenting = useControl((s) => s.presenting);
  return (
    <div className={styles.section}>
      <nav className={styles.tabs} aria-label="Bible">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
        {presenting && (
          <span className={styles.onAir} role="status">
            <span className={styles.onAirDot} aria-hidden /> On the TV
          </span>
        )}
      </nav>
      <div className={styles.body}>
        <Outlet />
      </div>
    </div>
  );
}
