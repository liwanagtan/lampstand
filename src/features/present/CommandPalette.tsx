import * as RDialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import type { ReactNode } from 'react';
import { Kbd } from '@/design-system/components';
import styles from './CommandPalette.module.css';

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  icon?: ReactNode;
  keywords?: string[];
  run: () => void;
}

/** Ctrl+K app command palette (PRD §7.8). */
export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  commands: PaletteCommand[];
}) {
  const groups = [...new Set(commands.map((c) => c.group))];
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className={styles.overlay} />
        <RDialog.Content className={styles.content} aria-describedby={undefined}>
          <RDialog.Title className="visually-hidden">Command palette</RDialog.Title>
          <Command label="Command palette" loop>
            <Command.Input
              className={styles.input}
              placeholder="Type a command or slide number…"
              autoFocus
            />
            <Command.List className={styles.list}>
              <Command.Empty className={styles.empty}>No matching commands.</Command.Empty>
              {groups.map((g) => (
                <Command.Group key={g} heading={g} className={styles.group}>
                  {commands
                    .filter((c) => c.group === g)
                    .map((c) => (
                      <Command.Item
                        key={c.id}
                        value={`${c.label} ${c.id}`}
                        keywords={c.keywords}
                        className={styles.item}
                        onSelect={() => {
                          onOpenChange(false);
                          c.run();
                        }}
                      >
                        {c.icon && <span className={styles.icon}>{c.icon}</span>}
                        <span className={styles.label}>{c.label}</span>
                        {c.shortcut && <Kbd>{c.shortcut}</Kbd>}
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
