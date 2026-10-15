import { useEffect, useRef } from 'react';

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Normalises a key event to names like "ArrowRight", "Alt+ArrowRight", "Shift+?", "b". */
export function keyName(e: KeyboardEvent): string {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && (key.length > 1 || e.ctrlKey || e.metaKey || e.altKey)) parts.push('Shift');
  parts.push(key === ' ' ? 'Space' : key);
  return parts.join('+');
}

/**
 * Window-level shortcuts for the control screen. Ignored while typing in a field or while a
 * dialog is open, except keys listed in `always`.
 */
export function useShortcuts(map: ShortcutMap, always: string[] = []): void {
  const ref = useRef(map);
  const alwaysRef = useRef(always);
  useEffect(() => {
    ref.current = map;
    alwaysRef.current = always;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const name = keyName(e);
      const handler = ref.current[name];
      if (!handler) return;
      const dialogOpen = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"]',
      );
      if (!alwaysRef.current.includes(name) && (isTyping(e.target) || dialogOpen)) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
