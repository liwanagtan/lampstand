import * as RTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Tabs.module.css';

export interface TabItem<V extends string = string> {
  value: V;
  label: ReactNode;
  badge?: ReactNode;
  content: ReactNode;
}

export interface TabsProps<V extends string = string> {
  items: TabItem<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  className?: string;
  label?: string;
  fill?: boolean;
}

export function Tabs<V extends string = string>({
  items,
  value,
  defaultValue,
  onChange,
  className,
  label,
  fill,
}: TabsProps<V>) {
  return (
    <RTabs.Root
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={(v) => onChange?.(v as V)}
      className={cx(styles.root, fill && styles.fill, className)}
    >
      <RTabs.List className={styles.list} aria-label={label}>
        {items.map((t) => (
          <RTabs.Trigger key={t.value} value={t.value} className={styles.trigger}>
            {t.label}
            {t.badge !== undefined && <span className={styles.badge}>{t.badge}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((t) => (
        // Kept mounted so every trigger's aria-controls points at a real panel.
        <RTabs.Content key={t.value} value={t.value} className={styles.content} forceMount>
          {t.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
