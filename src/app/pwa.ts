// Service worker registration (PRD §10 Offline). Updates wait for the operator: an update is
// never applied in the middle of a service.
import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/design-system/components';
import { isPresentingPath } from './paths';

let updateReady = false;
let applyPendingUpdate: (() => Promise<void>) | null = null;
const listeners = new Set<() => void>();

function setUpdateReady(value: boolean) {
  updateReady = value;
  listeners.forEach((listener) => listener());
}

export function subscribeToAppUpdate(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAppUpdateReady(): boolean {
  return updateReady;
}

export function postponeAppUpdate(): void {
  setUpdateReady(false);
}

export function installAppUpdate(): Promise<void> {
  return applyPendingUpdate?.() ?? Promise.resolve();
}

const CHECK_EVERY_MS = 30 * 60_000;
const MIN_GAP_MS = 60_000;

/**
 * The browser only looks for a new version when a page loads, and an installed app is usually
 * resumed, not reloaded. Look again when Lampstand comes back to the foreground (at most once a
 * minute) and every half hour while it stays open, so a deploy reaches the update screen.
 */
function checkForUpdates(registration: ServiceWorkerRegistration) {
  let lastCheck = Date.now();
  const check = () => {
    if (!navigator.onLine || Date.now() - lastCheck < MIN_GAP_MS) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // Offline or the server is unreachable: try again next time.
    });
  };
  window.setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('online', check);
}

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  const update = registerSW({
    onNeedRefresh() {
      applyPendingUpdate = () => update(true);
      const offerUpdate = () => {
        if (isPresentingPath(location.pathname)) return;
        window.clearInterval(waitUntilFinished);
        setUpdateReady(true);
      };
      // A presentation may finish long after the worker downloads. Offer its update when
      // the operator leaves the control screen instead of silently losing the notice.
      const waitUntilFinished = window.setInterval(offerUpdate, 2_000);
      offerUpdate();
    },
    onRegisteredSW(_url, registration) {
      if (registration) checkForUpdates(registration);
    },
    onOfflineReady() {
      toast({ title: 'Lampstand is ready to work offline', tone: 'success', quiet: true });
    },
  });
}
