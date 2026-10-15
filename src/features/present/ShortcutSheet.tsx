import { Dialog, Kbd } from '@/design-system/components';
import { SHORTCUTS } from './shortcuts';
import styles from './ShortcutSheet.module.css';

export function ShortcutSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Presentation clickers (PageDown / PageUp or arrow keys) work with no setup."
      size="lg"
    >
      <table className={styles.table}>
        <tbody>
          {SHORTCUTS.map((s, i) => (
            <tr key={i}>
              <td className={styles.keys}>
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </td>
              <td>{s.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}
