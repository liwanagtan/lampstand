import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Chip.module.css';

export type ChipTone = 'neutral' | 'accent' | 'success' | 'warning';

interface ChipBaseProps {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Chip({ tone = 'neutral', icon, children, className }: ChipBaseProps) {
  return (
    <span className={cx(styles.chip, styles[tone], className)}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
}

export function ChipButton({
  tone = 'neutral',
  icon,
  children,
  className,
  ...rest
}: ChipBaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(styles.chip, styles.interactive, styles[tone], className)}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </button>
  );
}
