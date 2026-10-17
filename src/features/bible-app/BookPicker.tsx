import { useState } from 'react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { IconButton, Sheet, Tabs, cx } from '@/design-system/components';
import { BOOKS, BOOK_BY_CODE } from '@/features/bible/books';
import { formatRef, fromOsis, type RefRange } from '@/features/bible/ref';
import { markOrder } from './markGroups';
import { useAllMarks } from './marks';
import { chapterCount } from './useChapter';
import styles from './BookPicker.module.css';

interface BookPickerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  translation: string;
  current: { book: string; chapter: number };
  onPick: (book: string, chapter: number) => void;
  /** Show a Bookmarks tab that jumps to a bookmarked passage. */
  onPickBookmark?: (range: RefRange) => void;
}

/**
 * Getting around the Bible: a book grid, then a chapter grid; and your bookmarks. A bottom
 * sheet on phones, so every choice is under the thumb.
 */
export function BookPicker({
  open,
  onOpenChange,
  translation,
  current,
  onPick,
  onPickBookmark,
}: BookPickerProps) {
  const [book, setBook] = useState<string | null>(null);
  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setBook(null);
  };
  const chapters = book ? chapterCount(translation, book) : 0;
  const books = (
    <div className={styles.testaments}>
      {(['OT', 'NT'] as const).map((t) => (
        <section key={t} aria-label={t === 'OT' ? 'Old Testament' : 'New Testament'}>
          <h3 className={styles.heading}>{t === 'OT' ? 'Old Testament' : 'New Testament'}</h3>
          <ul className={styles.books}>
            {BOOKS.filter((b) => b.testament === t).map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  className={cx(styles.book, b.code === current.book && styles.current)}
                  onClick={() => {
                    if (chapterCount(translation, b.code) === 1) {
                      onPick(b.code, 1);
                      close(false);
                    } else setBook(b.code);
                  }}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
  return (
    <Sheet
      open={open}
      onOpenChange={close}
      size="lg"
      title={book ? BOOK_BY_CODE.get(book)!.name : 'Go to'}
      description={book ? 'Choose a chapter' : undefined}
    >
      {book ? (
        <div className={styles.chapterView}>
          <IconButton
            label="Back to books"
            icon={<ArrowLeft size={18} />}
            size="sm"
            onClick={() => setBook(null)}
          />
          <ul className={styles.chapters} aria-label="Chapters">
            {Array.from({ length: chapters }, (_, i) => i + 1).map((c) => (
              <li key={c}>
                <button
                  type="button"
                  className={cx(
                    styles.chapter,
                    book === current.book && c === current.chapter && styles.current,
                  )}
                  onClick={() => {
                    onPick(book, c);
                    close(false);
                  }}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : onPickBookmark ? (
        <Tabs
          label="Go to"
          items={[
            { value: 'books', label: 'Books', content: books },
            {
              value: 'bookmarks',
              label: 'Bookmarks',
              content: (
                <Bookmarks
                  onPick={(r) => {
                    onPickBookmark(r);
                    close(false);
                  }}
                />
              ),
            },
          ]}
        />
      ) : (
        books
      )}
    </Sheet>
  );
}

function Bookmarks({ onPick }: { onPick: (r: RefRange) => void }) {
  const marks = useAllMarks();
  const list = (marks ?? [])
    .filter((m) => m.kind === 'bookmark')
    .flatMap((m) => {
      const r = fromOsis(m.ref);
      return r ? [{ id: m.id, range: r }] : [];
    })
    .sort((a, b) => markOrder(a.range) - markOrder(b.range));
  if (marks && !list.length)
    return (
      <p className={styles.empty}>
        No bookmarks yet. Select a verse and tap Bookmark to keep your place.
      </p>
    );
  return (
    <ul className={styles.marks} aria-label="Bookmarks">
      {list.map((b) => (
        <li key={b.id}>
          <button type="button" className={styles.mark} onClick={() => onPick(b.range)}>
            <Bookmark size={16} fill="currentColor" aria-hidden />
            {formatRef(b.range)}
          </button>
        </li>
      ))}
    </ul>
  );
}
