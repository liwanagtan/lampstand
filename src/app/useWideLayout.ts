import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 1101px)';
const subscribe = (change: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
};

/** Adjacent reading panels only when both the text and panel have room. */
export function useWideLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
