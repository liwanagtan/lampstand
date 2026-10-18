import { useEffect, useRef } from 'react';

const PHONE = '(max-width: 640px)';
const INTERACTIVE = 'button, a, input, textarea, select, [role="tab"], [role="switch"]';

/**
 * Phones: drag a sheet down by its handle, header or footer to close it. A short flick or a
 * long pull closes; anything less springs back. The scrolling body is left alone.
 */
export function useSwipeToClose(node: HTMLElement | null, onClose: () => void): void {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!node) return;
    const sheet = node;
    let start: { y: number; t: number } | null = null;
    const down = (e: PointerEvent) => {
      if (!window.matchMedia(PHONE).matches || e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(INTERACTIVE) || target.closest('[data-sheet-body]')) return;
      start = { y: e.clientY, t: performance.now() };
      sheet.setPointerCapture(e.pointerId);
      sheet.style.transition = 'none';
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      sheet.style.transform = `translateY(${Math.max(0, e.clientY - start.y)}px)`;
    };
    const up = (e: PointerEvent) => {
      if (!start) return;
      const dy = Math.max(0, e.clientY - start.y);
      const speed = dy / Math.max(1, performance.now() - start.t);
      start = null;
      const reduced = document.documentElement.dataset.reduceMotion === 'true';
      sheet.style.transition = reduced ? 'none' : 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
      if (dy > 120 || (speed > 0.6 && dy > 30)) {
        sheet.style.transform = 'translateY(100%)';
        window.setTimeout(() => close.current(), reduced ? 0 : 180);
      } else {
        sheet.style.transform = '';
      }
    };
    sheet.addEventListener('pointerdown', down);
    sheet.addEventListener('pointermove', move);
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', up);
    return () => {
      sheet.removeEventListener('pointerdown', down);
      sheet.removeEventListener('pointermove', move);
      sheet.removeEventListener('pointerup', up);
      sheet.removeEventListener('pointercancel', up);
    };
  }, [node]);
}
