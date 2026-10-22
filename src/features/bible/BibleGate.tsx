import { useEffect, type ReactNode } from 'react';
import { LampMark } from '@/design-system/LampMark';
import { Button } from '@/design-system/components';
import { requestPersistentStorage } from '@/db/db';
import { useApplyDocumentTheme } from '@/features/settings/theme';
import { useBible } from './bibleStore';
import styles from './BibleGate.module.css';

/** Loads the bundled translations on first run (PRD §6), then shows the app. */
export function BibleGate({ children }: { children: ReactNode }) {
  const status = useBible((s) => s.status);
  const init = useBible((s) => s.init);

  useEffect(() => {
    void init();
    void requestPersistentStorage();
  }, [init]);

  if (status === 'ready') return <>{children}</>;
  return <PreparingScreen />;
}

function PreparingScreen() {
  useApplyDocumentTheme();
  const status = useBible((s) => s.status);
  const progress = useBible((s) => s.progress);
  const error = useBible((s) => s.error);
  const init = useBible((s) => s.init);
  const preparing = status === 'preparing';
  const overall = progress.total ? (progress.done + progress.fraction) / progress.total : 0;

  return (
    <div className={styles.root}>
      <div className={styles.card} role="status" aria-live="polite">
        <LampMark size={48} className={styles.mark} />
        {status === 'error' ? (
          <>
            <h1 className={styles.title}>Bibles couldn't be prepared</h1>
            <p className={styles.text}>{error}</p>
            <Button variant="primary" onClick={() => void init()}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <h1 className={styles.title}>
              {preparing
                ? `Preparing Bibles… ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`
                : 'Starting Lampstand…'}
            </h1>
            <p className={styles.text}>
              {preparing
                ? `${progress.name}. Built-in translations will be available offline.`
                : ' '}
            </p>
            <div
              className={styles.track}
              role="progressbar"
              aria-label="Preparing Bibles"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(overall * 100)}
            >
              <div
                className={styles.bar}
                style={{ transform: `scaleX(${preparing ? overall : 0})` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
