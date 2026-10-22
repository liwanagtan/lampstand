import { useState, useSyncExternalStore } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster, TooltipProvider } from '@/design-system/components';
import { BibleGate } from '@/features/bible/BibleGate';
import { InstallLanding } from '@/features/welcome/InstallLanding';
import { hasPassedInstallLanding, markInstallLandingPassed } from './entry';
import { isInstalled } from './install';
import { isOnboarded } from './onboarding';
import { router } from './router';
import { isAppUpdateReady, subscribeToAppUpdate } from './pwa';
import { UpdateScreen } from './UpdateScreen';

export function App() {
  const updateReady = useSyncExternalStore(subscribeToAppUpdate, isAppUpdateReady);
  const [showInstallLanding, setShowInstallLanding] = useState(
    () =>
      !isOnboarded() &&
      !isInstalled() &&
      !hasPassedInstallLanding() &&
      window.location.pathname !== '/privacy',
  );

  const continueInBrowser = () => {
    markInstallLandingPassed();
    setShowInstallLanding(false);
  };

  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={200}>
      {showInstallLanding ? (
        <InstallLanding onContinue={continueInBrowser} />
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
