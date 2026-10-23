import { useEffect, useSyncExternalStore } from 'react';
import { colors, type ColorScheme } from '@/design-system/tokens';
import type { UiMode } from '@/schema/common';
import { useSettings } from './settingsStore';

const motionQuery = '(prefers-reduced-motion: reduce)';

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mql = window.matchMedia?.(query);
    mql?.addEventListener('change', cb);
    return () => mql?.removeEventListener('change', cb);
  };
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

/** Dark/System appearance is paused until the owner explicitly re-enables it. */
export function resolveScheme(_mode: UiMode, _systemDark: boolean): ColorScheme {
  return 'light';
}

export function useColorScheme(_preferDark = false): ColorScheme {
  return 'light';
}

export function useReducedMotion(): boolean {
  const setting = useSettings((s) => s.reduceMotion);
  const os = useMediaQuery(motionQuery);
  return setting || os;
}

/** Applies the theme and reduce-motion flags to <html>. */
export function useApplyDocumentTheme(preferDark = false): void {
  const scheme = useColorScheme(preferDark);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = scheme;
    el.dataset.reduceMotion = String(reduced);
    statusBar.base = colors[scheme].bg;
    paintStatusBar();
  }, [scheme, reduced]);
}

// Phones: the status bar matches the screen under it — the app's ground in either theme, or the
// ink of the landing and Welcome while they show.
const statusBar: { base: string; override: string | null } = {
  base: colors.light.bg,
  override: null,
};
function paintStatusBar() {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', statusBar.override ?? statusBar.base);
}

/** Colours the phone's status bar while this screen shows. */
export function useStatusBarColor(color: string): void {
  useEffect(() => {
    statusBar.override = color;
    paintStatusBar();
    return () => {
      statusBar.override = null;
      paintStatusBar();
    };
  }, [color]);
}
