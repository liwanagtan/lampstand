import type { ComponentProps, ReactNode } from 'react';
import { BookText, Bookmark, Copy, Eraser, Languages, NotebookPen, X } from 'lucide-react';
import { IconButton, Tooltip, cx, toast } from '@/design-system/components';
import type { MarkRecord } from '@/db/types';
import {
  formatRef,
  fromOsis,
  toOsis,
  verseCountInRange,
  type RefRange,
} from '@/features/bible/ref';
import { haptic } from '@/app/haptics';
import { noteTipEvent } from '@/features/tips/tipStore';
import { useSettings } from '@/features/settings/settingsStore';
import {
  HIGHLIGHT_COLORS,
  setHighlight,
  toggleBookmark,
  versesInChapter,
  type ChapterMarks,
} from '../marks';
import type { Selection } from '../readerStore';
import styles from './VerseActions.module.css';

/**
 * What you can do with the verses you tapped: highlight, bookmark, note, study notes, word study,
 * copy. The
 * same bar in the Bible reader and in plan readings; a bottom sheet on phones.
 */
export function VerseActions({
  range,
  selection,
  marks,
  copyText,
  studyVerse,
  onStudy,
  onWords,
  extra,
  onNote,
  onClose,
  pinned = false,
}: {
  range: RefRange;
  /** The selected verses in the range's first chapter (what marks are keyed by). */
  selection: Selection;
  marks: ChapterMarks;
  /** The selected text as it should be copied. */
  copyText: () => string | null;
  /** The first selected verse with Tyndale study notes, if any. */
  studyVerse?: number;
  onStudy?: (verse: number) => void;
  /** Word study on the first selected verse. */
  onWords?: () => void;
  extra?: ReactNode;
  /** Add or edit the note on this selection (the page owns the note dialog). */
  onNote: (target: { range: RefRange; note: MarkRecord | null }) => void;
  onClose: () => void;
  /** Pinned to the screen rather than the reader's pane (plan readings scroll the whole page). */
  pinned?: boolean;
}) {
  const marksOn = useSettings((s) => s.features.marks);
  const { book, chapter } = range.start;
  const rangeId = toOsis(range);
  const verseTotal = verseCountInRange(range);
  const bookmarked = Boolean(marks.bookmarks.get(selection.start)?.some((m) => m.ref === rangeId));
  // The note on exactly this selection; for a single verse, a note that covers it. (On phones the
  // margin, with its note icons, is hidden: the selection bar is the way into notes.)
  const existingNote =
    marks.notes.get(selection.end)?.find((m) => m.ref === rangeId) ??
    (selection.start === selection.end
      ? [...marks.notes.values()].flat().find((m) => {
          const r = fromOsis(m.ref);
          if (!r) return false;
          const { start, end } = versesInChapter(r, book, chapter);
          return start <= selection.start && selection.start <= end;
        })
      : undefined);

  const copy = async () => {
    const text = copyText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `Copied ${formatRef(range)}`, tone: 'success' });
    } catch {
      toast({ title: "Couldn't copy to the clipboard.", tone: 'warning' });
    }
  };

  return (
    <>
      <div
        className={cx(styles.selectionBar, pinned && styles.pinned)}
        role="toolbar"
        aria-label="Selected verses"
      >
        <span className={styles.selectionLabel}>
          {formatRef(range)}
          {verseTotal > 1 && <span className={styles.selectionCount}> · {verseTotal} verses</span>}
        </span>
        {marksOn && (
          <div className={styles.swatches} role="group" aria-label="Highlight">
            {HIGHLIGHT_COLORS.map(({ color, label }) => {
              const on = allHighlighted(marks, selection, color);
              return (
                <Tooltip key={color} content={`Highlight ${label.toLowerCase()}`}>
                  <button
                    type="button"
                    className={styles.swatch}
                    data-color={color}
                    aria-label={`Highlight ${label.toLowerCase()}`}
                    aria-pressed={on}
                    onClick={() => {
                      void setHighlight(range, on ? null : color);
                      haptic('select');
                      if (!on) void noteTipEvent('highlighted');
                    }}
                  />
                </Tooltip>
              );
            })}
            {anyHighlighted(marks, selection) && (
              <Tooltip content="Remove highlight">
                <IconButton
                  label="Remove highlight"
                  icon={<Eraser size={15} />}
                  size="sm"
                  onClick={() => void setHighlight(range, null)}
                />
              </Tooltip>
            )}
          </div>
        )}
        <div className={styles.barActions}>
          {marksOn && (
            <>
              <Tooltip content={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
                <BarButton
                  label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                  text={bookmarked ? 'Saved' : 'Bookmark'}
                  icon={<Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} />}
                  aria-pressed={bookmarked}
                  onClick={() =>
                    void toggleBookmark(range).then((on) => {
                      haptic('select');
                      toast({
                        title: on ? `Bookmarked ${formatRef(range)}` : 'Bookmark removed',
                        tone: on ? 'success' : 'neutral',
                      });
                    })
                  }
                />
              </Tooltip>
              <Tooltip content={existingNote ? 'Edit note' : 'Add a note'}>
                <BarButton
                  label={existingNote ? 'Edit note' : 'Add a note'}
                  text="Note"
                  icon={<NotebookPen size={18} />}
                  onClick={() => onNote({ range, note: existingNote ?? null })}
                />
              </Tooltip>
            </>
          )}
          {studyVerse !== undefined && onStudy && (
            <Tooltip content="Study notes">
              <BarButton
                label={`Study notes on verse ${studyVerse}`}
                text="Study"
                icon={<BookText size={18} />}
                onClick={() => onStudy(studyVerse)}
              />
            </Tooltip>
          )}
          {onWords && (
            <Tooltip content="Word study">
              <BarButton
                label={`Word study on verse ${selection.start}`}
                text="Words"
                icon={<Languages size={18} />}
                onClick={onWords}
              />
            </Tooltip>
          )}
          <Tooltip content="Copy">
            <BarButton
              label="Copy"
              text="Copy"
              icon={<Copy size={18} />}
              onClick={() => void copy()}
            />
          </Tooltip>
          {extra}
        </div>
        <IconButton
          label="Clear selection"
          icon={<X size={18} />}
          size="sm"
          className={styles.clear}
          onClick={onClose}
        />
      </div>
    </>
  );
}

/** A selection action: an icon on laptops; on phones a thumb-sized button with its name. */
function BarButton({
  label,
  text,
  icon,
  ...rest
}: { label: string; text: string; icon: ReactNode } & ComponentProps<'button'>) {
  return (
    <button type="button" className={styles.barButton} aria-label={label} {...rest}>
      {icon}
      <span className={styles.barText} aria-hidden>
        {text}
      </span>
    </button>
  );
}

function allHighlighted(marks: ChapterMarks, s: Selection, color: string): boolean {
  for (let v = s.start; v <= s.end; v++) if (marks.highlights.get(v) !== color) return false;
  return true;
}

function anyHighlighted(marks: ChapterMarks, s: Selection): boolean {
  for (let v = s.start; v <= s.end; v++) if (marks.highlights.has(v)) return true;
  return false;
}
