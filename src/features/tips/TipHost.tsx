import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, X } from 'lucide-react';
import { Button, IconButton } from '@/design-system/components';
import { db } from '@/db/db';
import { useBible } from '@/features/bible/bibleStore';
import { useReader } from '@/features/bible-app/readerStore';
import { useSettings } from '@/features/settings/settingsStore';
import { useReducedMotion } from '@/features/settings/theme';
import { useTips } from './tipStore';
import styles from './TipHost.module.css';

/** The one tip on screen, if any: do it, Not now, or Don't show this again. */
export function TipHost() {
  const tip = useTips((s) => s.current);
  const dismiss = useTips((s) => s.dismiss);
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const act = async () => {
    if (!tip) return;
    const settings = useSettings.getState();
    const { do: action } = tip.action({
      now: Date.now(),
      tips: settings.tips,
      features: settings.features,
      presenting: false,
      onboardedAt: null,
      counts: {},
      parallel: useReader.getState().parallel,
      activePlans: await db.plans.count(),
    });
    dismiss(false);
    if (action.kind === 'parallel') {
      const current = useReader.getState().translation;
      const other = useBible.getState().translations.find((t) => t.code !== current);
      if (other) useReader.getState().setParallel(other.code);
      return;
    }
    if (action.enable)
      await settings.set('features', { ...settings.features, [action.enable]: true });
    navigate(action.to);
  };

  const settings = useSettings.getState();
  const label = tip
    ? tip.action({
        now: 0,
        tips: settings.tips,
        features: settings.features,
        presenting: false,
        onboardedAt: null,
        counts: {},
        parallel: null,
        activePlans: 0,
      }).label
    : '';

  return (
    <AnimatePresence>
      {tip && (
        <motion.aside
          key={tip.id}
          className={styles.tip}
          role="status"
          aria-label="Tip"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className={styles.icon} aria-hidden>
            <Lightbulb size={18} />
          </span>
          <div className={styles.body}>
            <p className={styles.title}>{tip.title}</p>
            <p className={styles.text}>{tip.body}</p>
            <div className={styles.actions}>
              <Button size="sm" variant="primary" onClick={() => void act()}>
                {label}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dismiss(false)}>
                Not now
              </Button>
              <Button size="sm" variant="ghost" onClick={() => dismiss(true)}>
                Don’t show this again
              </Button>
            </div>
          </div>
          <IconButton
            label="Close tip"
            icon={<X size={16} />}
            size="sm"
            className={styles.close}
            onClick={() => dismiss(false)}
          />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
