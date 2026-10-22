// Showing a reminder and keeping Android's background check registered.

export const REMINDER_TAG = 'lampstand-reminder';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Asks once; resolves to whether reminders may show. */
export async function askPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export async function showReminder(title: string, body: string, tag = REMINDER_TAG): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/' },
  };
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

interface PeriodicSync {
  register: (tag: string, options: { minInterval: number }) => Promise<void>;
  unregister: (tag: string) => Promise<void>;
}

/** Android, installed: the app wakes now and then and reminds you if you haven't read yet. */
export async function setBackgroundCheck(on: boolean): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sync = (reg as (ServiceWorkerRegistration & { periodicSync?: PeriodicSync }) | undefined)
      ?.periodicSync;
    if (!sync) return;
    if (!on) return void (await sync.unregister(REMINDER_TAG));
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    });
    if (status.state === 'granted')
      await sync.register(REMINDER_TAG, { minInterval: 3 * 3600_000 });
  } catch {
    // Background checks are a bonus where the platform allows them.
  }
}
