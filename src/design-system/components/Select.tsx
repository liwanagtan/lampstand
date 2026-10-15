import * as RSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import styles from './Select.module.css';
import fieldStyles from './Field.module.css';

export interface SelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface SelectProps<V extends string = string> {
  value: V;
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  label?: ReactNode;
  hideLabel?: boolean;
  placeholder?: string;
  disabled?: boolean;
  size?: 'md' | 'sm';
  className?: string;
  'aria-label'?: string;
}

export function Select<V extends string = string>({
  value,
  onChange,
  options,
  label,
  hideLabel,
  placeholder,
  disabled,
  size = 'md',
  className,
  'aria-label': ariaLabel,
}: SelectProps<V>) {
  const id = useId();
  return (
    <div className={cx(fieldStyles.field, className)}>
      {label && (
        <label htmlFor={id} className={cx(fieldStyles.label, hideLabel && 'visually-hidden')}>
          {label}
        </label>
      )}
      <RSelect.Root value={value} onValueChange={(v) => onChange(v as V)} disabled={disabled}>
        <RSelect.Trigger
          id={id}
          className={cx(styles.trigger, styles[size])}
          aria-label={ariaLabel}
        >
          <RSelect.Value placeholder={placeholder} />
          <RSelect.Icon className={styles.chevron}>
            <ChevronDown size={16} aria-hidden />
          </RSelect.Icon>
        </RSelect.Trigger>
        <RSelect.Portal>
          <RSelect.Content className={styles.content} position="popper" sideOffset={6}>
            <RSelect.Viewport className={styles.viewport}>
              {options.map((o) => (
                <RSelect.Item
                  key={o.value}
                  value={o.value}
                  disabled={o.disabled}
                  className={styles.item}
                >
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                  {o.description && <span className={styles.description}>{o.description}</span>}
                  <RSelect.ItemIndicator className={styles.indicator}>
                    <Check size={16} aria-hidden />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </div>
  );
}
