import { useSyncExternalStore } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/design-system/components';
import { canPromptInstall, isInstalled, promptInstall, subscribeToInstall } from '@/app/install';
import { Section } from './Section';
import styles from './SettingsPage.module.css';

export function InstallSection() {
  const canInstall = useSyncExternalStore(subscribeToInstall, canPromptInstall, () => false);
  const installed = useSyncExternalStore(subscribeToInstall, isInstalled, () => false);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <Section
      title="Install Lampstand"
      description="Open Lampstand from your home screen or desktop, even when you are offline."
    >
      {import.meta.env.DEV ? (
        <p className={styles.small}>
          This development preview cannot be installed. Open the production build in Chrome to
          install Lampstand.
        </p>
      ) : installed ? (
        <p className={styles.small}>Lampstand is installed on this device.</p>
      ) : canInstall ? (
        <Button
          variant="primary"
          icon={<Download size={16} />}
          onClick={() => void promptInstall()}
        >
          Install Lampstand
        </Button>
      ) : (
        <p className={styles.small}>
          {isIos
            ? 'In Safari, tap Share, then Add to Home Screen.'
            : 'Use your browser menu to install Lampstand or add it to your home screen.'}
        </p>
      )}
      <p className={styles.small}>
        Your reading progress and journal stay on this device. Export a backup before moving to
        another device.
      </p>
    </Section>
  );
}
