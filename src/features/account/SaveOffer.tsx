import { useEffect, useState } from 'react';
import { Button, Dialog } from '@/design-system/components';
import { db } from '@/db/db';
import { track } from '@/features/insights/insights';
import { useAccount } from './accountStore';
import { accountsConfigured } from './client';
import { GoogleMark } from './GoogleMark';
import { requestImportAfterSignIn } from './guestImportChoice';

const DISMISSED_KEY = 'lampstand.saveOffer.dismissed';

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) !== null;
  } catch {
    return true;
  }
}

/** A guest has something worth keeping: a finished reading or something written. */
async function hasSomethingToKeep(): Promise<boolean> {
  const [plans, entries] = await Promise.all([db.plans.toArray(), db.entries.count()]);
  return entries > 0 || plans.some((p) => p.done.length > 0);
}

/**
 * On Today, once: after a guest's first finished reading or reflection, offer to keep it on
 * every device. Asking then, not at the door, gives the account a concrete reason.
 */
export function SaveOffer() {
  const guest = useAccount((s) => s.status === 'guest');
  const signIn = useAccount((s) => s.signInWithGoogle);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!guest || !accountsConfigured || dismissed()) return;
    let live = true;
    const timer = setTimeout(() => {
      void hasSomethingToKeep().then((yes) => {
        if (!live || !yes) return;
        setOpen(true);
        track('save_offer_shown');
      });
    }, 700);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [guest]);

  const notNow = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Shown again next visit.
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && notNow()}
      size="sm"
      title="Keep your journey"
      description="Your plans and journal, on every device you use."
      footer={
        <>
          <Button variant="ghost" onClick={notNow}>
            Not now
          </Button>
          <Button
            variant="primary"
            icon={<GoogleMark />}
            onClick={() => {
              requestImportAfterSignIn();
              void signIn();
            }}
          >
            Continue with Google
          </Button>
        </>
      }
    />
  );
}
