import { useEffect, useSyncExternalStore } from 'react';
import type { ColorScheme } from '@/design-system/tokens';
import type { UiMode } from '@/schema/common';
import { useSettings } from './settingsStore';

const darkQuery = '(prefers-color-scheme: dark)';
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

export function resolveScheme(mode: UiMode, systemDark: boolean): ColorScheme {
  if (mode === 'system') return systemDark ? 'dark' : 'light';
  return mode;
}

/** Resolved color scheme for the app UI. `preferDark` makes "System" resolve to dark (control screen, PRD §8). */
export function useColorScheme(preferDark = false): ColorScheme {
  const uiMode = useSettings((s) => s.uiMode);
  const systemDark = useMediaQuery(darkQuery);
  if (preferDark && uiMode === 'system') return 'dark';
  return resolveScheme(uiMode, systemDark);
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
    // Phones: the status bar matches the app's top bar in either theme.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', scheme === 'dark' ? '#161B22' : '#FFFFFF');
  }, [scheme, reduced]);
}
