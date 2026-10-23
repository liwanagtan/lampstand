import { useEffect, type CSSProperties } from 'react';
import { Button } from '@/design-system/components';
import { AnimatedLampMark } from '@/design-system/LampMark';
import { colors } from '@/design-system/tokens';
import { useStatusBarColor } from '@/features/settings/theme';
import { useAccount } from '@/features/account/accountStore';
import { useBible } from '@/features/bible/bibleStore';
import { accountsConfigured } from '@/features/account/client';
import { GoogleMark } from '@/features/account/GoogleMark';
import { track } from '@/features/insights/insights';
import styles from './InstallLanding.module.css';

const palette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

/**
 * The first visit: one clear way in. New readers start straight away; saving to an account is
 * offered later, once there is something to keep. Returning readers sign in.
 */
export function AccountLanding({ onContinueGuest }: { onContinueGuest: () => void }) {
  const signIn = useAccount((s) => s.signInWithGoogle);
  const error = useAccount((s) => s.error);
  useStatusBarColor(colors.dark.bg);
  // Prepare the offline Bibles while the person decides, so Welcome opens without a wait.
  useEffect(() => void useBible.getState().init(), []);

  return (
    <div className={styles.page} style={palette}>
      <main className={styles.main}>
        <AnimatedLampMark size={132} title="Lampstand" />
        <h1 className={styles.title}>Grow in the Word, every day.</h1>
        <div className={styles.choices}>
          <Button
            variant="primary"
            className={styles.install}
            onClick={() => {
              track('guest_chosen');
              onContinueGuest();
            }}
          >
            Get started
          </Button>
          {accountsConfigured && (
            <Button
              variant="ghost"
              className={styles.continue}
              icon={<GoogleMark />}
              onClick={() => void signIn()}
            >
              I have an account
            </Button>
          )}
        </div>
        {error && (
          <p className={styles.guidance} role="alert">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
