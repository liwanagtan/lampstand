import type { CSSProperties } from 'react';
import { cx } from './cx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, radius = 'sm', className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: `var(--radius-${radius})` }}
    />
  );
}
