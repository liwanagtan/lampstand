import { NavLink, Outlet } from 'react-router-dom';
import { LibraryBig, Monitor, Moon, Settings, Sun, Upload, type LucideIcon } from 'lucide-react';
import { LampMark } from '@/design-system/LampMark';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useSettings } from '@/features/settings/settingsStore';
import type { UiMode } from '@/schema/common';
import styles from './AppShell.module.css';

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Library', icon: LibraryBig, end: true },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings },
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
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <LampMark size={28} className={styles.mark} />
          <span className={styles.wordmark}>Lampstand</span>
        </div>
        <nav aria-label="Main" className={styles.nav}>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeSwitch />
      </aside>
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
