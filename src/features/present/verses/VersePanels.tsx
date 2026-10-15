import { motion } from 'motion/react';
import { BookOpen, History as HistoryIcon, ListOrdered } from 'lucide-react';
import { EmptyState, cx } from '@/design-system/components';
import { relativeTime } from '@/lib/time';
import { useReducedMotion } from '@/features/settings/theme';
import { useVerses, type QueueItem } from './verseStore';
import styles from './VersePanels.module.css';

function Checkmark({ shown }: { shown: boolean }) {
  const reduced = useReducedMotion();
  return (
    <span className={cx(styles.check, shown && styles.checked)} aria-hidden>
      {shown && (
        <svg viewBox="0 0 16 16" width="12" height="12">
          <motion.path
            d="M3 8.5l3.2 3L13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: 'easeOut' }}
          />
        </svg>
      )}
    </span>
  );
}

const sourceLabel = (q: QueueItem) =>
  q.source === 'slide'
    ? `Slide ${(q.slideIndex ?? 0) + 1}`
    : q.source === 'extra'
      ? 'Likely mentioned'
      : 'Added';

export function QueuePanel({ translation }: { translation: string }) {
  const queue = useVerses((s) => s.queue);
  const shown = useVerses((s) => s.shown);
  const show = useVerses((s) => s.show);
  if (queue.length === 0) {
    return (
      <EmptyState compact icon={<ListOrdered size={18} />} title="No verses queued">
        Verse slides and extra references from this sermon appear here. Press Ctrl+Enter in the
        command bar to add one.
      </EmptyState>
    );
  }
  return (
    <ul className={styles.list} aria-label="Verse queue">
      {queue.map((q) => (
        <li key={q.key}>
          <button
            type="button"
            className={styles.row}
            onClick={() =>
              void show({
                ref: q.ref,
                translation: q.translation ?? translation,
                emphasis: q.emphasis,
              })
            }
          >
            <Checkmark shown={shown.has(q.ref)} />
            <span className={styles.text}>
              <span className={styles.label}>{q.label}</span>
              <span className={styles.meta}>{sourceLabel(q)}</span>
            </span>
            <BookOpen size={14} className={styles.go} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function HistoryPanel() {
  const history = useVerses((s) => s.history);
  const show = useVerses((s) => s.show);
  if (history.length === 0) {
    return (
      <EmptyState compact icon={<HistoryIcon size={18} />} title="Nothing shown yet">
        Every verse you show this session is listed here, newest first.
      </EmptyState>
    );
  }
  return (
    <ul className={styles.list} aria-label="Verse history">
      {history.map((h) => (
        <li key={h.key}>
          <button
            type="button"
            className={styles.row}
            onClick={() => void show({ ref: h.ref, translation: h.translation })}
          >
            <span className={styles.text}>
              <span className={styles.label}>
                {h.label} <span className={styles.code}>{h.translation}</span>
              </span>
              <span className={styles.meta}>{relativeTime(h.shownAt)}</span>
            </span>
            <BookOpen size={14} className={styles.go} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
