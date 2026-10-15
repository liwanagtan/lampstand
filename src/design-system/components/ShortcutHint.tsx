import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSettings } from '@/features/settings/settingsStore';
import { useReducedMotion } from '@/features/settings/theme';
import { motionDetail } from '../tokens';
import { Kbd } from './Kbd';
import styles from './ShortcutHint.module.css';

export const HINT_USES = 5;

/**
 * Shows the keyboard shortcut beside an action when it is clicked with the mouse, for its
 * first five uses only (PRD §9 General states).
 */
export function ShortcutHint({
  id,
  keys,
  children,
}: {
  id: string;
  keys: string;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(0);
  const reduced = useReducedMotion();
  return (
    <span
      className={styles.anchor}
      onClickCapture={(e) => {
        if (e.detail === 0) return; // keyboard activation: they already know
        const { shortcutHints, set } = useSettings.getState();
        const used = shortcutHints[id] ?? 0;
        if (used >= HINT_USES) return;
        void set('shortcutHints', { ...shortcutHints, [id]: used + 1 });
        const stamp = Date.now();
        setVisible(stamp);
        setTimeout(() => setVisible((v) => (v === stamp ? 0 : v)), motionDetail.savedFade);
      }}
    >
      {children}
      <AnimatePresence>
        {visible > 0 && (
          <motion.span
            key={visible}
            className={styles.hint}
            role="status"
            initial={{ opacity: 0, y: reduced ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.12 : 0.14 }}
          >
            Tip: press <Kbd>{keys}</Kbd>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
