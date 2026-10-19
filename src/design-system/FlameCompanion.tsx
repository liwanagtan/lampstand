import type { CSSProperties } from 'react';
import { cx } from './components';
import styles from './FlameCompanion.module.css';

export type FlameMood = 'idle' | 'celebrate' | 'rest';

const BODY = 'M80 18 C100 44 110 64 110 92 A30 30 0 0 1 50 92 C50 64 60 44 80 18 Z';
const CORE = 'M80 62 C89 74 94 82 94 96 A14 14 0 0 1 66 96 C66 82 71 74 80 62 Z';
const SPARKS: [number, number][] = [
  [-46, -24],
  [46, -24],
  [-30, -54],
  [30, -54],
  [0, -64],
];

/**
 * The flame companion (design system › FlameCompanion): the mark's flame with a face. Idle on
 * Today, celebrating when a day is done, resting when you're caught up. Decorative: it never
 * speaks and never covers Scripture. Reduced motion holds it still.
 */
export function FlameCompanion({
  mood = 'idle',
  size = 120,
  className,
}: {
  mood?: FlameMood;
  size?: number;
  className?: string;
}) {
  const motion = mood === 'celebrate' ? styles.hop : mood === 'rest' ? styles.rest : styles.flicker;
  return (
    <svg
      viewBox="40 14 80 126"
      width={(size * 80) / 126}
      height={size}
      className={cx(styles.flame, className)}
      aria-hidden
    >
      <ellipse className={styles.pool} cx="80" cy="128" rx="34" ry="6" />
      {mood === 'celebrate' &&
        SPARKS.map(([dx, dy], i) => (
          <circle
            key={i}
            className={styles.spark}
            cx="80"
            cy="60"
            r={i < 2 ? 4 : 3}
            style={
              {
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
                fill: i % 2 ? 'var(--color-accent-soft)' : 'var(--color-accent)',
              } as CSSProperties
            }
          />
        ))}
      <g className={motion}>
        <path className={styles.body} d={BODY} />
        <path className={styles.core} d={CORE} />
        {mood === 'celebrate' ? (
          <>
            <path className={styles.line} d="M67 96 Q71 90 75 96 M85 96 Q89 90 93 96" />
            <path className={styles.face} d="M74 103 Q80 111 86 103 Z" />
          </>
        ) : mood === 'rest' ? (
          <path className={styles.line} d="M67 96 Q71 100 75 96 M85 96 Q89 100 93 96" />
        ) : (
          <>
            <g className={styles.blink}>
              <ellipse className={styles.face} cx="71" cy="94" rx="3.6" ry="4.6" />
              <ellipse className={styles.face} cx="89" cy="94" rx="3.6" ry="4.6" />
            </g>
            <path className={styles.line} d="M75 104 Q80 108 85 104" />
          </>
        )}
      </g>
    </svg>
  );
}
