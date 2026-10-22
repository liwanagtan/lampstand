import { useEffect, useState } from 'react';
import { Button } from '@/design-system/components';
import { Section } from '@/features/settings/Section';
import { useAccount } from './accountStore';
import { accountsConfigured } from './client';
import { GuestImportDialog } from './GuestImportDialog';
import { guestDataCount, guestImportPreview, type GuestImportSummary } from './guestImport';
import { decideGuestImport } from './guestImportChoice';
import styles from './AccountSection.module.css';

export function AccountSection() {
  const status = useAccount((s) => s.status);
  const userId = useAccount((s) => s.user?.id);
  const email = useAccount((s) => s.user?.email);
  const error = useAccount((s) => s.error);
  const signIn = useAccount((s) => s.signInWithGoogle);
  const signOut = useAccount((s) => s.signOut);
  const [guest, setGuest] = useState<GuestImportSummary | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'signed-in')
      void guestImportPreview()
        .then(setGuest)
        .catch(() => setGuest(null));
  }, [status]);

  return (
    <Section
      title="Account"
      description={
        status === 'signed-in'
          ? 'Your Google account is connected.'
          : 'You are using Lampstand on this device.'
      }
    >
      {status === 'signed-in' ? (
        <div className={styles.content}>
          <p>{email}</p>
          <p>Cross-device sync is being prepared. Your current records remain on this device.</p>
          {guest && guestDataCount(guest) > 0 && (
            <Button onClick={() => setImportOpen(true)}>Bring guest data into this account</Button>
          )}
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      ) : (
        <div className={styles.content}>
          <p>
            Sign in to begin setting up an account. Guest progress stays on this device until you
            choose to import it.
          </p>
          <Button disabled={!accountsConfigured} onClick={() => void signIn()}>
            Continue with Google
          </Button>
        </div>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <GuestImportDialog
        open={importOpen}
        summary={guest}
        onClose={() => setImportOpen(false)}
        onImported={(changed) => {
          if (userId) decideGuestImport(userId, 'imported');
          setImportOpen(false);
          setMessage(
            `Guest data added: ${changed.plans} plans, ${changed.entries} journal entries and ${changed.marks} highlights, bookmarks or notes.`,
          );
        }}
      />
    </Section>
  );
}
