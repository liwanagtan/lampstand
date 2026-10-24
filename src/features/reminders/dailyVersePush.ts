// The verse of the day at 8:00 (docs/SHARING-AND-DAILY-VERSE.md). Unlike the reading
// reminders, this comes from the Lampstand Worker as a push, so it arrives with the app closed.
// Turning it on gives the Worker this browser's push address, its time zone and the time;
// turning it off deletes them.
import { fromB64url } from '../../../worker/webpush';

export const DAILY_VERSE_TIME = '08:00';

export type PushOutcome =
  'on' | 'off' | 'blocked' | 'unsupported' | 'install-first' | 'unavailable' | 'failed';

/** iPhone and iPad allow push only to Lampstand added to the Home Screen. */
export function needsHomeScreen(): boolean {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function post(path: string, body: unknown): Promise<boolean> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/** Ask, subscribe and tell the Worker. Safe to call again to change the time. */
export async function turnOnDailyVerse(time: string): Promise<PushOutcome> {
  if (needsHomeScreen()) return 'install-first';
  if (!pushSupported()) return 'unsupported';
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') return 'blocked';
  try {
    const key = await fetch('/api/push/key').then((r) =>
      r.ok ? (r.json() as Promise<{ publicKey: string }>) : null,
    );
    if (!key) return 'unavailable';
    const reg = await navigator.serviceWorker.ready;
    const subscription =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: fromB64url(key.publicKey),
      }));
    const ok = await post('/api/push/subscribe', {
      subscription: subscription.toJSON(),
      tz: zone(),
      time,
    });
    return ok ? 'on' : 'failed';
  } catch {
    return 'failed';
  }
}

/** Unsubscribe here and have the Worker forget this browser. */
export async function turnOffDailyVerse(): Promise<PushOutcome> {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const subscription = await reg?.pushManager.getSubscription();
    if (subscription) {
      await post('/api/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => false);
      await subscription.unsubscribe();
    }
    return 'off';
  } catch {
    return 'failed';
  }
}
