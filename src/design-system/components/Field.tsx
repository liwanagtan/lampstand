import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';
import styles from './Field.module.css';

interface FieldFrameProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  count?: number;
  maxLength?: number;
  hideLabel?: boolean;
  children: ReactNode;
}

/** Shows the character counter once the value reaches 80% of its limit (PRD §7.3). */
export function CharCount({ count, max }: { count: number; max: number }) {
  if (count < max * 0.8) return null;
  const over = count > max;
  return (
    <span
      className={cx(styles.count, over ? styles.over : count >= max && styles.full)}
      aria-live="polite"
    >
      {count}/{max}
    </span>
  );
}

function FieldFrame({
  id,
  label,
  hint,
  error,
  count,
  maxLength,
  hideLabel,
  children,
}: FieldFrameProps) {
  return (
    <div className={cx(styles.field, hideLabel && styles.noLabel)}>
      {(label || maxLength) && (
        <div className={styles.labelRow}>
          {label && (
            <label htmlFor={id} className={cx(styles.label, hideLabel && 'visually-hidden')}>
              {label}
            </label>
          )}
          {maxLength !== undefined && count !== undefined && (
            <CharCount count={count} max={maxLength} />
          )}
        </div>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} className={styles.error}>
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  /** Soft limit: shows a counter near the limit but does not block typing. */
  limit?: number;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, hideLabel, limit, icon, id, className, value, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const count = typeof value === 'string' ? value.length : undefined;
  return (
    <FieldFrame
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      count={count}
      maxLength={limit}
    >
      <div className={cx(styles.inputWrap, icon && styles.withIcon)}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          ref={ref}
          id={fieldId}
          value={value}
          className={cx(styles.control, error && styles.invalid, className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          {...rest}
        />
      </div>
    </FieldFrame>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  hideLabel?: boolean;
  limit?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, hideLabel, limit, id, className, value, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const count = typeof value === 'string' ? value.length : undefined;
  return (
    <FieldFrame
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      count={count}
      maxLength={limit}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        value={value}
        className={cx(styles.control, styles.textarea, error && styles.invalid, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        {...rest}
      />
    </FieldFrame>
  );
});
