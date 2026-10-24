import { useEffect, useState } from 'react';
import { ListOrdered, MonitorPlay } from 'lucide-react';
import { EmptyState, cx } from '@/design-system/components';
import { db } from '@/db/db';
import { getTranslation, resolveTranslation } from '@/features/bible/bibleStore';
import { getPassage } from '@/features/bible/passage';
import { fromOsis } from '@/features/bible/ref';
import { useControl } from '../live/controlStore';
import { useVerses, type QueueItem } from './verseStore';
import styles from './VersePanels.module.css';

/** First line of a verse, for the queue list. */
function useFirstLine(ref: string, code: string): string | null {
  const [line, setLine] = useState<{ key: string; text: string } | null>(null);
  const key = `${code}|${ref}`;
  useEffect(() => {
    const t = getTranslation(code);
    const range = fromOsis(ref);
    if (!t || !range) return;
    let alive = true;
    void getPassage(db, t, range).then((p) => {
      if (alive) setLine({ key, text: p.verses.find((v) => !v.missing)?.text ?? '' });
    });
    return () => {
      alive = false;
    };
  }, [key, ref, code]);
  return line?.key === key ? line.text : null;
}

const GROUPS: { source: QueueItem['source']; label: string }[] = [
  { source: 'slide', label: 'On slides' },
  { source: 'attached', label: 'Other slide verses' },
  { source: 'extra', label: 'Likely mentioned' },
  { source: 'manual', label: 'Added' },
];

/** The sermon's verses as one-click buttons (PRD §7.5 Verse queue). */
export function QueuePanel({ translation }: { translation: string }) {
  const queue = useVerses((s) => s.queue);
  const slideIndex = useControl((s) => s.live.slideIndex);
  const current = queue.filter((q) => q.source === 'attached' && q.slideIndex === slideIndex);
  const currentKeys = new Set(current.map((q) => q.key));
  const groups = [
    { label: 'For this slide', items: current },
    ...GROUPS.map((g) => ({
      label: g.label,
      items: queue.filter((q) => q.source === g.source && !currentKeys.has(q.key)),
    })),
  ];
  if (queue.length === 0) {
    return (
      <EmptyState compact icon={<ListOrdered size={18} />} title="No verses queued">
        Reading slides, attached verses and likely references appear here. Press Ctrl+Enter in the
        command bar to add one.
      </EmptyState>
    );
  }
  return (
    <div className={styles.queue}>
      {groups.map((g) => {
        const items = g.items;
        if (!items.length) return null;
        return (
          <section key={g.label} aria-label={g.label}>
            <h3 className={styles.groupLabel}>{g.label}</h3>
            <ul className={styles.list} aria-label={g.label}>
              {items.map((q) => (
                <QueueRow key={q.key} item={q} translation={translation} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function QueueRow({ item, translation }: { item: QueueItem; translation: string }) {
  const code = resolveTranslation(item.translation, translation)?.code ?? translation;
  const line = useFirstLine(item.ref, code);
  const show = useVerses((s) => s.show);
  const shown = useVerses((s) => s.shown.has(item.ref));
  const live = useControl(
    (s) => s.live.overlay?.ref === item.ref && s.live.overlay?.translation === code,
  );
  return (
    <li>
      <button
        type="button"
        className={cx(styles.row, live && styles.live)}
        aria-current={live ? 'true' : undefined}
        onClick={() => void show({ ref: item.ref, translation: code, emphasis: item.emphasis })}
      >
        <span className={styles.text}>
          <span className={styles.label}>
            {item.label}
            {shown && !live && (
              <span className={styles.shownDot} title="Shown already" aria-label="shown" />
            )}
          </span>
          <span className={styles.preview}>{line ?? ' '}</span>
        </span>
        {live ? (
          <span className={styles.onScreen}>On screen</span>
        ) : (
          <MonitorPlay size={16} className={styles.go} aria-hidden />
        )}
      </button>
    </li>
  );
}
