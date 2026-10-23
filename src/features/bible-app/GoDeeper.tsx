import { Check, NotebookPen } from 'lucide-react';
import { Button } from '@/design-system/components';
import { FlameCompanion } from '@/design-system/FlameCompanion';
import { formatRef } from '@/features/bible/ref';
import { SpurgeonRow } from './ClassicDevotional';
import { verseOfTheDay } from './dailyVerses';
import { entryHasContent, entryPreview, useReflection } from './journal';
import styles from './GoDeeper.module.css';

/**
 * Today's second tier, in one card: a few minutes of reflection on the verse, and (when it is
 * on) Spurgeon's Morning and Evening. The verse and your reading stay the first things you see.
 */
export function GoDeeper({
  now,
  date,
  classic,
  onReflect,
}: {
  now: Date;
  date: string;
  classic: boolean;
  onReflect: () => void;
}) {
  const entry = useReflection(date);
  const written = entryHasContent(entry);
  const { range } = verseOfTheDay(now);
  return (
    <section className={styles.card} aria-labelledby="go-deeper-title">
      <h2 id="go-deeper-title" className={styles.title}>
        Go deeper
      </h2>
      <section className={styles.item} aria-label="Reflection">
        {written ? (
          <span className={styles.doneMark} aria-hidden>
            <Check size={18} />
          </span>
        ) : (
          <FlameCompanion size={56} className={styles.flame} />
        )}
        <div className={styles.itemBody}>
          <strong>{written ? 'Your reflection' : 'Reflect on today’s verse'}</strong>
          <p>
            {written && entry
              ? `“${entryPreview(entry)}”`
              : `A few simple questions to sit with ${formatRef(range)}.`}
          </p>
          <div>
            <Button
              size="sm"
              variant={written ? 'secondary' : 'gold'}
              icon={<NotebookPen size={15} />}
              onClick={onReflect}
            >
              {written ? 'Keep writing' : 'Reflect'}
            </Button>
          </div>
        </div>
      </section>
      {classic && <SpurgeonRow now={now} className={styles.item} />}
    </section>
  );
}
