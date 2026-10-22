import { useWideLayout } from '@/app/useWideLayout';
import { useNavigate } from 'react-router-dom';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  Bookmark,
  BookText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eraser,
  NotebookPen,
  StickyNote,
  X,
} from 'lucide-react';
import { Button, Dialog, IconButton, Tooltip, cx, toast } from '@/design-system/components';
import { BOOKS, BOOK_BY_CODE, BOOK_INDEX } from '@/features/bible/books';
import {
  defaultVerseCounts,
  formatRef,
  fromOsis,
  toOsis,
  verseCountInRange,
  type RefRange,
} from '@/features/bible/ref';
import type { Passage } from '@/features/bible/passage';
import type { MarkRecord } from '@/db/types';
import { useShortcuts } from '@/features/present/useShortcuts';
import { BookPicker } from './BookPicker';
import {
  HIGHLIGHT_COLORS,
  setHighlight,
  toggleBookmark,
  useChapterMarks,
  versesInChapter,
  type ChapterMarks,
} from './marks';
import { NoteDialog } from './NoteDialog';
import { ReadingSettings } from './ReadingSettings';
import { TranslationChip } from './TranslationChip';
import { StudyNotesSheet } from './StudyNotesSheet';
import { notesByVerse, useStudyNotes, type StudyNote } from './studyNotes';
import { haptic } from '@/app/haptics';
import { noteTipEvent } from '@/features/tips/tipStore';
import { useSettings } from '@/features/settings/settingsStore';
import { selectionRange, useReader, type Selection } from './readerStore';
import { chapterCount, useChapter } from './useChapter';
import { biblePosition, rememberBiblePosition } from './readingResume';
import { useChapterReflection } from './journal';
import { ReflectionMoment } from './ReflectionMoment';
import { paths } from '@/app/paths';
import { track } from '@/features/insights/insights';
import styles from './BiblePage.module.css';

export interface BiblePageSlots {
  /** Extra toolbar actions (e.g. the Bookmarks menu). */
  toolbar?: ReactNode;
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
export function BibleReader({ toolbar, selectionActions }: BiblePageSlots) {
  const navigate = useNavigate();
  const {
    book,
    chapter,
    translation,
    parallel,
    size,
    selection,
    selectionActionsOpen,
    goTo,
    setTranslation,
    select,
    setSelection,
    revealSelectionActions,
  } = useReader();
  // Counted once a day (anonymous usage insights).
  useEffect(() => track('chapter_read'), [book, chapter]);
  const [picking, setPicking] = useState(false);
  const [reading, setReading] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [study, setStudy] = useState<number | 'intro' | null>(null);
  const wide = useWideLayout();
  const [noteFor, setNoteFor] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);
  const marksOn = useSettings((st) => st.features.marks);
  const chapterMarks = useChapterMarks(book, chapter);
  // With Read and study switched off, marks stay stored but aren't drawn or offered.
  const marks = marksOn ? chapterMarks : NO_MARKS;
  const studyOn = useSettings((st) => st.studyNotes);
  const bookNotes = useStudyNotes(studyOn ? book : null);
  const studyByVerse = useMemo(() => notesByVerse(bookNotes, chapter), [bookNotes, chapter]);
  const primary = useChapter(translation, book, chapter);
  const second = useChapter(parallel, book, chapter);
  const body = useRef<HTMLDivElement>(null);
  // The toolbar quiets while you read down the page and returns when you scroll back up.
  const [quiet, setQuiet] = useState(false);
  const lastTop = useRef(0);
  const restoringPosition = useRef(true);
  const restoredChapter = useRef('');
  const savePositionTimer = useRef<number | null>(null);
  const onScroll = () => {
    const top = body.current?.scrollTop ?? 0;
    if (top < 120 || top < lastTop.current - 4) setQuiet(false);
    else if (top > lastTop.current + 4) setQuiet(true);
    lastTop.current = top;
    if (restoringPosition.current) return;
    if (savePositionTimer.current !== null) window.clearTimeout(savePositionTimer.current);
    savePositionTimer.current = window.setTimeout(() => {
      rememberBiblePosition(book, chapter, top);
      savePositionTimer.current = null;
    }, 200);
  };
  const bookName = BOOK_BY_CODE.get(book)?.name ?? book;
  const savedReflection = useChapterReflection(book, chapter);
  const lastVerse = defaultVerseCounts(book)?.[chapter - 1] ?? 1;
  const chapterRef = toOsis({
    start: { book, chapter, verse: 1 },
    end: { book, chapter, verse: lastVerse },
  });
  const single = chapterCount(translation, book) === 1;
  const place = single ? bookName : `${bookName} ${chapter}`;
  const readingButton = <TranslationChip onClick={() => setReading(true)} />;

  const go = (dir: 1 | -1) => {
    const n = stepChapter(book, chapter, dir, translation);
    if (n) goTo(n.book, n.chapter);
  };

  useShortcuts({
    ArrowRight: () => go(1),
    ArrowLeft: () => go(-1),
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

  useLayoutEffect(() => {
    restoringPosition.current = true;
    restoredChapter.current = '';
    if (!selection) body.current?.scrollTo({ top: 0, behavior: 'instant' });
    return () => {
      if (savePositionTimer.current !== null) window.clearTimeout(savePositionTimer.current);
      savePositionTimer.current = null;
      if (!restoringPosition.current) rememberBiblePosition(book, chapter, lastTop.current);
    };
    // A new chapter starts at its own saved position once its verses have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter]);

  useLayoutEffect(() => {
    if (!primary) return;
    const key = `${book}.${chapter}`;
    if (restoredChapter.current === key) return;
    restoredChapter.current = key;
    if (!selection)
      body.current?.scrollTo({ top: biblePosition(book, chapter), behavior: 'instant' });
    lastTop.current = body.current?.scrollTop ?? 0;
    restoringPosition.current = false;
  }, [primary, book, chapter, selection]);

  useEffect(() => {
    const flush = () => {
      if (!restoringPosition.current)
        rememberBiblePosition(book, chapter, body.current?.scrollTop ?? lastTop.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [book, chapter]);

  // A new chapter starts at the top unless a verse was chosen.
  const firstChapter = useRef(true);
  useEffect(() => {
    // Moving on to another chapter is a natural moment for a reading tip.
    if (firstChapter.current) firstChapter.current = false;
    else void noteTipEvent('chapter-read');
  }, [book, chapter]);

  const range = selection ? selectionRange(book, chapter, selection) : null;
  const rangeId = range ? toOsis(range) : null;
  const verseTotal = range ? verseCountInRange(range) : 0;
  const bookmarked = Boolean(
    selection && marks.bookmarks.get(selection.start)?.some((m) => m.ref === rangeId),
  );
  // The note on exactly this selection; for a single verse, a note that covers it. (On phones the
  // margin, with its note icons, is hidden: the selection bar is the way into notes.)
  const existingNote = selection
    ? (marks.notes.get(selection.end)?.find((m) => m.ref === rangeId) ??
      (selection.start === selection.end
        ? [...marks.notes.values()].flat().find((m) => {
            const r = fromOsis(m.ref);
            if (!r) return false;
            const { start, end } = versesInChapter(r, book, chapter);
            return start <= selection.start && selection.start <= end;
          })
        : undefined))
    : undefined;
  const studyVerse = selection
    ? Array.from(
        { length: selection.end - selection.start + 1 },
        (_, i) => selection.start + i,
      ).find((v) => studyByVerse.has(v))
    : undefined;

  const onSearchGo = (r: RefRange, code?: string) => {
    if (code) setTranslation(code);
    const sameChapter = r.end.book === r.start.book && r.end.chapter === r.start.chapter;
    const last = defaultVerseCounts(r.start.book)?.[r.start.chapter - 1] ?? r.end.verse;
    // A whole chapter ("ps 23") opens it without selecting every verse.
    const whole = sameChapter && r.start.verse === 1 && r.end.verse === last;
    // A range past this chapter selects the rest of it; marks cover the whole range.
    goTo(
      r.start.book,
      r.start.chapter,
      whole
        ? null
        : sameChapter
          ? { start: r.start.verse, end: r.end.verse }
          : { start: r.start.verse, end: last, span: r },
    );
  };

  const copy = async () => {
    if (!range || !primary) return;
    const verses = primary.verses.filter(
      (v) => v.verse >= range.start.verse && v.verse <= range.end.verse && !v.missing,
    );
    const text = `${formatRef(range)} (${translation})\n${verses.map((v) => v.text).join(' ')}${primary.copyright ? `\n\n${primary.copyright}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `Copied ${formatRef(range)}`, tone: 'success' });
    } catch {
      toast({ title: "Couldn't copy to the clipboard.", tone: 'warning' });
    }
  };

  return (
    <div className={cx(styles.layout, wide && study !== null && styles.withSide)}>
      <div className={styles.reader}>
        <header className={styles.mobileHeader} role="group" aria-label="Bible reading controls">
          <button type="button" className={styles.mobilePlace} onClick={() => setPicking(true)}>
            {place}
            <ChevronDown size={20} aria-hidden />
          </button>
          <div className={styles.mobileReadingActions}>
            {readingButton}
            <button
              type="button"
              className={styles.mobileAa}
              aria-label="Reading settings"
              onClick={() => setReading(true)}
            >
              Aa
            </button>
          </div>
        </header>
        <div className={styles.toolbar} data-quiet={quiet || undefined}>
          <div className={styles.nav}>
            <IconButton
              label="Previous chapter"
              icon={<ChevronLeft size={18} />}
              onClick={() => go(-1)}
            />
            <Button
              variant="ghost"
              iconEnd={<ChevronDown size={16} />}
              onClick={() => setPicking(true)}
              className={styles.place}
            >
              {place}
            </Button>
            <IconButton
              label="Next chapter"
              icon={<ChevronRight size={18} />}
              onClick={() => go(1)}
            />
          </div>
          <div className={styles.view}>
            {toolbar}
            {readingButton}
          </div>
        </div>

        <div
          ref={body}
          className={styles.body}
          style={{ '--reader-size': `${size}px` } as CSSProperties}
          onScroll={onScroll}
        >
          <article
            className={cx(styles.page, second && styles.parallel)}
            aria-label={`${bookName} ${chapter}`}
          >
            <header className={styles.chapterHead}>
              <h1 className={cx(styles.chapterTitle, 'phone-hidden')}>
                {single ? bookName : `${bookName} ${chapter}`}
              </h1>
              {bookNotes?.intro && (
                <button
                  type="button"
                  className={styles.aboutBook}
                  onClick={() => setStudy('intro')}
                >
                  <BookText size={14} aria-hidden /> About {bookName}
                </button>
              )}
              {second && (
                <div className={styles.columnsHead} aria-hidden>
                  <span>{translation}</span>
                  <span>{parallel}</span>
                </div>
              )}
            </header>
            {primary ? (
              <>
                <Verses
                  primary={primary}
                  second={second}
                  selection={selection}
                  onSelect={(v, extend) => {
                    haptic('tap');
                    if (
                      selection &&
                      !selectionActionsOpen &&
                      v >= selection.start &&
                      v <= selection.end
                    ) {
                      revealSelectionActions();
                      return;
                    }
                    select(v, extend);
                  }}
                  marks={marks}
                  onOpenNote={(note) => {
                    const r = fromOsis(note.ref);
                    if (r) setNoteFor({ range: r, note });
                  }}
                  studyByVerse={studyByVerse}
                  onOpenStudy={(verse) => setStudy(verse)}
                />
                {(primary.copyright || second?.copyright) && (
                  <p className={styles.loading}>{primary.copyright || second?.copyright}</p>
                )}
              </>
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
            {primary && (
              <div className={styles.chapterReflect}>
                <Button
                  variant="secondary"
                  icon={<NotebookPen size={16} />}
                  onClick={() => setReflecting(true)}
                >
                  Reflect on this chapter
                </Button>
              </div>
            )}
          </article>
        </div>

        {/* Phones: getting around, in thumb reach. The selection bar takes its place. */}
        {!selectionActionsOpen && (
          <nav className={styles.pill} data-quiet={quiet || undefined} aria-label="Chapter">
            <IconButton
              label="Previous chapter"
              icon={<ChevronLeft size={20} />}
              className={styles.pillArrow}
              onClick={() => go(-1)}
            />
            <button type="button" className={styles.pillPlace} onClick={() => setPicking(true)}>
              {place}
              <ChevronDown size={16} aria-hidden />
            </button>
            <IconButton
              label="Next chapter"
              icon={<ChevronRight size={20} />}
              className={styles.pillArrow}
              onClick={() => go(1)}
            />
          </nav>
        )}

        {range && selection && selectionActionsOpen && (
          <div className={styles.selectionBar} role="toolbar" aria-label="Selected verses">
            <span className={styles.selectionLabel}>
              {formatRef(range)}
              {verseTotal > 1 && (
                <span className={styles.selectionCount}> · {verseTotal} verses</span>
              )}
            </span>
            {marksOn && (
              <>
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
              </>
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
                      onClick={() => setNoteFor({ range, note: existingNote ?? null })}
                    />
                  </Tooltip>
                </>
              )}
              {studyVerse !== undefined && (
                <Tooltip content="Study notes">
                  <BarButton
                    label={`Study notes on verse ${studyVerse}`}
                    text="Study"
                    icon={<BookText size={18} />}
                    onClick={() => setStudy(studyVerse)}
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
              {selectionActions?.(range, translation)}
            </div>
            <IconButton
              label="Clear selection"
              icon={<X size={18} />}
              size="sm"
              className={styles.clear}
              onClick={() => setSelection(null)}
            />
          </div>
        )}
      </div>

      <NoteDialog target={noteFor} onClose={() => setNoteFor(null)} />
      <StudyNotesSheet
        key={study === 'intro' ? 'intro' : 'verse'}
        bookHtml={[bookNotes?.summary, bookNotes?.intro].filter((h): h is string => Boolean(h))}
        bookTitle={bookName}
        verseTitle={`${bookName} ${chapter}:${typeof study === 'number' ? study : 1}`}
        verseNotes={studyByVerse.get(typeof study === 'number' ? study : 1)}
        startWithBook={study === 'intro'}
        inline={wide}
        open={study !== null}
        onOpenChange={(o) => !o && setStudy(null)}
        eyebrow={study === 'intro' ? 'About this book' : 'Study notes'}
        title={study === 'intro' ? bookName : `${bookName} ${chapter}:${study ?? ''}`}
        notes={typeof study === 'number' ? studyByVerse.get(study) : undefined}
        html={
          study === 'intro'
            ? [bookNotes?.summary, bookNotes?.intro].filter((h): h is string => Boolean(h))
            : undefined
        }
      />
      <BookPicker
        open={picking}
        onOpenChange={setPicking}
        translation={translation}
        current={{ book, chapter }}
        onPick={(b, c) => goTo(b, c)}
        onPickBookmark={marksOn ? (r) => onSearchGo(r) : undefined}
      />
      <ReadingSettings open={reading} onOpenChange={setReading} />
      <Dialog
        open={reflecting}
        onOpenChange={setReflecting}
        title="After reading"
        description={`${place} · Reflection is optional and private.`}
        size="lg"
      >
        <ReflectionMoment
          plain
          question="What stands out to you in this passage?"
          reference={chapterRef}
          title={place}
          chapter={{ book, number: chapter }}
          saved={savedReflection}
          onReturn={() => setReflecting(false)}
          onFinish={() => {
            setReflecting(false);
            navigate(paths.today);
          }}
        />
      </Dialog>
    </div>
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

function Verses({
  primary,
  second,
  selection,
  onSelect,
  marks,
  onOpenNote,
  studyByVerse,
  onOpenStudy,
}: {
  primary: Passage;
  second: Passage | null;
  selection: Selection | null;
  onSelect: (verse: number, extend: boolean) => void;
  marks: ChapterMarks;
  onOpenNote: (note: MarkRecord) => void;
  /** Tyndale study notes that start at each verse. */
  studyByVerse: Map<number, StudyNote[]>;
  onOpenStudy: (verse: number) => void;
}) {
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
    <ol className={styles.verses}>
      {primary.verses.map((v) => {
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
              {studyByVerse.has(v.verse) && (
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
            <button
              type="button"
              className={styles.verseButton}
              data-no-press
              aria-pressed={Boolean(selected)}
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
                  data-code={second.translation}
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

const NO_MARKS: ChapterMarks = {
  highlights: new Map(),
  bookmarks: new Map(),
  notes: new Map(),
  noteSpans: [],
};

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
