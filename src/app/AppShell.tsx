import { NavLink, Outlet } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import { LampLockup, LampMark } from '@/design-system/LampMark';
import { cx } from '@/design-system/components';
import { useControl } from '@/features/present/live/controlStore';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import { visibleNav } from './features';
import { paths } from './paths';
import styles from './AppShell.module.css';

/**
 * Today · Bible · Plans · Journal · Screen, plus Me. A top bar on laptops; on phones the
 * destinations move to a bottom tab bar within thumb reach (docs/PRD-ADDENDUM-GROW.md).
 */
export function AppShell() {
  useApplyDocumentTheme();
  const features = useSettings((s) => s.features);
  const presenting = useControl((s) => s.presenting);
  const nav = visibleNav(features);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <NavLink to={paths.today} className={styles.brand} aria-label="Lampstand home">
          <LampLockup size={30} className={styles.lockup} title="" />
          <LampMark size={26} className={styles.mark} />
        </NavLink>
        <nav aria-label="Main" className={styles.nav}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cx(styles.link, isActive && styles.active)}
            >
              <Icon size={17} strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        {presenting && (
          <span className={styles.onAir} role="status">
            <span className={styles.onAirDot} aria-hidden /> On the TV
          </span>
        )}
        <NavLink
          to={paths.me}
          className={({ isActive }) => cx(styles.me, isActive && styles.meActive)}
          aria-label="Me: profile and settings"
          title="Me"
        >
          <UserRound size={18} strokeWidth={1.75} aria-hidden />
        </NavLink>
      </header>
      <main className={styles.main} id="main" data-scroll>
        <Outlet />
      </main>
      <nav aria-label="Main" className={styles.tabbar}>
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => cx(styles.tab, isActive && styles.tabActive)}
          >
            <Icon size={22} strokeWidth={1.75} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
