import { useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Dialog, Sheet, Tooltip, IconButton, cx } from '@/design-system/components';
import type { JournalEntryRecord } from '@/db/types';
import { BOOKS, BOOK_BY_CODE, BOOK_INDEX } from '@/features/bible/books';
import { formatRef, toOsis, type RefRange } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { EntryEditor } from './EntryEditor';
import { newEntryId, useReflection } from './journal';
import { useReader } from './readerStore';
import { chapterCount, useChapter } from './useChapter';
import { useOpenInReader } from './useOpenInReader';
import styles from './TodayPanels.module.css';
import { useIsPhone } from '@/app/useIsPhone';
import { MarkedVerseText } from './MarkedVerse';
import { useVisibleMarks } from './marks';

/** The chapter around a verse, in a side panel, with the verse marked. Remount (key) to reset. */
export function ContextPanel({
  range,
  open,
  onOpenChange,
}: {
  range: RefRange;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const translation = useReader((s) => s.translation);
  const openInReader = useOpenInReader();
  const [place, setPlace] = useState({ book: range.start.book, chapter: range.start.chapter });
  const body = useRef<HTMLDivElement>(null);
  const passage = useChapter(open ? translation : null, place.book, place.chapter);
  const marks = useVisibleMarks(place.book, place.chapter);
  const home = place.book === range.start.book && place.chapter === range.start.chapter;

  useLayoutEffect(() => {
    if (!passage) return;
    const el = home
      ? body.current?.querySelector(`[data-verse="${range.start.verse}"]`)
      : body.current?.querySelector('[data-verse]');
    el?.scrollIntoView({ block: home ? 'center' : 'start' });
  }, [passage, home, range.start.verse]);

  const step = (dir: 1 | -1) => {
    const count = chapterCount(translation, place.book);
    if (dir > 0 && place.chapter < count) return setPlace({ ...place, chapter: place.chapter + 1 });
    if (dir < 0 && place.chapter > 1) return setPlace({ ...place, chapter: place.chapter - 1 });
    const next = BOOKS[(BOOK_INDEX.get(place.book) ?? 0) + dir];
    if (next)
      setPlace({ book: next.code, chapter: dir > 0 ? 1 : chapterCount(translation, next.code) });
  };

  const book = BOOK_BY_CODE.get(place.book)!;
  const inRange = (v: number) =>
    home &&
    v >= range.start.verse &&
    v <= (range.end.chapter === place.chapter ? range.end.verse : 999);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={`Around ${formatRef(range)}`}
      title={`${book.refName} ${place.chapter}`}
      description={translation}
      actions={
        <Tooltip content="Open in the reader">
          <IconButton
            label="Open in the reader"
            icon={<BookOpen size={16} />}
            size="sm"
            onClick={() => openInReader(range)}
          />
        </Tooltip>
      }
      footer={
        <>
          <Button variant="ghost" icon={<ChevronLeft size={16} />} onClick={() => step(-1)}>
            Previous chapter
          </Button>
          {!home && (
            <Button
              variant="ghost"
              onClick={() => setPlace({ book: range.start.book, chapter: range.start.chapter })}
            >
              Back to {formatRef(range)}
            </Button>
          )}
          <Button
            variant="ghost"
            iconEnd={<ChevronRight size={16} />}
            onClick={() => step(1)}
            className={styles.push}
          >
            Next chapter
          </Button>
        </>
      }
    >
      <div ref={body} className={styles.chapter}>
        {passage ? (
          passage.verses
            .filter((v) => !v.missing)
            .map((v) => (
              <p
                key={v.osis}
                data-verse={v.verse}
                className={cx(styles.verse, inRange(v.verse) && styles.marked)}
              >
                <sup className={styles.num}>{v.verse}</sup>
                <MarkedVerseText verse={v} marks={marks} />
              </p>
            ))
        ) : (
          <p className={styles.loading}>Loading…</p>
        )}
      </div>
    </Sheet>
  );
}

/** Reflect on the verse of the day: a centred dialog on laptops, a bottom sheet on phones (design
 * system › Sheet). Saves into the journal as you type. */
export function ReflectPanel({
  date,
  range,
  open,
  onOpenChange,
}: {
  date: string;
  range: RefRange;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const phone = useIsPhone();
  const existing = useReflection(date);
  const translation = useReader((s) => s.translation);
  const osis = toOsis(range);
  const { passage } = usePassage(osis, translation);
  // A stable id for a new reflection, so the first keystrokes create one entry.
  const [newId] = useState(newEntryId);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');
  const entry: JournalEntryRecord | null | undefined = existing;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={phone ? 'Reflect' : formatRef(range)}
      description={
        phone
          ? `${formatRef(range)} · Saved to your journal as you type. Only on this device.`
          : 'Reflect. Saved to your journal as you type. It stays on this device.'
      }
      footer={
        <Button variant="primary" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      {entry !== undefined && open && (
        <EntryEditor
          key={entry?.id ?? newId}
          entry={
            entry ?? {
              id: newId,
              date,
              kind: 'reflection',
              ref: osis,
              body: '',
            }
          }
          autoFocus
          bodyPlaceholder="What is God saying to you through this verse?"
          header={
            <blockquote className={styles.quote}>
              {text ?? ' '}
              <footer>
                {formatRef(range)} · {translation}
              </footer>
            </blockquote>
          }
        />
      )}
    </Dialog>
  );
}
