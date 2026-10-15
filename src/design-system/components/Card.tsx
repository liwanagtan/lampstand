import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
  children?: ReactNode;
}

export function Card({ interactive, padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        styles.card,
        interactive && styles.interactive,
        padded && styles.padded,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
