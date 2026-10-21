import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton, Sheet } from '@/design-system/components';
import { fromOsis } from '@/features/bible/ref';
import { STUDY_NOTES_CREDIT, type StudyNote } from './studyNotes';
import { useOpenInReader } from './useOpenInReader';
import styles from './StudyNotesSheet.module.css';

/**
 * Tyndale's notes in a sheet: for a verse or a passage, or a book's introduction. The markup was
 * reduced at build time to paragraphs, emphasis and reader links (scripts/build-notes.ts).
 */
export function StudyNotesSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  notes,
  html,
  inline = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  notes?: StudyNote[];
  /** A book introduction instead of notes. */
  html?: string[];
  inline?: boolean;
}) {
  const openInReader = useOpenInReader();
  // Cross-references open in the reader.
  const follow = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('a[data-ref]');
    const r = a?.dataset.ref ? fromOsis(a.dataset.ref) : null;
    if (!r) return;
    e.preventDefault();
    onOpenChange(false);
    openInReader(r);
  };
  const blocks = html ?? notes?.map((n) => n.html) ?? [];
  const content = (
    <>
      <div className={styles.notes} onClick={follow}>
        {blocks.length ? (
          blocks.map((b, i) => (
            <div key={i} className={styles.note} dangerouslySetInnerHTML={{ __html: b }} />
          ))
        ) : (
          <p className={styles.muted}>No study notes for this passage.</p>
        )}
      </div>
      <p className={styles.credit}>{STUDY_NOTES_CREDIT}</p>
    </>
  );
  if (inline) {
    return open ? (
      <StudyPanel title={title} eyebrow={eyebrow} onClose={() => onOpenChange(false)}>
        {content}
      </StudyPanel>
    ) : null;
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow={eyebrow} title={title}>
      {content}
    </Sheet>
  );
}

function StudyPanel({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    body.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <aside
      className={styles.panel}
      aria-label="Study notes"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className={styles.panelHeader}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <IconButton label="Close study notes" icon={<X size={18} />} onClick={onClose} />
      </header>
      <div className={styles.panelBody} ref={body} tabIndex={-1}>
        {children}
      </div>
    </aside>
  );
}
