import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Menu, Sheet, cx } from '@/design-system/components';
import { useIsPhone } from '@/app/useIsPhone';
import styles from './FilterChip.module.css';

export interface FilterOption<V extends string> {
  value: V;
  label: string;
}

/**
 * A filter as a chip, like a select field: a menu on laptops, a bottom sheet with big options
 * on phones. When set it fills with colour and shows its choice, with × to clear.
 */
export function FilterChip<V extends string>({
  label,
  value,
  empty,
  options,
  onChange,
}: {
  label: string;
  value: V;
  /** The "any" value that means the filter is off. */
  empty: V;
  options: FilterOption<V>[];
  onChange: (v: V) => void;
}) {
  const phone = useIsPhone();
  const [open, setOpen] = useState(false);
  const active = value !== empty;
  const current = options.find((o) => o.value === value);
  const chip = (
    <button
      type="button"
      className={cx(styles.chip, active && styles.active)}
      aria-label={active ? `${label}: ${current?.label}` : label}
      onClick={phone ? () => setOpen(true) : undefined}
    >
      {active ? current?.label : label}
      <ChevronDown size={14} aria-hidden />
    </button>
  );
  return (
    <span className={styles.wrap}>
      {phone ? (
        chip
      ) : (
        <Menu
          trigger={chip}
          align="start"
          label={label}
          items={options.map((o) => ({
            label: o.label,
            icon: o.value === value ? <Check size={14} /> : <span />,
            onSelect: () => onChange(o.value),
          }))}
        />
      )}
      {active && (
        <button
          type="button"
          className={styles.clear}
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => onChange(empty)}
        >
          <X size={14} aria-hidden />
        </button>
      )}
      {phone && (
        <Sheet open={open} onOpenChange={setOpen} title={label}>
          <div className={styles.options} role="radiogroup" aria-label={label}>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={o.value === value}
                className={styles.option}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.value === value && <Check size={18} aria-hidden />}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </span>
  );
}
