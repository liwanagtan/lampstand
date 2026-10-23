import { BookOpen, Presentation } from 'lucide-react';
import styles from './ScreenEntries.module.css';

/** Screen home: two equal ways in — a presentation file, or the Bible. */
export function ScreenEntries({
  count,
  onPresentation,
  onBible,
}: {
  count: number;
  onPresentation: () => void;
  onBible: () => void;
}) {
  return (
    <div className={styles.entries}>
      <button type="button" className={styles.entry} onClick={onPresentation}>
        <span className={styles.icon} aria-hidden>
          <Presentation size={22} />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>Show slides</span>
          <span className={styles.body}>
            {count
              ? 'Sermon slides with verses, notes and a countdown, from your library.'
              : 'Import a sermon file to put its slides on the screen.'}
          </span>
        </span>
      </button>
      <button type="button" className={styles.entry} onClick={onBible}>
        <span className={styles.icon} aria-hidden>
          <BookOpen size={22} />
        </span>
        <span className={styles.text}>
          <span className={styles.title}>Show the Bible</span>
          <span className={styles.body}>
            Any passage, for a class or a small group, with highlighted words.
          </span>
        </span>
      </button>
    </div>
  );
}
