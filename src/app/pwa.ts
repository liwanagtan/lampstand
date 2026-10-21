// Service worker registration (PRD §10 Offline). Updates wait for the operator: an update is
// never applied in the middle of a service.
import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/design-system/components';
import { isPresentingPath } from './paths';

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const update = registerSW({
    onNeedRefresh() {
      const offerUpdate = () => {
        if (isPresentingPath(location.pathname)) return;
        window.clearInterval(waitUntilFinished);
        toast({
          title: 'A new version of Lampstand is ready',
          duration: 60_000,
          action: { label: 'Restart', onClick: () => void update(true) },
        });
      };
      // A presentation may finish long after the worker downloads. Offer its update when
      // the operator leaves the control screen instead of silently losing the notice.
      const waitUntilFinished = window.setInterval(offerUpdate, 2_000);
      offerUpdate();
    },
    onOfflineReady() {
      toast({ title: 'Lampstand is ready to work offline', tone: 'success' });
    },
  });
}
