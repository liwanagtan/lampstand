import { cx } from '@/design-system/components';
import styles from './Ember.module.css';

export type EmberPose = 'hello' | 'look' | 'joy';

const BODY =
  'M80 14 C 104 54 132 80 132 122 C 132 156 108 180 80 180 C 52 180 28 156 28 122 C 28 90 52 72 62 44 C 66 60 72 68 78 70 C 76 52 76 34 80 14 Z';
const CORE =
  'M80 90 C 94 108 108 120 108 140 C 108 158 96 170 80 170 C 64 170 52 158 52 140 C 52 124 66 114 80 90 Z';
const LEAN_BODY =
  'M92 12 C 110 54 134 80 132 122 C 132 156 108 180 80 180 C 52 180 28 156 28 122 C 28 90 56 74 66 46 C 70 60 76 68 82 70 C 82 50 84 32 92 12 Z';
const LEAN_CORE =
  'M82 90 C 96 108 108 120 108 140 C 108 158 96 170 80 170 C 64 170 52 158 52 140 C 52 124 68 114 82 90 Z';
const SPARKS: [number, number, number][] = [
  [30, 80, 0],
  [132, 70, 0.6],
  [114, 40, 1.2],
  [46, 46, 1.8],
];

/**
 * Ember, the tour's guide: the Lampstand flame with a face (design canvas, Meet Ember).
 * Hello waves to open the tour, Look leans toward the spotlight, Joy ends it. Only Ember
 * moves; reduced motion holds it in its pose.
 */
export function Ember({
  pose,
  size,
  label,
  className,
}: {
  pose: EmberPose;
  size: number;
  /** Omit when the words beside Ember already say it. */
  label?: string;
  className?: string;
}) {
  const lean = pose === 'look';
  return (
    <svg
      viewBox="0 0 160 190"
      width={(size * 160) / 190}
      height={size}
      className={cx(styles.ember, className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <ellipse className={styles.glow} cx="80" cy="118" rx="64" ry="64" />
      {pose === 'joy' &&
        SPARKS.map(([cx, cy, delay]) => (
          <circle
            key={cx}
            className={styles.spark}
            cx={cx}
            cy={cy}
            r="4"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      <g className={styles.body}>
        <path className={styles.flame} d={lean ? LEAN_BODY : BODY} />
        <path className={styles.core} d={lean ? LEAN_CORE : CORE} />
        {lean ? (
          <>
            <g className={styles.eyes}>
              <ellipse className={styles.ink} cx="72" cy="126" rx="7" ry="9" />
              <ellipse className={styles.ink} cx="100" cy="126" rx="7" ry="9" />
              <circle className={styles.shine} cx="75" cy="122" r="2.4" />
              <circle className={styles.shine} cx="103" cy="122" r="2.4" />
            </g>
            <ellipse className={styles.ink} cx="86" cy="148" rx="6" ry="7" />
          </>
        ) : (
          <>
            <path className={styles.line} d="M58 124 Q 66 116 74 124 M86 124 Q 94 116 102 124" />
            <path className={styles.ink} d="M66 140 Q 80 156 94 140 Z" />
            <ellipse className={styles.cheek} cx="54" cy="138" rx="7" ry="4" />
            <ellipse className={styles.cheek} cx="106" cy="138" rx="7" ry="4" />
          </>
        )}
      </g>
      {pose === 'hello' && <path className={styles.wave} d="M128 110 C 140 98 146 84 144 72" />}
    </svg>
  );
}
