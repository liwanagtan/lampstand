import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Dialog, IconButton, cx } from '@/design-system/components';
import { BOOKS, BOOK_BY_CODE } from '@/features/bible/books';
import { chapterCount } from './useChapter';
import styles from './BookPicker.module.css';

interface BookPickerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  translation: string;
  current: { book: string; chapter: number };
  onPick: (book: string, chapter: number) => void;
}

/** Book grid (Old and New Testament), then a chapter grid. */
export function BookPicker({ open, onOpenChange, translation, current, onPick }: BookPickerProps) {
  const [book, setBook] = useState<string | null>(null);
  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) setBook(null);
  };
  const chapters = book ? chapterCount(translation, book) : 0;
  return (
    <Dialog
      open={open}
      onOpenChange={close}
      size="lg"
      title={book ? BOOK_BY_CODE.get(book)!.name : 'Choose a book'}
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
      ) : (
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
      )}
    </Dialog>
  );
}
