// A light tap felt in the hand on phones that support it (Android); silent elsewhere and when
// motion is reduced (docs/PRD-ADDENDUM-GROW.md, milestone 27).

const PATTERNS = { tap: 6, select: 10, success: [12, 60, 18] } as const;

export function haptic(kind: keyof typeof PATTERNS = 'tap'): void {
  try {
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    if (document.documentElement.dataset.reduceMotion === 'true') return;
    navigator.vibrate?.(PATTERNS[kind] as number | number[]);
  } catch {
    // Haptics are a nicety only.
  }
}
