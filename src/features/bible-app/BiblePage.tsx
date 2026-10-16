import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  NotebookPen,
  StickyNote,
  X,
} from 'lucide-react';
import { Button, IconButton, Select, Tooltip, cx, toast } from '@/design-system/components';
import { BOOKS, BOOK_BY_CODE, BOOK_INDEX } from '@/features/bible/books';
import { useBible } from '@/features/bible/bibleStore';
import {
  defaultVerseCounts,
  formatRef,
  fromOsis,
  toOsis,
  type RefRange,
} from '@/features/bible/ref';
import type { Passage } from '@/features/bible/passage';
import type { MarkRecord } from '@/db/types';
import { useShortcuts } from '@/features/present/useShortcuts';
import { BibleSearch } from './BibleSearch';
import { BookPicker } from './BookPicker';
import {
  HIGHLIGHT_COLORS,
  setHighlight,
  toggleBookmark,
  useChapterMarks,
  type ChapterMarks,
} from './marks';
import { NoteDialog } from './NoteDialog';
import { READER_SIZES, selectionRange, useReader, type Selection } from './readerStore';
import { chapterCount, useChapter } from './useChapter';
import styles from './BiblePage.module.css';

export interface BiblePageSlots {
  /** Extra toolbar actions (e.g. Start Presentation) and a side panel (the TV controls). */
  toolbar?: ReactNode;
  side?: ReactNode;
  /** Extra actions for the current selection (e.g. Present). */
  selectionActions?: (range: RefRange, translation: string) => ReactNode;
}

function stepChapter(
  book: string,
  chapter: number,
  dir: 1 | -1,
  code: string,
): { book: string; chapter: number } | null {
  const count = chapterCount(code, book);
  if (dir > 0 && chapter < count) return { book, chapter: chapter + 1 };
  if (dir < 0 && chapter > 1) return { book, chapter: chapter - 1 };
  const i = (BOOK_INDEX.get(book) ?? 0) + dir;
  const next = BOOKS[i];
  if (!next) return null;
  return { book: next.code, chapter: dir > 0 ? 1 : chapterCount(code, next.code) };
}

/** The Bible reader: navigate, search, read in one or two translations, select verses. */
export function BibleReader({ toolbar, side, selectionActions }: BiblePageSlots) {
  const {
    book,
    chapter,
    translation,
    parallel,
    size,
    selection,
    goTo,
    setTranslation,
    setParallel,
    setSize,
    select,
    setSelection,
  } = useReader();
  const translations = useBible((s) => s.translations);
  const [picking, setPicking] = useState(false);
  const [noteFor, setNoteFor] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);
  const marks = useChapterMarks(book, chapter);
  const primary = useChapter(translation, book, chapter);
  const second = useChapter(parallel, book, chapter);
  const body = useRef<HTMLDivElement>(null);
  const bookName = BOOK_BY_CODE.get(book)?.name ?? book;
  const single = chapterCount(translation, book) === 1;

  const go = (dir: 1 | -1) => {
    const n = stepChapter(book, chapter, dir, translation);
    if (n) goTo(n.book, n.chapter);
  };

  useShortcuts({
    ArrowRight: () => go(1),
    ArrowLeft: () => go(-1),
    '/': () =>
      document.querySelector<HTMLInputElement>('input[aria-label="Search the Bible"]')?.focus(),
    // Esc clears the selection first; with nothing selected it falls through (e.g. to the TV).
    ...(selection ? { Escape: () => setSelection(null) } : {}),
  });

  // Keep the selection in view after a jump.
  useLayoutEffect(() => {
    if (!selection || !primary) return;
    const el = body.current?.querySelector(`[data-verse="${selection.start}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary?.osis, selection?.start]);

  // A new chapter starts at the top unless a verse was chosen.
  useEffect(() => {
    if (!useReader.getState().selection) body.current?.scrollTo({ top: 0 });
  }, [book, chapter]);

  const options = translations.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` }));
  const range = selection ? selectionRange(book, chapter, selection) : null;
  const rangeId = range ? toOsis(range) : null;
  const bookmarked = Boolean(
    selection && marks.bookmarks.get(selection.start)?.some((m) => m.ref === rangeId),
  );
  const existingNote = selection
    ? marks.notes.get(selection.end)?.find((m) => m.ref === rangeId)
    : undefined;

  const copy = async () => {
    if (!range || !primary) return;
    const verses = primary.verses.filter(
      (v) => v.verse >= range.start.verse && v.verse <= range.end.verse && !v.missing,
    );
    const text = `${formatRef(range)} (${translation})\n${verses.map((v) => v.text).join(' ')}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `Copied ${formatRef(range)}`, tone: 'success' });
    } catch {
      toast({ title: "Couldn't copy to the clipboard.", tone: 'warning' });
    }
  };

  return (
    <div className={cx(styles.layout, side && styles.withSide)}>
      <div className={styles.reader}>
        <div className={styles.toolbar}>
          <div className={styles.nav}>
            <IconButton
              label="Previous chapter"
              icon={<ChevronLeft size={18} />}
              variant="secondary"
              onClick={() => go(-1)}
            />
            <Button
              variant="secondary"
              iconEnd={<ChevronDown size={16} />}
              onClick={() => setPicking(true)}
              className={styles.place}
            >
              {single ? bookName : `${bookName} ${chapter}`}
            </Button>
            <IconButton
              label="Next chapter"
              icon={<ChevronRight size={18} />}
              variant="secondary"
              onClick={() => go(1)}
            />
          </div>
          <BibleSearch
            translation={translation}
            onGo={(r, code) => {
              if (code) setTranslation(code);
              const sameChapter = r.end.book === r.start.book && r.end.chapter === r.start.chapter;
              const last = defaultVerseCounts(r.start.book)?.[r.start.chapter - 1];
              // A whole chapter ("ps 23") opens it without selecting every verse.
              const whole = sameChapter && r.start.verse === 1 && r.end.verse === last;
              goTo(
                r.start.book,
                r.start.chapter,
                whole
                  ? null
                  : { start: r.start.verse, end: sameChapter ? r.end.verse : r.start.verse },
              );
            }}
          />
          <div className={styles.view}>
            <Select
              label="Translation"
              hideLabel
              aria-label="Translation"
              size="sm"
              value={translation}
              onChange={setTranslation}
              options={options}
              className={styles.select}
            />
            <Select
              label="Parallel"
              hideLabel
              aria-label="Parallel translation"
              size="sm"
              value={parallel ?? 'none'}
              onChange={(v) => setParallel(v === 'none' ? null : v)}
              options={[
                { value: 'none', label: 'No parallel' },
                ...options.filter((o) => o.value !== translation),
              ]}
              className={styles.select}
            />
            <div className={styles.size} role="group" aria-label="Text size">
              <Tooltip content="Smaller text">
                <IconButton
                  label="A− smaller text"
                  icon={<span className={styles.aSmall}>A−</span>}
                  size="sm"
                  disabled={size === READER_SIZES[0]}
                  onClick={() =>
                    setSize(READER_SIZES[Math.max(0, READER_SIZES.indexOf(size) - 1)]!)
                  }
                />
              </Tooltip>
              <Tooltip content="Larger text">
                <IconButton
                  label="A+ larger text"
                  icon={<span className={styles.aLarge}>A+</span>}
                  size="sm"
                  disabled={size === READER_SIZES[READER_SIZES.length - 1]}
                  onClick={() =>
                    setSize(
                      READER_SIZES[
                        Math.min(READER_SIZES.length - 1, READER_SIZES.indexOf(size) + 1)
                      ]!,
                    )
                  }
                />
              </Tooltip>
            </div>
            {toolbar}
          </div>
        </div>

        <div ref={body} className={styles.body} style={{ fontSize: size }}>
          <article
            className={cx(styles.page, second && styles.parallel)}
            aria-label={`${bookName} ${chapter}`}
          >
            <header className={styles.chapterHead}>
              <h1 className={styles.chapterTitle}>
                {single ? bookName : `${bookName} ${chapter}`}
              </h1>
              {second && (
                <div className={styles.columnsHead} aria-hidden>
                  <span>{translation}</span>
                  <span>{parallel}</span>
                </div>
              )}
            </header>
            {primary ? (
              <Verses
                primary={primary}
                second={second}
                selection={selection}
                onSelect={select}
                marks={marks}
                onOpenNote={(note) => {
                  const r = fromOsis(note.ref);
                  if (r) setNoteFor({ range: r, note });
                }}
              />
            ) : (
              <p className={styles.loading}>Loading…</p>
            )}
            <nav className={styles.chapterFoot} aria-label="Chapter navigation">
              <Button variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => go(-1)}>
                Previous
              </Button>
              <Button variant="ghost" iconEnd={<ChevronRight size={16} />} onClick={() => go(1)}>
                Next chapter
              </Button>
            </nav>
          </article>
        </div>

        {range && selection && (
          <div className={styles.selectionBar} role="toolbar" aria-label="Selected verses">
            <span className={styles.selectionLabel}>{formatRef(range)}</span>
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
                      onClick={() => void setHighlight(range, on ? null : color)}
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
            <span className={styles.barDivider} aria-hidden />
            <Tooltip content={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
              <IconButton
                label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
                icon={<Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />}
                size="sm"
                aria-pressed={bookmarked}
                onClick={() =>
                  void toggleBookmark(range).then((on) =>
                    toast({
                      title: on ? `Bookmarked ${formatRef(range)}` : 'Bookmark removed',
                      tone: on ? 'success' : 'neutral',
                    }),
                  )
                }
              />
            </Tooltip>
            <Tooltip content={existingNote ? 'Edit note' : 'Add a note'}>
              <IconButton
                label={existingNote ? 'Edit note' : 'Add a note'}
                icon={<NotebookPen size={15} />}
                size="sm"
                onClick={() => setNoteFor({ range, note: existingNote ?? null })}
              />
            </Tooltip>
            <Tooltip content="Copy">
              <IconButton
                label="Copy"
                icon={<Copy size={15} />}
                size="sm"
                onClick={() => void copy()}
              />
            </Tooltip>
            {selectionActions && <span className={styles.barDivider} aria-hidden />}
            {selectionActions?.(range, translation)}
            <IconButton
              label="Clear selection"
              icon={<X size={16} />}
              size="sm"
              onClick={() => setSelection(null)}
            />
          </div>
        )}
      </div>
      {side && <aside className={styles.side}>{side}</aside>}

      <NoteDialog target={noteFor} onClose={() => setNoteFor(null)} />
      <BookPicker
        open={picking}
        onOpenChange={setPicking}
        translation={translation}
        current={{ book, chapter }}
        onPick={(b, c) => goTo(b, c)}
      />
    </div>
  );
}

function Verses({
  primary,
  second,
  selection,
  onSelect,
  marks,
  onOpenNote,
}: {
  primary: Passage;
  second: Passage | null;
  selection: Selection | null;
  onSelect: (verse: number, extend: boolean) => void;
  marks: ChapterMarks;
  onOpenNote: (note: MarkRecord) => void;
}) {
  const secondByVerse = useMemo(
    () => new Map(second?.verses.map((v) => [v.verse, v]) ?? []),
    [second],
  );
  return (
    <ol className={styles.verses}>
      {primary.verses.map((v) => {
        const selected = selection && v.verse >= selection.start && v.verse <= selection.end;
        const other = secondByVerse.get(v.verse);
        const color = marks.highlights.get(v.verse);
        const bookmarked = marks.bookmarks.has(v.verse);
        const notes = marks.notes.get(v.verse);
        return (
          <li
            key={v.osis}
            className={cx(styles.verse, selected && styles.selected)}
            data-verse={v.verse}
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
              {notes?.map((n) => (
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
            </div>
            <button
              type="button"
              className={styles.verseButton}
              aria-pressed={Boolean(selected)}
              onClick={(e) => onSelect(v.verse, e.shiftKey)}
            >
              <span className={cx(styles.text, v.missing && styles.missing)}>
                {v.missing ? (
                  'Not included in this translation.'
                ) : color ? (
                  <mark className={styles.hl} data-color={color}>
                    {v.text}
                  </mark>
                ) : (
                  v.text
                )}
              </span>
              {second && (
                <span
                  className={cx(
                    styles.text,
                    styles.secondText,
                    (!other || other.missing) && styles.missing,
                  )}
                >
                  {other && !other.missing ? other.text : 'Not included in this translation.'}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
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

function noteLabel(n: MarkRecord): string {
  const r = fromOsis(n.ref);
  return r ? formatRef(r) : n.ref;
}

function notePreview(text: string | undefined): string {
  const t = (text ?? '').trim();
  return t.length > 140 ? `${t.slice(0, 140)}…` : t;
}
