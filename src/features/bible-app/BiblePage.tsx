import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Copy, X } from 'lucide-react';
import { Button, IconButton, Select, Tooltip, cx, toast } from '@/design-system/components';
import { BOOKS, BOOK_BY_CODE, BOOK_INDEX } from '@/features/bible/books';
import { useBible } from '@/features/bible/bibleStore';
import { defaultVerseCounts, formatRef, type RefRange } from '@/features/bible/ref';
import type { Passage } from '@/features/bible/passage';
import { useShortcuts } from '@/features/present/useShortcuts';
import { BibleSearch } from './BibleSearch';
import { BookPicker } from './BookPicker';
import { READER_SIZES, selectionRange, useReader, type Selection } from './readerStore';
import { chapterCount, useChapter } from './useChapter';
import styles from './BiblePage.module.css';

export interface BiblePageSlots {
  /** Extra toolbar actions (e.g. Start Presentation) and a side panel (the TV controls). */
  toolbar?: ReactNode;
  side?: ReactNode;
  /** Extra actions for the current selection (e.g. Show on TV). */
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
    Escape: () => setSelection(null),
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
              <Verses primary={primary} second={second} selection={selection} onSelect={select} />
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

        {range && (
          <div className={styles.selectionBar} role="toolbar" aria-label="Selected verses">
            <span className={styles.selectionLabel}>{formatRef(range)}</span>
            <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => void copy()}>
              Copy
            </Button>
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
}: {
  primary: Passage;
  second: Passage | null;
  selection: Selection | null;
  onSelect: (verse: number, extend: boolean) => void;
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
        return (
          <li
            key={v.osis}
            className={cx(styles.verse, selected && styles.selected)}
            data-verse={v.verse}
          >
            <button
              type="button"
              className={styles.verseButton}
              aria-pressed={Boolean(selected)}
              onClick={(e) => onSelect(v.verse, e.shiftKey)}
            >
              <span className={styles.num}>{v.verse}</span>
              <span className={cx(styles.text, v.missing && styles.missing)}>
                {v.missing ? 'Not included in this translation.' : v.text}
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

/** Bible tab: the reader on its own (presenting controls arrive in the next phase). */
export function BiblePage() {
  return <BibleReader />;
}
