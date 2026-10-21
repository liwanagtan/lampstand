import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 640px)';

/** True at phone width (the same breakpoint as the tab bar). */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia?.(QUERY);
      m?.addEventListener('change', cb);
      return () => m?.removeEventListener('change', cb);
    },
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  );
}
