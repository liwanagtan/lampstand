import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTokens } from '@/design-system/tokens';
import '@/design-system/global.css';
import { App } from '@/app/App';
import { useSettings } from '@/features/settings/settingsStore';
import { registerServiceWorker } from '@/app/pwa';

applyTokens();
registerServiceWorker();

const root = createRoot(document.getElementById('root')!);

useSettings
  .getState()
  .load()
  .catch((err: unknown) => console.error('Failed to load settings', err))
  .finally(() => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });
