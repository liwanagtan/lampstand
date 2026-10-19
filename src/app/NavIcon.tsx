import { useEffect, useRef, useState } from 'react';
import type { AnimationItem, LottiePlayer } from 'lottie-web';
import { useReducedMotion } from '@/features/settings/theme';
import styles from './NavIcon.module.css';

/**
 * Nav icons (design system › Lottie): a static icon paints at once; after the first paint the
 * Lottie player (light SVG build, its own chunk) loads and takes over. Selecting plays the file
 * forward, deselecting plays it back; with reduced motion it jumps to the end frame. The ink
 * layer follows currentColor (see NavIcon.module.css); the flame layer stays gold.
 */
export type NavGlyph = 'today' | 'bible' | 'plans' | 'screen' | 'search';

let player: Promise<LottiePlayer> | null = null;
const loadPlayer = () =>
  (player ??= import('lottie-web/build/player/lottie_light').then(
    (m) => (m as unknown as { default: LottiePlayer }).default,
  ));

const data = new Map<NavGlyph, Promise<unknown>>();
function loadData(glyph: NavGlyph): Promise<unknown> {
  let p = data.get(glyph);
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}lottie/icons/${glyph}.json`).then((r) => {
      if (!r.ok) throw new Error(`lottie ${glyph}: ${r.status}`);
      return r.json() as Promise<unknown>;
    });
    p.catch(() => data.delete(glyph));
    data.set(glyph, p);
  }
  return p;
}

const whenIdle = (fn: () => void): (() => void) => {
  // Safari has no requestIdleCallback; a short timeout keeps the first paint free there too.
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 300);
  return () => clearTimeout(id);
};

export function NavIcon({
  glyph,
  active,
  size = 24,
}: {
  glyph: NavGlyph;
  active: boolean;
  size?: number;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const activeNow = useRef(active);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    // Unit tests (jsdom) keep the static icon: no player, no fetch.
    if (import.meta.env.MODE === 'test') return;
    let cancelled = false;
    const cancelIdle = whenIdle(() => {
      Promise.all([loadPlayer(), loadData(glyph)])
        .then(([lottie, json]) => {
          if (cancelled || !box.current) return;
          const a = lottie.loadAnimation({
            container: box.current,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            // Each icon mutates its own copy of the shared JSON.
            animationData: structuredClone(json),
          });
          anim.current = a;
          a.addEventListener('DOMLoaded', () => {
            if (cancelled) return;
            a.goToAndStop(activeNow.current ? a.totalFrames - 1 : 0, true);
            setReady(true);
          });
        })
        // No player or no file (offline before first cache): the static icon stays.
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
      cancelIdle();
      anim.current?.destroy();
      anim.current = null;
      setReady(false);
    };
  }, [glyph]);

  useEffect(() => {
    activeNow.current = active;
    const a = anim.current;
    if (!a || !ready) return;
    if (reduced) {
      a.goToAndStop(active ? a.totalFrames - 1 : 0, true);
      return;
    }
    a.setDirection(active ? 1 : -1);
    a.play();
  }, [active, ready, reduced]);

  return (
    <span
      className={styles.icon}
      style={{ width: size, height: size }}
      data-ready={ready || undefined}
      aria-hidden
    >
      <StaticGlyph glyph={glyph} active={active} />
      <span ref={box} className={styles.lottie} />
    </span>
  );
}

const ST = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
const GOLD = 'var(--color-accent)';

/** The design system's still icons: the rest and active frames of the Lottie files. */
function StaticGlyph({ glyph, active }: { glyph: NavGlyph; active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={styles.static}>
      {glyph === 'today' && (
        <>
          {active && <path d="M15 34 A9 9 0 0 1 33 34 Z" fill={GOLD} />}
          <path
            {...ST}
            d={
              active
                ? 'M15 34 A9 9 0 0 1 33 34 M6 34 H42 M14 40 H34 M24 12 V17 M11 19 L13.5 21.5 M37 19 L34.5 21.5'
                : 'M17.5 34 Q24 26 30.5 34 M6 34 H42 M14 40 H34'
            }
          />
        </>
      )}
      {glyph === 'bible' && (
        <>
          {active && <path d="M6 12 L24 16 L24 38 L6 34 Z" fill={GOLD} />}
          <path {...ST} d="M6 12 L24 16 L24 38 L6 34 Z M42 12 L24 16 L24 38 L42 34 Z" />
        </>
      )}
      {glyph === 'plans' && (
        <>
          {active && (
            <path d="M6 8 H16 V18 H6 Z M6 19 H16 V29 H6 Z M6 30 H16 V40 H6 Z" fill={GOLD} />
          )}
          <path {...ST} d="M21 13 H42 M21 24 H38 M21 35 H40" />
          <rect {...ST} x="6" y="8" width="10" height="10" rx="2.5" />
          <rect {...ST} x="6" y="19" width="10" height="10" rx="2.5" />
          <rect {...ST} x="6" y="30" width="10" height="10" rx="2.5" />
        </>
      )}
      {glyph === 'screen' && (
        <>
          <path {...ST} d="M6 9 H42 V33 H6 Z M24 33 V39 M17 39 H31" />
          <path {...ST} d={active ? 'M15 16 H33' : 'M13 16 H35 M15 22 H33'} />
          {active && <path {...ST} stroke={GOLD} d="M14 22 H34" />}
        </>
      )}
      {glyph === 'search' && (
        <>
          <circle {...ST} cx="21" cy="21" r="12" />
          <path {...ST} d="M30 30 L40 40" />
          {active && <path {...ST} stroke={GOLD} d="M14.5 19 A7 7 0 0 1 19 14.5" />}
        </>
      )}
    </svg>
  );
}
