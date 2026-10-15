import * as Switch from '@radix-ui/react-switch';
import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: ToggleProps) {
  const id = useId();
  return (
    <div className={cx(styles.row, disabled && styles.disabled, className)}>
      <div className={styles.text}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      <Switch.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={styles.switch}
      >
        <Switch.Thumb className={styles.thumb} />
      </Switch.Root>
    </div>
  );
}
