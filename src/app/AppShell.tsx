import { NavLink, Outlet } from 'react-router-dom';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { LampLockup, LampMark } from '@/design-system/LampMark';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import type { UiMode } from '@/schema/common';
import styles from './AppShell.module.css';

const NAV: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Library', end: true },
  { to: '/bible', label: 'Bible' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
];

const MODES: { mode: UiMode; label: string; icon: LucideIcon }[] = [
  { mode: 'light', label: 'Light', icon: Sun },
  { mode: 'dark', label: 'Dark', icon: Moon },
  { mode: 'system', label: 'System', icon: Monitor },
];

export function AppShell() {
  useApplyDocumentTheme();
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <NavLink to="/" className={styles.brand} aria-label="Lampstand home">
          <LampLockup size={30} className={styles.lockup} title="" />
          <LampMark size={26} className={styles.mark} />
        </NavLink>
        <nav aria-label="Main" className={styles.nav}>
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeSwitch />
      </header>
      <main className={styles.main} id="main">
        <Outlet />
      </main>
    </div>
  );
}

function ThemeSwitch() {
  const uiMode = useSettings((s) => s.uiMode);
  const set = useSettings((s) => s.set);
  return (
    <div className={styles.theme} role="radiogroup" aria-label="Appearance">
      {MODES.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={uiMode === mode}
          aria-label={label}
          title={label}
          className={styles.themeBtn}
          onClick={() => void set('uiMode', mode)}
        >
          <Icon size={16} strokeWidth={1.5} aria-hidden />
        </button>
      ))}
    </div>
  );
}
