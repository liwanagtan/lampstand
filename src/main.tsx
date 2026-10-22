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

applyTokens();
listenForInstall();
registerServiceWorker();

const root = createRoot(document.getElementById('root')!);

useAccount.getState().init()
  .catch((err: unknown) => console.error('Failed to load account session', err))
  .then(() => {
    const userId = useAccount.getState().user?.id ?? null;
    selectAccountDatabase(userId);
    selectOnboardingAccount(userId);
    selectAccountStorage(userId);
    markProfileOpened(userId);
    void publishActiveDatabase(db.name);
    useReader.getState().reloadFromStorage();
    return useSettings.getState().load();
  })
  .catch((err: unknown) => console.error('Failed to load settings', err))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
