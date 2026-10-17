import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LampLockup, LampMark } from '@/design-system/LampMark';
import { cx } from '@/design-system/components';
import { useControl } from '@/features/present/live/controlStore';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import { TipHost } from '@/features/tips/TipHost';
import { Avatar } from '@/features/profile/Avatar';
import { noteVisit } from '@/features/profile/journey';
import { visibleNav } from './features';
import { isOnboarded } from './onboarding';
import { paths } from './paths';
import styles from './AppShell.module.css';

/**
 * Today · Bible · Plans · Screen, plus Profile. A top bar on laptops; on phones the
 * destinations move to a bottom tab bar within thumb reach (docs/PRD-ADDENDUM-GROW.md).
 */
export function AppShell() {
  useApplyDocumentTheme();
  const features = useSettings((s) => s.features);
  const presenting = useControl((s) => s.presenting);
  const nav = visibleNav(features);
  const welcome = !isOnboarded();
  const { pathname } = useLocation();
  const atmosphere = atmosphereFor(pathname);
  noteVisit();

  if (welcome) return <Navigate to="/welcome" replace />;
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
          to={paths.profile}
          className={({ isActive }) => cx(styles.me, isActive && styles.meActive)}
          aria-label="Profile: your journey and settings"
          title="Profile"
        >
          <Avatar size={34} />
        </NavLink>
      </header>
      <main
        className={styles.main}
        id="main"
        data-scroll
        data-atmosphere={atmosphere}
        data-daypart={atmosphere === 'today' ? daypart(new Date()) : undefined}
      >
        <Outlet />
      </main>
      <TipHost />
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

/** Each workspace has its own atmosphere, so the mood says where you are. */
function atmosphereFor(pathname: string): string {
  if (pathname === '/') return 'today';
  if (pathname.startsWith('/bible')) return 'bible';
  if (pathname.startsWith('/plans')) return 'plans';
  if (pathname.startsWith('/profile')) return 'journal';
  if (pathname.startsWith('/screen')) return 'stage';
  return 'me';
}

/** Today's light follows the time of day. */
function daypart(d: Date): 'dawn' | 'day' | 'dusk' | 'night' {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'dawn';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}
