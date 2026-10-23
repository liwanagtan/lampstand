import { useWideLayout } from '@/app/useWideLayout';
import { useNavigate } from 'react-router-dom';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { BookText, ChevronDown, ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { Button, Dialog, IconButton, cx } from '@/design-system/components';
import { BOOKS, BOOK_BY_CODE, BOOK_INDEX } from '@/features/bible/books';
import {
  defaultVerseCounts,
  formatRef,
  fromOsis,
  toOsis,
  type RefRange,
} from '@/features/bible/ref';
import type { MarkRecord } from '@/db/types';
import { useShortcuts } from '@/features/present/useShortcuts';
import { BookPicker } from './BookPicker';
import { useChapterMarks, type ChapterMarks } from './marks';
import { NoteDialog } from './NoteDialog';
import { ReadingSettings } from './ReadingSettings';
import { TranslationChip } from './TranslationChip';
import { StudyNotesSheet } from './StudyNotesSheet';
import { notesByVerse, useStudyNotes } from './studyNotes';
import { WORD_STUDY_TRANSLATION, useBookWords, verseWords, type WordSpan } from './wordStudy';
import { WordStudyPanel } from './WordStudyPanel';
import { haptic } from '@/app/haptics';
import { noteTipEvent } from '@/features/tips/tipStore';
import { useSettings } from '@/features/settings/settingsStore';
import { selectionRange, useReader } from './readerStore';
import { chapterCount, useChapter } from './useChapter';
import { biblePosition, rememberBiblePosition } from './readingResume';
import { useChapterReflection } from './journal';
import { ReflectionMoment } from './ReflectionMoment';
import { Passage } from './reading/Passage';
import { VerseActions } from './reading/VerseActions';
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
    parallel: parallelPref,
    size,
    layout,
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
  const [study, setStudyState] = useState<number | 'intro' | null>(null);
  // Word study on one verse, and the word chosen in it.
  const [words, setWords] = useState<{ verse: number; strong: number | null } | null>(null);
  // Study notes and word study share the side column: opening one closes the other.
  const setStudy = (s: number | 'intro' | null) => {
    if (s !== null) setWords(null);
    setStudyState(s);
  };
  const wide = useWideLayout();
  const [noteFor, setNoteFor] = useState<{ range: RefRange; note: MarkRecord | null } | null>(null);
  const marksOn = useSettings((st) => st.features.marks);
  const chapterMarks = useChapterMarks(book, chapter);
  // With Read and study switched off, marks stay stored but aren't drawn or offered.
  const marks = marksOn ? chapterMarks : NO_MARKS;
  const studyOn = useSettings((st) => st.studyNotes);
  const bookNotes = useStudyNotes(studyOn ? book : null);
  const studyByVerse = useMemo(() => notesByVerse(bookNotes, chapter), [bookNotes, chapter]);
  // Fetched once a verse is selected, so the Words button opens without a wait.
  const bookWords = useBookWords(studyOn && (selection || words) ? book : null);
  const primary = useChapter(translation, book, chapter);
  // Side by side is a Study layout: two translations interleaved in paragraphs read poorly.
  const parallel = layout === 'study' ? parallelPref : null;
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
    // Esc leaves word study, then clears the selection; with nothing selected it falls through
    // (e.g. to the TV).
    ...(words
      ? { Escape: () => setWords(null) }
      : selection
        ? { Escape: () => setSelection(null) }
        : {}),
  });

  // Word study follows the selection: tapping another verse studies that one; clearing it (or
  // moving to another chapter) ends it.
  const [wordsFor, setWordsFor] = useState({ selection, book, chapter });
  if (wordsFor.selection !== selection || wordsFor.book !== book || wordsFor.chapter !== chapter) {
    setWordsFor({ selection, book, chapter });
    const moved = wordsFor.book !== book || wordsFor.chapter !== chapter;
    const inside =
      selection && words && words.verse >= selection.start && words.verse <= selection.end;
    if (words && (!selection || moved)) setWords(null);
    // Reading the BSB the new verses are underlined: wait for a word. Elsewhere, study the first.
    else if (words && selection && !inside)
      setWords(
        translation === WORD_STUDY_TRANSLATION ? null : { verse: selection.start, strong: null },
      );
  }

  // Keep the studied verse in view: on phones above the docked panel (which grows once a word is
  // chosen), on laptops after the side column narrows the text.
  useEffect(() => {
    if (!words) return;
    const scroller = body.current;
    const panel = document.querySelector<HTMLElement>('aside[aria-label="Word study"]');
    if (!scroller || !panel) return;
    let frame = 0;
    const keepVisible = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const verse = scroller.querySelector<HTMLElement>(`[data-verse="${words.verse}"]`);
        if (!verse) return;
        const v = verse.getBoundingClientRect();
        const box = scroller.getBoundingClientRect();
        const top = box.top;
        const limit = (wide ? box.bottom : panel.getBoundingClientRect().top) - 16;
        if (v.top < top || v.bottom > limit)
          scroller.scrollBy({ top: v.top - top - 12, behavior: 'smooth' });
      });
    };
    keepVisible();
    // The panel grows once a word's entry has loaded.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(keepVisible) : null;
    ro?.observe(panel);
    return () => {
      cancelAnimationFrame(frame);
      ro?.disconnect();
    };
  }, [words?.verse, wide]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Reading the BSB, selected verses show their studyable words at once: tap one to study it.
  // (Other translations use the Words button, which studies a verse through the BSB.)
  const inBsb = translation === WORD_STUDY_TRANSLATION;
  const underlined = useMemo(() => {
    if (!studyOn || !inBsb || !selection) return null;
    const out = new Map<number, WordSpan[]>();
    for (let v = selection.start; v <= selection.end; v++)
      out.set(v, verseWords(bookWords, chapter, v));
    return out;
  }, [studyOn, inBsb, selection, bookWords, chapter]);

  const wordPanel = words && (
    <WordStudyPanel
      key={`${book}.${chapter}.${words.verse}`}
      verse={{ book, chapter, verse: words.verse }}
      translation={translation}
      strong={words.strong}
      onPick={(strong) => setWords({ verse: words.verse, strong })}
      onClose={() => setWords(null)}
      docked={!wide}
    />
  );

  const copyText = () => {
    if (!range || !primary) return null;
    const verses = primary.verses.filter(
      (v) => v.verse >= range.start.verse && v.verse <= range.end.verse && !v.missing,
    );
    return `${formatRef(range)} (${translation})\n${verses.map((v) => v.text).join(' ')}`;
  };

  return (
    <div className={cx(styles.layout, wide && (study !== null || words) && styles.withSide)}>
      <div className={styles.reader}>
        <header className={styles.mobileHeader} role="group" aria-label="Bible reading controls">
          <button type="button" className={styles.mobilePlace} onClick={() => setPicking(true)}>
            {place}
            <ChevronDown size={20} aria-hidden />
          </button>
          <div className={styles.mobileReadingActions}>{readingButton}</div>
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
          className={cx(styles.body, words && !wide && styles.bodyUnderPanel)}
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
                <Passage
                  layout={layout}
                  verses={primary.verses}
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
                  words={
                    underlined
                      ? {
                          spans: underlined,
                          active: words?.strong ?? null,
                          onPick: (verse, strong) => {
                            haptic('select');
                            setStudyState(null);
                            setWords({ verse, strong });
                          },
                        }
                      : null
                  }
                />
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
        {!selectionActionsOpen && !(words && !wide) && (
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

        {range && selection && selectionActionsOpen && !(words && !wide) && (
          <VerseActions
            range={range}
            selection={selection}
            marks={marks}
            copyText={copyText}
            studyVerse={studyVerse}
            onStudy={setStudy}
            onWords={
              studyOn && !inBsb
                ? () => {
                    setStudyState(null);
                    setWords({ verse: selection.start, strong: null });
                  }
                : undefined
            }
            extra={selectionActions?.(range, translation)}
            onNote={setNoteFor}
            onClose={() => setSelection(null)}
          />
        )}
        {words && !wide && wordPanel}
      </div>
      {words && wide && wordPanel}

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

const NO_MARKS: ChapterMarks = {
  highlights: new Map(),
  bookmarks: new Map(),
  notes: new Map(),
  noteSpans: [],
};
