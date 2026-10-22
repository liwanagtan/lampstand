import { useEffect, useState, type ReactNode } from 'react';
import { toast } from '@/design-system/components';
import { useAccount } from './accountStore';
import { GuestImportDialog } from './GuestImportDialog';
import { guestDataCount, guestImportPreview, type GuestImportSummary } from './guestImport';
import { decideGuestImport, guestImportDecided } from './guestImportChoice';

/** After sign-in, offers once to bring this device's guest data into the account. */
export function AccountGate({ children }: { children: ReactNode }) {
  const userId = useAccount((s) => (s.status === 'signed-in' ? (s.user?.id ?? null) : null));
  const [summary, setSummary] = useState<GuestImportSummary | null>(null);

  useEffect(() => {
    if (!userId || guestImportDecided(userId)) return;
    let live = true;
    guestImportPreview()
      .then((s) => live && guestDataCount(s) > 0 && setSummary(s))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId]);

  return (
    <>
      {children}
      {userId && (
        <GuestImportDialog
          open={summary !== null}
          summary={summary}
          onClose={() => {
            decideGuestImport(userId, 'later');
            setSummary(null);
            toast({
              title: 'Your guest data stays on this device. Bring it in any time from Settings.',
            });
          }}
          onImported={() => {
            decideGuestImport(userId, 'imported');
            // Start fresh so every screen shows the account with its new records.
            window.location.assign('/');
          }}
        />
      )}
    </>
  );
}
