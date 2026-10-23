import { useState, useSyncExternalStore } from 'react';
import { Smartphone, X } from 'lucide-react';
import { Button, IconButton } from '@/design-system/components';
import { canPromptInstall, isInstalled, promptInstall, subscribeToInstall } from '@/app/install';
import { usePlanProgress } from './plans';
import styles from './InstallOffer.module.css';

const DISMISSED_KEY = 'lampstand.installOffer.dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return true;
  }
}

/**
 * Phones, once: after the first finished reading, offer to keep Lampstand on the home screen.
 * Browsers that can install show the button; Safari gets the two taps it needs.
 */
export function InstallOffer() {
  const canInstall = useSyncExternalStore(subscribeToInstall, canPromptInstall, () => false);
  const installed = useSyncExternalStore(subscribeToInstall, isInstalled, () => false);
  const progress = usePlanProgress();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const readOnce = Boolean(progress?.some((p) => p.done.length > 0));
  if (installed || dismissed || !readOnce || !(canInstall || isIos)) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Without storage it simply shows again next time.
    }
    setDismissed(true);
  };

  return (
    <section className={styles.offer} aria-label="Add Lampstand to your home screen">
      <Smartphone size={22} className={styles.icon} aria-hidden />
      <div className={styles.text}>
        <strong>Keep Lampstand on your home screen</strong>
        <span>
          {canInstall
            ? 'Open tomorrow’s reading in one tap, even offline.'
            : 'In Safari, tap Share, then Add to Home Screen.'}
        </span>
        {canInstall && (
          <Button
            variant="primary"
            size="sm"
            className={styles.install}
            onClick={() => void promptInstall().then(close)}
          >
            Add to home screen
          </Button>
        )}
      </div>
      <IconButton label="Not now" icon={<X size={16} />} size="sm" onClick={close} />
    </section>
  );
}
