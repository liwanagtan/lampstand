import * as RMenu from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Menu.module.css';

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  onSelect: () => void;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export interface MenuProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end' | 'center';
  label?: string;
}

export function Menu({ trigger, items, align = 'end', label }: MenuProps) {
  return (
    <RMenu.Root>
      <RMenu.Trigger asChild>{trigger}</RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content className={styles.content} align={align} sideOffset={6} aria-label={label}>
          {items.map((item, i) => (
            <div key={i}>
              {item.separatorBefore && <RMenu.Separator className={styles.separator} />}
              <RMenu.Item
                className={cx(styles.item)}
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                {item.icon && <span className={styles.icon}>{item.icon}</span>}
                <span className={styles.label}>{item.label}</span>
                {item.shortcut && <kbd className={styles.shortcut}>{item.shortcut}</kbd>}
              </RMenu.Item>
            </div>
          ))}
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}
