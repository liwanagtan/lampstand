import { useMemo, type MouseEvent, type ReactNode } from 'react';
import { BookText, Bookmark, StickyNote } from 'lucide-react';
import { Tooltip, cx } from '@/design-system/components';
import type { MarkRecord } from '@/db/types';
import type { Passage as PassageText, PassageVerse } from '@/features/bible/passage';
import { formatRef, fromOsis } from '@/features/bible/ref';
import type { ChapterMarks } from '../marks';
import type { ReadingLayout, Selection } from '../readerStore';
import type { StudyNote } from '../studyNotes';
import type { WordSpan } from '../wordStudy';
import { WordRuns } from '../WordStudyPanel';
import styles from './Passage.module.css';

export type { ReadingLayout };

export interface PassageProps {
  /** Read: the text as paragraphs, numbers inline. Study: a verse per row, with a margin. */
  layout: ReadingLayout;
  /** The verses to show, in order (already limited to the passage's range). */
  verses: PassageVerse[];
  /** A second translation beside each verse (Study only). */
  second?: PassageText | null;
  marks: ChapterMarks;
  selection: Selection | null;
  onSelect: (verse: number, extend: boolean) => void;
  /** Open a note from its mark (Study margin). */
  onOpenNote?: (note: MarkRecord) => void;
  /** Tyndale study notes that start at each verse (Study margin). */
  studyByVerse?: Map<number, StudyNote[]>;
  onOpenStudy?: (verse: number) => void;
  /** Word study on the selected verses: their words are underlined and become the buttons. */
  words?: WordMode | null;
}

export interface WordMode {
  /** Each underlined verse's linked words. */
  spans: Map<number, WordSpan[]>;
  /** The word being studied, shown highlighted. */
  active: number | null;
  onPick: (verse: number, strong: number) => void;
}

const NO_STUDY = new Map<number, StudyNote[]>();

/** A verse's text: plain, or with its words underlined while it is selected for study. */
function VerseText({ v, words }: { v: PassageVerse; words?: WordMode | null }) {
  const spans = words?.spans.get(v.verse);
  return words && spans ? (
    <WordRuns
      text={v.text}
      spans={spans}
      active={words.active}
      onPick={(strong) => words.onPick(v.verse, strong)}
    />
  ) : (
    <>{v.text}</>
  );
}

/**
 * Scripture as both readers show it. Every verse is a button: tap to select, tap another to
 * stretch the selection, Shift+click on a laptop to extend.
 */
export function Passage(props: PassageProps) {
  return props.layout === 'read' ? <ReadLayout {...props} /> : <StudyLayout {...props} />;
}

function ReadLayout({ verses, marks, selection, onSelect, words }: PassageProps) {
  return (
    <p className={styles.prose}>
      {verses
        .filter((v) => !v.missing)
        .map((v) => {
          const selected = selection && v.verse >= selection.start && v.verse <= selection.end;
          const color = marks.highlights.get(v.verse);
          const bookmarked = marks.bookmarks.has(v.verse);
          const notes = marks.notes.get(v.verse);
          // While a verse's words are underlined they are the buttons (a button can't hold
          // buttons); a tap elsewhere in the verse still works as a verse tap.
          const studied = Boolean(words?.spans.has(v.verse));
          return (
            <span
              key={v.osis}
              className={cx(styles.inline, selected && styles.inlineSelected)}
              data-verse={v.verse}
              data-color={color}
            >
              {/* A span, not a <button>: buttons lay out as one box, so verses could not
                  share a line and the text would stop flowing as a paragraph. */}
              <span
                role={studied ? undefined : 'button'}
                tabIndex={studied ? undefined : 0}
                className={styles.inlineButton}
                data-no-press
                data-words={studied || undefined}
                aria-pressed={studied ? undefined : Boolean(selected)}
                onClick={(e) => onSelect(v.verse, e.shiftKey)}
                onKeyDown={
                  studied
                    ? undefined
                    : (e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        onSelect(v.verse, e.shiftKey);
                      }
                }
              >
                <sup className={styles.inlineNum}>{v.verse}</sup>
                {color ? (
                  <mark className={styles.inlineHl} data-color={color}>
                    <VerseText v={v} words={words} />
                  </mark>
                ) : (
                  <VerseText v={v} words={words} />
                )}
                {(bookmarked || notes?.length) && (
                  <span className={styles.inlineMarks}>
                    {bookmarked && (
                      <Bookmark size={12} fill="currentColor" aria-label="Bookmarked" />
                    )}
                    {notes?.map((n) => (
                      <StickyNote
                        key={n.id}
                        size={12}
                        role="img"
                        aria-label={`Note: ${n.text ?? ''}`}
                      />
                    ))}
                  </span>
                )}
              </span>{' '}
            </span>
          );
        })}
    </p>
  );
}

function StudyLayout({
  verses,
  second,
  marks,
  selection,
  onSelect,
  onOpenNote,
  studyByVerse = NO_STUDY,
  onOpenStudy,
  words,
}: PassageProps) {
  const secondByVerse = useMemo(
    () => new Map(second?.verses.map((v) => [v.verse, v]) ?? []),
    [second],
  );
  const noted = useMemo(() => {
    const set = new Set<number>();
    for (const sp of marks.noteSpans) for (let v = sp.start; v <= sp.end; v++) set.add(v);
    return set;
  }, [marks.noteSpans]);
  return (
    <ol className={cx(styles.verses, second && styles.parallel)}>
      {verses.map((v) => {
        const selected = selection && v.verse >= selection.start && v.verse <= selection.end;
        const other = secondByVerse.get(v.verse);
        const color = marks.highlights.get(v.verse);
        const bookmarked = marks.bookmarks.has(v.verse);
        const notes = marks.notes.get(v.verse);
        // Neighbouring verses in one colour join into a single band.
        const joinPrev = Boolean(color) && marks.highlights.get(v.verse - 1) === color;
        const joinNext = Boolean(color) && marks.highlights.get(v.verse + 1) === color;
        const bracket = noted.has(v.verse)
          ? [noted.has(v.verse - 1) ? '' : 'top', noted.has(v.verse + 1) ? '' : 'bottom']
              .filter(Boolean)
              .join(' ') || 'mid'
          : undefined;
        return (
          <li
            key={v.osis}
            className={cx(styles.verse, selected && styles.selected)}
            data-verse={v.verse}
            data-color={color}
            data-band={color ? 'on' : undefined}
            data-join-prev={joinPrev || undefined}
            data-join-next={joinNext || undefined}
            data-bracket={bracket}
            data-sel-prev={(selected && selection && v.verse > selection.start) || undefined}
            data-sel-next={(selected && selection && v.verse < selection.end) || undefined}
          >
            <div className={styles.margin}>
              <span className={styles.num}>{v.verse}</span>
              {bookmarked && (
                <Bookmark
                  size={12}
                  fill="currentColor"
                  className={styles.bookmarkMark}
                  aria-label="Bookmarked"
                />
              )}
              {onOpenNote &&
                notes?.map((n) => (
                  <Tooltip key={n.id} content={notePreview(n.text)}>
                    <button
                      type="button"
                      className={styles.noteMark}
                      onClick={() => onOpenNote(n)}
                      aria-label={`Note on ${noteLabel(n)}: ${n.text ?? ''}`}
                    >
                      <StickyNote size={13} aria-hidden />
                    </button>
                  </Tooltip>
                ))}
              {onOpenStudy && studyByVerse.has(v.verse) && (
                <Tooltip content="Study notes">
                  <button
                    type="button"
                    className={styles.studyMark}
                    onClick={() => onOpenStudy(v.verse)}
                    aria-label={`Study notes on verse ${v.verse}`}
                  >
                    <BookText size={13} aria-hidden />
                  </button>
                </Tooltip>
              )}
            </div>
            <VerseButton
              studied={Boolean(words?.spans.has(v.verse)) && !v.missing}
              className={styles.verseButton}
              selected={Boolean(selected)}
              onClick={(e) => onSelect(v.verse, e.shiftKey)}
            >
              <span className={cx(styles.text, v.missing && styles.missing)}>
                <sup className={styles.mobileVerseNum}>{v.verse}</sup>
                {(bookmarked || notes?.length) && (
                  // Phones: the margin is hidden, so small marks show your own bookmarks and notes;
                  // tapping the verse opens them. (Study notes are on most verses: marking each
                  // would crowd the text, so the selection bar offers them instead.)
                  <span className={styles.mobileMarks} aria-hidden>
                    {bookmarked && <Bookmark size={11} fill="currentColor" />}
                    {notes?.length ? <StickyNote size={11} /> : null}
                  </span>
                )}
                {v.missing ? (
                  'Not included in this translation.'
                ) : color ? (
                  <mark className={styles.hlText} data-color={color}>
                    <VerseText v={v} words={words} />
                  </mark>
                ) : (
                  <VerseText v={v} words={words} />
                )}
              </span>
              {second && (
                <span
                  className={cx(
                    styles.text,
                    styles.secondText,
                    (!other || other.missing) && styles.missing,
                  )}
                  data-code={second.translation}
                >
                  {other && !other.missing ? other.text : 'Not included in this translation.'}
                </span>
              )}
            </VerseButton>
          </li>
        );
      })}
    </ol>
  );
}

/** A Study row's verse: a button, or a plain box while its words are the buttons. */
function VerseButton({
  studied,
  selected,
  className,
  onClick,
  children,
}: {
  studied: boolean;
  selected: boolean;
  className: string;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  return studied ? (
    // Taps between the words still reach the verse; keyboard users have the selection bar.
    <div className={className} data-words onClick={onClick}>
      {children}
    </div>
  ) : (
    <button
      type="button"
      className={className}
      data-no-press
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function noteLabel(n: MarkRecord): string {
  const r = fromOsis(n.ref);
  return r ? formatRef(r) : n.ref;
}

function notePreview(text: string | undefined): string {
  const t = (text ?? '').trim();
  return t.length > 140 ? `${t.slice(0, 140)}…` : t;
}
