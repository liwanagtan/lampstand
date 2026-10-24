import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LampLockup, LampMark } from '@/design-system/LampMark';
import { cx } from '@/design-system/components';
import { useControl } from '@/features/present/live/controlStore';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import { TipHost } from '@/features/tips/TipHost';
import { GuidedTour } from '@/features/tour/GuidedTour';
import { rememberAfterWelcome } from '@/features/share/share';
import { Avatar } from '@/features/profile/Avatar';
import { TopSearch } from '@/features/search/TopSearch';
import { useReminders } from '@/features/reminders/useReminders';
import { noteVisit } from '@/features/profile/journey';
import { phoneTabs, visibleNav } from './features';
import { isOnboarded } from './onboarding';
import { paths } from './paths';
import { haptic } from './haptics';
import { NavIcon } from './NavIcon';
import { usePageScrollRestoration } from './usePageScrollRestoration';
import styles from './AppShell.module.css';
import sun from './TodaySun.module.css';

/**
 * Laptops: Today · Plans · Bible · Screen, then Search and Profile in the top bar. Phones: a
 * bottom tab bar within thumb reach — Today · Plans · Bible · Search · Profile
 * (docs/PRD-ADDENDUM-GROW.md).
 */
export function AppShell() {
  useApplyDocumentTheme();
  usePageScrollRestoration();
  const features = useSettings((s) => s.features);
  const presenting = useControl((s) => s.presenting);
  const nav = visibleNav(features);
  const tabs = phoneTabs(features);
  const welcome = !isOnboarded();
  const { pathname } = useLocation();
  const focusedReading =
    /^\/plans\/[^/]+\/\d+$/.test(pathname) || pathname.startsWith('/devotional/');
  const atmosphere = atmosphereFor(pathname);
  noteVisit();
  useReminders();

  if (welcome) {
    rememberAfterWelcome(pathname);
    return <Navigate to="/welcome" replace />;
  }
  return (
    <div className={styles.shell} data-focus-reading={focusedReading || undefined}>
      <header className={styles.topbar}>
        <NavLink to={paths.today} className={styles.brand} aria-label="Lampstand home">
          <LampLockup size={30} className={styles.lockup} title="" />
          <LampMark size={26} className={styles.mark} />
        </NavLink>
        <nav aria-label="Main" className={styles.nav}>
          {nav.map(({ to, label, icon: Icon, glyph, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cx(styles.link, isActive && styles.active)}
            >
              {({ isActive }) => (
                <>
                  {glyph ? (
                    <NavIcon glyph={glyph} active={isActive} size={20} />
                  ) : (
                    <Icon size={17} strokeWidth={1.75} aria-hidden />
                  )}
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        {presenting && (
          <span className={styles.onAir} role="status">
            <span className={styles.onAirDot} aria-hidden /> On the TV
          </span>
        )}
        <TopSearch />
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
        className={cx(styles.main, atmosphere === 'today' && sun.sun)}
        id="main"
        data-scroll
        data-atmosphere={atmosphere}
        data-daypart={atmosphere === 'today' ? daypart(new Date()) : undefined}
      >
        <Outlet />
      </main>
      <TipHost />
      <GuidedTour />
      <nav aria-label="Main" className={styles.tabbar}>
        {tabs.map(({ to, label, icon: Icon, glyph, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-tour={`tab-${label.toLowerCase()}`}
            className={({ isActive }) => cx(styles.tab, isActive && styles.tabActive)}
            onClick={() => {
              // Tapping the tab you're on takes you back to the top, as phones expect.
              const here = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
              if (here) document.getElementById('main')?.scrollTo({ top: 0, behavior: 'smooth' });
              else haptic('tap');
            }}
          >
            {({ isActive }) => (
              <>
                {to === paths.profile ? (
                  <Avatar size={26} className={styles.tabAvatar} />
                ) : glyph ? (
                  <NavIcon glyph={glyph} active={isActive} size={26} />
                ) : (
                  <Icon size={22} strokeWidth={1.75} aria-hidden />
                )}
                <span>{label}</span>
              </>
            )}
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
  if (pathname.startsWith('/screen')) return 'screen';
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
