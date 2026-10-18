import type { MouseEvent } from 'react';
import { Sheet } from '@/design-system/components';
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  notes?: StudyNote[];
  /** A book introduction instead of notes. */
  html?: string[];
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange} eyebrow={eyebrow} title={title}>
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
    </Sheet>
  );
}
