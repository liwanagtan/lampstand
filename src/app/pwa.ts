// Service worker registration (PRD §10 Offline). Updates wait for the operator: an update is
// never applied in the middle of a service.
import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/design-system/components';
import { isPresentingPath } from './paths';

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const update = registerSW({
    onNeedRefresh() {
      if (isPresentingPath(location.pathname)) return;
      toast({
        title: 'A new version of Lampstand is ready',
        duration: 60_000,
        action: { label: 'Restart', onClick: () => void update(true) },
      });
    },
    onOfflineReady() {
      toast({ title: 'Lampstand is ready to work offline', tone: 'success' });
    },
  });
}
