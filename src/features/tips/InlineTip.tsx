import { Ember } from '@/features/tour/Ember';
import { tipLabel, useRunTip } from './runTip';
import { useTips } from './tipStore';
import type { Tip } from './tips';
import styles from './TipHost.module.css';

/** Where a page has room, Ember's tip sits in its flow: no peek, no scrim. */
export function InlineTip({ place }: { place: NonNullable<Tip['place']> }) {
  const tip = useTips((s) => s.inline);
  const later = useTips((s) => s.later);
  const run = useRunTip();
  if (tip?.place !== place) return null;
  return (
    <aside className={styles.inline} aria-labelledby={`tip-${tip.id}`}>
      <Ember pose="look" size={52} />
      <div className={styles.inlineBody}>
        <h3 id={`tip-${tip.id}`} className={styles.title}>
          {tip.title}
        </h3>
        <p className={styles.text}>{tip.body}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => void run(tip)}>
            {tipLabel(tip)}
          </button>
          <button type="button" className={styles.quiet} onClick={later}>
            Not now
          </button>
        </div>
      </div>
    </aside>
  );
}
