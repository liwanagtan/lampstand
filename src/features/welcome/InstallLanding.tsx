import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/design-system/components';
import { AnimatedLampMark, LampLockup } from '@/design-system/LampMark';
import { colors } from '@/design-system/tokens';
import { markInstallLandingPassed } from '@/app/entry';
import { canPromptInstall, isInstalled, promptInstall, subscribeToInstall } from '@/app/install';
import styles from './InstallLanding.module.css';

const palette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** A first-visit choice before profile data is saved in the browser or installed app. */
export function InstallLanding({ onContinue }: { onContinue: () => void }) {
  const canInstall = useSyncExternalStore(subscribeToInstall, canPromptInstall, () => false);
  const installed = useSyncExternalStore(subscribeToInstall, isInstalled, () => false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installAccepted, setInstallAccepted] = useState(false);
  const ios = isIosDevice();

  const handleInstall = async () => {
    if (!canInstall) {
      setShowInstructions(true);
      return;
    }
    try {
      const accepted = await promptInstall();
      setInstallAccepted(accepted);
      if (accepted) markInstallLandingPassed();
    } catch {
      setShowInstructions(true);
    }
  };

  return (
    <div className={styles.page} style={palette}>
      <header className={styles.top}>
        <LampLockup size={30} title="Lampstand" />
      </header>
      <main className={styles.main}>
        <AnimatedLampMark size={142} title="Lampstand" />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Welcome to Lampstand</p>
          <h1>Grow in faith, one day at a time.</h1>
          <p className={styles.lede}>
            Keep daily Scripture, reading plans and encouragement close wherever you are.
          </p>
        </div>
        {(installed || installAccepted) && !showInstructions ? (
          <p className={styles.guidance} role="status">
            Lampstand is ready to open from your home screen or apps. Continue setup there, or stay
            in this browser.
          </p>
        ) : (
          <>
            <Button
              variant="primary"
              icon={<Download size={18} aria-hidden />}
              className={styles.install}
              onClick={() => void handleInstall()}
            >
              Install Lampstand
            </Button>
            {showInstructions && (
              <div className={styles.guidance} role="status">
                {import.meta.env.DEV ? (
                  <>
                    <strong>Try installation on the published app</strong>
                    <span>This development preview does not offer installation.</span>
                  </>
                ) : ios ? (
                  <>
                    <strong>On iPhone or iPad</strong>
                    <span>Open this page in Safari, tap Share, then Add to Home Screen.</span>
                    <span>Open Lampstand from your home screen to set up your profile there.</span>
                  </>
                ) : (
                  <>
                    <strong>Install from your browser</strong>
                    <span>
                      Open Lampstand in your regular browser, then use its menu or address-bar
                      install icon to add it to your device.
                    </span>
                  </>
                )}
              </div>
            )}
          </>
        )}
        <Button variant="ghost" className={styles.continue} onClick={onContinue}>
          Continue in browser
        </Button>
        <p className={styles.note}>You can install Lampstand later from Settings.</p>
      </main>
    </div>
  );
}
