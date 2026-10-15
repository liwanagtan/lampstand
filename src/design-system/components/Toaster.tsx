import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { useReducedMotion } from '@/features/settings/theme';
import { presets, transition } from '../motion/presets';
import { useToasts } from './toastStore';
import styles from './Toaster.module.css';

const ICON = { neutral: Info, success: CheckCircle2, warning: TriangleAlert } as const;

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  const reduced = useReducedMotion();
  const variants = presets.toast(reduced);
  return (
    <div className={styles.viewport} role="region" aria-label="Notifications">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <motion.div
              key={t.id}
              layout={!reduced}
              className={styles.toast}
              role="status"
              aria-live="polite"
              variants={variants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={transition('standard', reduced)}
            >
              <Icon size={18} className={styles[t.tone]} aria-hidden />
              <div className={styles.text}>
                <p className={styles.title}>{t.title}</p>
                {t.description && <p className={styles.description}>{t.description}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className={styles.close}
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                <X size={14} aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
