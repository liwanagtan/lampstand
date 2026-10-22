import { Button } from '@/design-system/components';
import { Section } from '@/features/settings/Section';
import { useAccount } from './accountStore';
import { accountsConfigured } from './client';

export function AccountSection() {
  const status = useAccount((s) => s.status);
  const email = useAccount((s) => s.user?.email);
  const error = useAccount((s) => s.error);
  const signIn = useAccount((s) => s.signInWithGoogle);
  const signOut = useAccount((s) => s.signOut);

  return (
    <Section
      title="Account"
      description={status === 'signed-in' ? 'Your Google account is connected.' : 'You are using Lampstand on this device.'}
    >
      {status === 'signed-in' ? (
        <div>
          <p>{email}</p>
          <p>Cross-device sync is being prepared. Your current records remain on this device.</p>
          <Button variant="ghost" onClick={() => void signOut()}>Sign out</Button>
        </div>
      ) : (
        <div>
          <p>Sign in to begin setting up an account. Guest progress stays on this device until you choose to import it.</p>
          <Button disabled={!accountsConfigured} onClick={() => void signIn()}>Continue with Google</Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </Section>
  );
}
