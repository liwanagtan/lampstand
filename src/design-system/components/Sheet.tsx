import * as RDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { IconButton } from './Button';
import { cx } from './cx';
import styles from './Sheet.module.css';
import { useSwipeToClose } from './useSwipeToClose';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Small text above the title. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Buttons beside the close button. */
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

/** A panel that slides in from the right, keeping the page behind it in place. */
export function Sheet({
  open,
  onOpenChange,
  title,
  eyebrow,
  description,
  actions,
  children,
  footer,
  size = 'md',
}: SheetProps) {
  const body = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState<HTMLDivElement | null>(null);
  useSwipeToClose(content, () => onOpenChange(false));
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className={styles.overlay} />
        <RDialog.Content
          ref={setContent}
          className={cx(styles.content, styles[size])}
          onOpenAutoFocus={(e) => {
            // Focus the field that asked for it, else the content — not the first header button.
            e.preventDefault();
            const target = body.current?.querySelector<HTMLElement>(
              '[autofocus], [data-autofocus]',
            );
            (target ?? body.current)?.focus({ preventScroll: true });
          }}
        >
          <header className={styles.header}>
            <div className={styles.heading}>
              {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
              <RDialog.Title className={styles.title}>{title}</RDialog.Title>
              {description ? (
                <RDialog.Description className={styles.description}>
                  {description}
                </RDialog.Description>
              ) : (
                <RDialog.Description className="visually-hidden">{title}</RDialog.Description>
              )}
            </div>
            <div className={styles.actions}>
              {actions}
              <RDialog.Close asChild>
                <IconButton label="Close" icon={<X size={18} />} size="sm" />
              </RDialog.Close>
            </div>
          </header>
          <div ref={body} className={styles.body} tabIndex={-1} data-sheet-body>
            {children}
          </div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
