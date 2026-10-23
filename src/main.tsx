import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTokens } from '@/design-system/tokens';
import '@/design-system/global.css';
import { App } from '@/app/App';
import { useSettings } from '@/features/settings/settingsStore';
import { registerServiceWorker } from '@/app/pwa';
import { listenForInstall } from '@/app/install';
import { markProfileOpened, useAccount } from '@/features/account/accountStore';
import { db, selectAccountDatabase } from '@/db/db';
import { publishActiveDatabase } from '@/db/activeProfile';
import { selectOnboardingAccount } from '@/app/onboarding';
import { selectAccountStorage } from '@/features/account/storage';
import { useReader } from '@/features/bible-app/readerStore';
import { startSync, useSync } from '@/features/account/syncStore';
import { isOnboarded } from '@/app/onboarding';
import { startInsights } from '@/features/insights/insights';

applyTokens();
listenForInstall();
registerServiceWorker();
startInsights();

const root = createRoot(document.getElementById('root')!);

useAccount
  .getState()
  .init()
  .catch((err: unknown) => console.error('Failed to load account session', err))
  .then(() => {
    const userId = useAccount.getState().user?.id ?? null;
    selectAccountDatabase(userId);
    selectOnboardingAccount(userId);
    selectAccountStorage(userId);
    markProfileOpened(userId);
    void publishActiveDatabase(db.name);
    useReader.getState().reloadFromStorage();
    return useSettings
      .getState()
      .load()
      .then(() => {
        if (!userId) return;
        startSync(userId);
        // A device this account has not set up loads the account first (AccountGate).
        if (isOnboarded()) void useSync.getState().syncNow();
      });
  })
  .catch((err: unknown) => console.error('Failed to load settings', err))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
