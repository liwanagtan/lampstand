import { useState, useSyncExternalStore } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster, TooltipProvider } from '@/design-system/components';
import { BibleGate } from '@/features/bible/BibleGate';
import { AccountLanding } from '@/features/welcome/AccountLanding';
import { useAccount } from '@/features/account/accountStore';
import { hasPassedInstallLanding, markInstallLandingPassed } from './entry';
import { isOnboarded } from './onboarding';
import { router } from './router';
import { isAppUpdateReady, subscribeToAppUpdate } from './pwa';
import { UpdateScreen } from './UpdateScreen';

export function App() {
  const updateReady = useSyncExternalStore(subscribeToAppUpdate, isAppUpdateReady);
  const accountStatus = useAccount((s) => s.status);
  const [showInstallLanding, setShowInstallLanding] = useState(
    () =>
      !isOnboarded() &&
      !hasPassedInstallLanding() &&
      window.location.pathname !== '/privacy',
  );

  const continueInBrowser = () => {
    markInstallLandingPassed();
    setShowInstallLanding(false);
  };

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      {accountStatus === 'loading' ? null : showInstallLanding && accountStatus === 'guest' ? (
        <AccountLanding onContinueGuest={continueInBrowser} />
      ) : (
        <BibleGate>
          <RouterProvider router={router} />
        </BibleGate>
      )}
      <Toaster />
      {updateReady && <UpdateScreen />}
    </TooltipProvider>
  );
}
