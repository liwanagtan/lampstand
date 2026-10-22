import type { CSSProperties } from 'react';
import { Button } from '@/design-system/components';
import { AnimatedLampMark, LampLockup } from '@/design-system/LampMark';
import { colors } from '@/design-system/tokens';
import { useAccount } from '@/features/account/accountStore';
import { accountsConfigured } from '@/features/account/client';
import { track } from '@/features/insights/insights';
import styles from './InstallLanding.module.css';

const palette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

/** The first-visit account choice; guest use remains available during rollout. */
export function AccountLanding({ onContinueGuest }: { onContinueGuest: () => void }) {
  const signIn = useAccount((s) => s.signInWithGoogle);
  const error = useAccount((s) => s.error);

  return (
    <div className={styles.page} style={palette}>
      <header className={styles.top}>
        <LampLockup size={30} title="Lampstand" />
      </header>
      <main className={styles.main}>
        <AnimatedLampMark size={142} title="Lampstand" />
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Welcome to Lampstand</p>
          <h1>Your faith journey, saved.</h1>
          <p className={styles.lede}>
            Continue with Google to keep your plans, journal and notes on every device you use.
          </p>
        </div>
        <Button
          variant="primary"
          className={styles.install}
          disabled={!accountsConfigured}
          onClick={() => void signIn()}
        >
          Continue with Google
        </Button>
        {!accountsConfigured && (
          <p className={styles.note}>Google sign-in is being prepared for this preview.</p>
        )}
        {error && (
          <p className={styles.guidance} role="alert">
            {error}
          </p>
        )}
        <Button
          variant="ghost"
          className={styles.continue}
          onClick={() => {
            track('guest_chosen');
            onContinueGuest();
          }}
        >
          Continue without an account
        </Button>
        <p className={styles.note}>
          Guest progress stays on this device until you link an account.
        </p>
      </main>
    </div>
  );
}
