import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = new Map<string, number>();

/** Restore the app's scrolling pane on history Back/Forward, including delayed content. */
export function usePageScrollRestoration() {
  const { key } = useLocation();
  const navigation = useNavigationType();
  useLayoutEffect(() => {
    const pane = document.getElementById('main');
    if (!pane) return;
    const target = navigation === 'POP' ? (positions.get(key) ?? 0) : 0;
    let restoring = true;
    let lastPosition = target;
    const save = () => {
      if (!restoring) {
        lastPosition = pane.scrollTop;
        positions.set(key, lastPosition);
      }
    };
    const stop = () => {
      restoring = false;
      observer.disconnect();
      resize?.disconnect();
    };
    const restore = () => {
      if (!restoring) return;
      pane.scrollTo?.({ top: target, behavior: 'instant' });
      if (Math.abs(pane.scrollTop - target) < 1) stop();
    };
    const observer = new MutationObserver(restore);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore);
    observer.observe(pane, { childList: true, subtree: true });
    resize?.observe(pane);
    Array.from(pane.children).forEach((child) => resize?.observe(child));
    restore();
    const timeout = setTimeout(stop, 5000);
    pane.addEventListener('scroll', save, { passive: true });
    pane.addEventListener('wheel', stop, { passive: true });
    pane.addEventListener('touchstart', stop, { passive: true });
    return () => {
      positions.set(key, lastPosition);
      clearTimeout(timeout);
      stop();
      pane.removeEventListener('scroll', save);
      pane.removeEventListener('wheel', stop);
      pane.removeEventListener('touchstart', stop);
      // Keep history memory bounded during long reading sessions.
      if (positions.size > 100) positions.delete(positions.keys().next().value!);
    };
  }, [key, navigation]);
}
