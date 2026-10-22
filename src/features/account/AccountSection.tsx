import { useEffect, useState } from 'react';
import { Button, Dialog, Toggle, toast } from '@/design-system/components';
import { downloadBackup } from '@/features/settings/backup';
import { Section } from '@/features/settings/Section';
import { useAccount } from './accountStore';
import { accountsConfigured } from './client';
import { GuestImportDialog } from './GuestImportDialog';
import { guestDataCount, guestImportPreview, type GuestImportSummary } from './guestImport';
import { decideGuestImport } from './guestImportChoice';
import { useSync } from './syncStore';
import styles from './AccountSection.module.css';

const when = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function SyncStatus() {
  const status = useSync((s) => s.status);
  const lastSyncedAt = useSync((s) => s.lastSyncedAt);
  const error = useSync((s) => s.error);
  const syncNow = useSync((s) => s.syncNow);
  const last = lastSyncedAt ? `Last synced ${when.format(lastSyncedAt)}.` : 'Not synced yet.';
  const line =
    status === 'syncing'
      ? 'Syncing…'
      : status === 'offline'
        ? `Offline. Changes are saved here and sync when you reconnect. ${last}`
        : status === 'error'
          ? `${error ?? 'Sync did not finish.'} ${last}`
          : `Your plans, journal, notes, highlights, preferences and reading place sync across your devices. ${last}`;
  return (
    <>
      <p role="status" aria-live="polite">
        {line}
      </p>
      <Button loading={status === 'syncing'} onClick={() => void syncNow()}>
        Sync now
      </Button>
    </>
  );
}

function DeleteAccount() {
  const deleteAccount = useAccount((s) => s.deleteAccount);
  const [open, setOpen] = useState(false);
  const [removeCopy, setRemoveCopy] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    setFailed(false);
    try {
      await deleteAccount(removeCopy);
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  };

  return (
    <>
      <Button variant="ghost" className={styles.danger} onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => !deleting && setOpen(next)}
        title="Delete your Lampstand account?"
        description="This removes your Lampstand sign-in and everything synced to it. Your Google account is not affected."
        footer={
          <>
            <Button variant="ghost" disabled={deleting} onClick={() => setOpen(false)}>
              Keep account
            </Button>
            <Button variant="primary" loading={deleting} onClick={() => void confirm()}>
              Delete account
            </Button>
          </>
        }
      >
        <p>
          Plans, journal entries, notes, highlights and preferences are deleted from the server and
          from your other devices the next time they connect. Export a backup first if you want a
          copy.
        </p>
        <Toggle
          checked={removeCopy}
          onChange={setRemoveCopy}
          label="Also remove the copy on this device"
          description="Off: the records stay in this browser, out of sight, until you sign in again or clear site data."
        />
        {failed && (
          <p role="alert">
            Your account could not be deleted. Check your connection and try again. Nothing was
            removed.
          </p>
        )}
      </Dialog>
    </>
  );
}

export function AccountSection() {
  const status = useAccount((s) => s.status);
  const userId = useAccount((s) => s.user?.id);
  const email = useAccount((s) => s.user?.email);
  const error = useAccount((s) => s.error);
  const signIn = useAccount((s) => s.signInWithGoogle);
  const signOut = useAccount((s) => s.signOut);
  const [guest, setGuest] = useState<GuestImportSummary | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'signed-in')
      void guestImportPreview()
        .then(setGuest)
        .catch(() => setGuest(null));
  }, [status]);

  const exportCopy = async () => {
    setExporting(true);
    try {
      await downloadBackup();
      toast({ title: 'Backup saved', tone: 'success' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Section
      title="Account"
      description={
        status === 'signed-in'
          ? `Signed in with Google${email ? ` as ${email}` : ''}.`
          : 'You are using Lampstand on this device without an account.'
      }
    >
      {status === 'signed-in' ? (
        <div className={styles.content}>
          <SyncStatus />
          {guest && guestDataCount(guest) > 0 && (
            <Button onClick={() => setImportOpen(true)}>Bring guest data into this account</Button>
          )}
          <Button loading={exporting} onClick={() => void exportCopy()}>
            Export a copy
          </Button>
          <Button variant="ghost" onClick={() => void signOut()}>
            Sign out
          </Button>
          <DeleteAccount />
          <p className={styles.small}>
            Signing out keeps this account's records on this device, out of sight of anyone who uses
            Lampstand here without signing in.
          </p>
        </div>
      ) : (
        <div className={styles.content}>
          <p>
            Sign in with Google to keep your plans and journal across your devices. What you have
            here stays on this device until you choose to bring it in.
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
          setGuest(null);
          setMessage(
            `Guest data added: ${changed.plans} plans, ${changed.entries} journal entries and ${changed.marks} highlights, bookmarks or notes.`,
          );
        }}
      />
    </Section>
  );
}
