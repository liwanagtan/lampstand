import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, toast } from '@/design-system/components';
import { AnimatedLampMark } from '@/design-system/LampMark';
import { colors } from '@/design-system/tokens';
import { isOnboarded, markOnboarded } from '@/app/onboarding';
import { useSettings } from '@/features/settings/settingsStore';
import landing from '@/features/welcome/InstallLanding.module.css';
import { useAccount } from './accountStore';
import { useSync } from './syncStore';
import { GuestImportDialog } from './GuestImportDialog';
import {
  guestDataCount,
  guestImportPreview,
  importGuestData,
  type GuestImportSummary,
} from './guestImport';
import { decideGuestImport, guestImportDecided, takeImportAfterSignIn } from './guestImportChoice';

const palette = Object.fromEntries(
  Object.entries(colors.dark).map(([token, value]) => [`--color-${token}`, value]),
) as CSSProperties;

type Opening = 'checking' | 'failed' | 'done';

/** Imports guest data when the guest asked for it by signing in (SaveOffer). */
async function bringGuestIfAsked(userId: string): Promise<boolean> {
  if (guestImportDecided(userId) || !takeImportAfterSignIn()) return false;
  try {
    if (guestDataCount(await guestImportPreview()) === 0) return false;
    await importGuestData();
    decideGuestImport(userId, 'imported');
    return true;
  } catch {
    return false; // The usual choice dialog follows, and nothing was removed.
  }
}

/**
 * After sign-in: on a device this account has not set up, first loads the account (so a
 * returning person goes to Today, not Welcome); then offers once to bring in guest data.
 */
export function AccountGate({ children }: { children: ReactNode }) {
  const userId = useAccount((s) => (s.status === 'signed-in' ? (s.user?.id ?? null) : null));
  const [summary, setSummary] = useState<GuestImportSummary | null>(null);
  const [opening, setOpening] = useState<Opening>(() =>
    userId && !isOnboarded() ? 'checking' : 'done',
  );
  const syncStatus = useSync((s) => s.status);

  useEffect(() => {
    if (opening !== 'checking') return;
    let live = true;
    void useSync
      .getState()
      .syncNow()
      .then(async (result) => {
        if (!live) return;
        if (!result) return setOpening('failed');
        // A guest who signed in to keep their journey brings it in before anything shows.
        if (userId && (await bringGuestIfAsked(userId))) return window.location.assign('/');
        if (useSettings.getState().profile.name.trim()) markOnboarded();
        setOpening('done');
      });
    return () => {
      live = false;
    };
  }, [opening, userId]);

  useEffect(() => {
    if (!userId || opening !== 'done' || guestImportDecided(userId)) return;
    let live = true;
    void (async () => {
      if (await bringGuestIfAsked(userId)) return window.location.assign('/');
      const found = await guestImportPreview();
      if (live && guestDataCount(found) > 0) setSummary(found);
    })().catch(() => undefined);
    return () => {
      live = false;
    };
  }, [userId, opening]);

  if (opening !== 'done') {
    const offline = syncStatus === 'offline';
    return (
      <div className={landing.page} style={palette}>
        <main className={landing.main} aria-busy={opening === 'checking'}>
          <AnimatedLampMark size={120} title="Lampstand" />
          <div className={landing.copy}>
            <h1>
              {opening === 'checking' ? 'Opening your account…' : 'Your account could not load'}
            </h1>
            {opening === 'failed' && (
              <p className={landing.lede} role="alert">
                {offline
                  ? 'You seem to be offline. Connect to bring your plans and journal to this device.'
                  : 'Something went wrong while loading your plans and journal. Nothing was lost.'}
              </p>
            )}
          </div>
          {opening === 'failed' && (
            <>
              <Button
                variant="primary"
                className={landing.install}
                onClick={() => setOpening('checking')}
              >
                Try again
              </Button>
              <Button
                variant="ghost"
                className={landing.continue}
                onClick={() => setOpening('done')}
              >
                Set up on this device for now
              </Button>
            </>
          )}
        </main>
      </div>
    );
  }

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
