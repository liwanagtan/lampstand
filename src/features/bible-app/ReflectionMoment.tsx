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
      {/* Two clear choices: write, or be done. Prayer and the passage stay a quiet tap away. */}
      <div className={styles.actions}>
        <Button variant="gold" icon={<NotebookPen size={16} />} onClick={write}>
          {saved ? 'Edit reflection' : 'Write a reflection'}
        </Button>
        <Button onClick={onFinish}>Done</Button>
      </div>
      {praying && (
        <p className={styles.prayer}>
          {prayer || 'Take a moment to speak to God about what you read.'}
        </p>
      )}
      <div className={styles.exitActions}>
        <Button
          variant="ghost"
          size="sm"
          icon={<Heart size={15} />}
          aria-pressed={praying}
          onClick={() => setPraying((value) => !value)}
        >
          Pray
        </Button>
        <Button variant="ghost" size="sm" icon={<BookOpen size={15} />} onClick={onReturn}>
          Back to the passage
        </Button>
      </div>
      <EntrySheet target={writing} onClose={() => setWriting(null)} />
    </div>
  );
}
