import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('a daily reminder goes out at your reading time, and can go in your calendar', async ({
  page,
}) => {
  // Notifications are captured instead of shown.
  await page.addInitScript(() => {
    const notes: string[] = [];
    (window as unknown as { __notes: string[] }).__notes = notes;
    ServiceWorkerRegistration.prototype.showNotification = function (title: string) {
      notes.push(title);
      return Promise.resolve();
    };
    class FakeNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = () => Promise.resolve('granted' as NotificationPermission);
      constructor(title: string) {
        notes.push(title);
      }
    }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
  await page.clock.install({ time: new Date('2026-10-19T06:58:00') });
  await openApp(page, '/profile/settings');
  const notes = () => page.evaluate(() => (window as unknown as { __notes: string[] }).__notes);

  await page.getByRole('switch', { name: 'Morning reminder' }).click();
  await expect.poll(notes).toContain('Reminders are on');
  await expect(page.getByLabel('Morning time')).toHaveValue('07:00');

  await page.clock.fastForward('03:00');
  await expect.poll(notes).toContain('Time for today’s reading');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add reminder to calendar' }).click();
  expect((await download).suggestedFilename()).toBe('lampstand-reminders.ics');
});
