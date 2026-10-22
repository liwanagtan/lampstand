import { useState } from 'react';
import { BookOpen, NotebookPen, Heart } from 'lucide-react';
import { Button, cx } from '@/design-system/components';
import type { JournalEntryRecord } from '@/db/types';
import { localDate } from './dailyVerses';
import { EntrySheet } from './JournalEntrySheet';
import { newEntryId, type EntryDraft } from './journal';
import styles from './ReflectionMoment.module.css';

/** Optional response after a reading. Saving a journal entry never marks a reading complete. */
export function ReflectionMoment({
  question,
  prayer,
  reference,
  title,
  source,
  chapter,
  saved,
  plain = false,
  onFinish,
  onReturn,
}: {
  question: string;
  prayer?: string;
  reference: string;
  title: string;
  source?: { planId: string; planDay: number };
  chapter?: { book: string; number: number };
  saved: JournalEntryRecord | null | undefined;
  plain?: boolean;
  onFinish: () => void;
  onReturn: () => void;
}) {
  const [writing, setWriting] = useState<{ id: string; draft?: EntryDraft } | null>(null);
  const [praying, setPraying] = useState(false);
  const write = () => {
    if (saved) return setWriting({ id: saved.id });
    const id = newEntryId();
    setWriting({
      id,
      draft: {
        id,
        date: localDate(),
        kind: 'reflection',
        ref: reference,
        title,
        body: '',
        planId: source?.planId,
        planDay: source?.planDay,
        chapterBook: chapter?.book,
        chapterNumber: chapter?.number,
      },
    });
  };

  return (
    <div className={cx(styles.moment, plain && styles.plain)}>
      <p className={styles.eyebrow}>A moment to reflect</p>
      <p className={styles.question}>{question}</p>
      <p className={styles.optional}>You can respond in your own way, or simply continue.</p>
      <div className={styles.actions}>
        <Button icon={<NotebookPen size={16} />} onClick={write}>
          {saved ? 'Edit reflection' : 'Write a reflection'}
        </Button>
        <Button
          variant="secondary"
          icon={<Heart size={16} />}
          onClick={() => setPraying((value) => !value)}
        >
          Pray
        </Button>
      </div>
      {praying && (
        <p className={styles.prayer}>
          {prayer || 'Take a moment to speak to God about what you read.'}
        </p>
      )}
      <div className={styles.exitActions}>
        <Button variant="ghost" icon={<BookOpen size={16} />} onClick={onReturn}>
          Return to passage
        </Button>
        <Button variant="ghost" onClick={onFinish}>
          Finish for now
        </Button>
      </div>
      <EntrySheet target={writing} onClose={() => setWriting(null)} />
    </div>
  );
}
