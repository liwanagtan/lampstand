import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, NotebookPen } from 'lucide-react';
import { Button } from '@/design-system/components';
import { toOsis } from '@/features/bible/ref';
import { usePassage } from '@/slides/usePassage';
import { verseOfTheDay } from './dailyVerses';
import { useReader } from './readerStore';
import { useOpenInReader } from './useOpenInReader';
import styles from './Daily.module.css';
import { paths } from '@/app/paths';

/** The verse-of-the-day card (Today page), or a one-line strip (`compact`, on the Library). */
export function VerseOfTheDay({
  compact = false,
  extra,
}: {
  compact?: boolean;
  extra?: ReactNode;
}) {
  const navigate = useNavigate();
  const open = useOpenInReader();
  const translation = useReader((s) => s.translation);
  const { ref, range } = verseOfTheDay();
  const osis = toOsis(range);
  const { passage } = usePassage(osis, translation);
  const text = passage?.verses
    .filter((v) => !v.missing)
    .map((v) => v.text)
    .join(' ');

  if (compact) {
    return (
      <section className={styles.strip} aria-label="Verse of the day">
        <div className={styles.stripBody}>
          <p className={styles.eyebrow}>Verse of the day</p>
          <p className={styles.stripText}>
            {text ? `“${text}”` : ' '}
            <span className={styles.stripRef}> — {passage?.reference ?? ref}</span>
          </p>
        </div>
        <Button icon={<BookOpen size={16} />} onClick={() => navigate(paths.today)}>
          Today
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.verseCard} aria-label="Verse of the day">
      <p className={styles.eyebrow}>Verse of the day</p>
      <blockquote className={styles.verseText}>{text ? `“${text}”` : ' '}</blockquote>
      <p className={styles.verseRef}>
        {passage?.reference ?? ref}
        <span>{translation}</span>
      </p>
      <div className={styles.actions}>
        <Button icon={<BookOpen size={16} />} onClick={() => open(range)}>
          Read in context
        </Button>
        <Button icon={<NotebookPen size={16} />} onClick={() => navigate(paths.profile)}>
          Reflect
        </Button>
        {extra}
      </div>
    </section>
  );
}
