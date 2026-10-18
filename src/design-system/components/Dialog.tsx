import * as RDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cx } from './cx';
import { IconButton } from './Button';
import styles from './Dialog.module.css';
import { useSwipeToClose } from './useSwipeToClose';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  useSwipeToClose(content, () => onOpenChange(false));
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className={styles.overlay} />
        <RDialog.Content ref={setContent} className={cx(styles.content, styles[size])}>
          <header className={styles.header}>
            <div>
              <RDialog.Title className={styles.title}>{title}</RDialog.Title>
              {description ? (
                <RDialog.Description className={styles.description}>
                  {description}
                </RDialog.Description>
              ) : (
                <RDialog.Description className="visually-hidden">{title}</RDialog.Description>
              )}
            </div>
            <RDialog.Close asChild>
              <IconButton label="Close" icon={<X size={18} />} size="sm" />
            </RDialog.Close>
          </header>
          {children && (
            <div className={styles.body} data-sheet-body>
              {children}
            </div>
          )}
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export const DialogClose = RDialog.Close;
