import { expect, test, type Browser, type Page } from '@playwright/test';
import { USER, fakeRecords, host, storedSession } from './account';

test.skip(!host, 'Supabase is not configured for this build');
test.describe.configure({ timeout: 90_000 });

const ACCOUNT_DB = `lampstand-account-${USER.id}`;

async function openDevice(
  browser: Browser,
  server: ReturnType<typeof fakeRecords>,
  { setUp = true } = {},
): Promise<Page> {
  const context = await browser.newContext({
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [
            { name: 'lampstand.onboarded', value: '1' },
            ...(setUp ? [{ name: `lampstand.onboarded.${USER.id}`, value: '1' }] : []),
            storedSession(),
          ],
        },
      ],
    },
  });
  const page = await context.newPage();
  await page.route(`https://${host}/**`, server.handler);
  return page;
}

/** Writes straight to this device's account database, as the journal would. */
function writeEntry(page: Page, body: string | null) {
  return page.evaluate(
    ({ name, body }) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(name);
        req.onsuccess = () => {
          const tx = req.result.transaction('entries', 'readwrite');
          const store = tx.objectStore('entries');
          if (body === null) store.delete('e-shared');
          else
            store.put({
              id: 'e-shared',
              date: '2026-10-23',
              kind: 'journal',
              body,
              createdAt: 1,
              updatedAt: Date.now(),
            });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { name: ACCOUNT_DB, body },
  );
}

async function syncNow(page: Page) {
  await page.goto('/profile/settings');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Last synced/ })).toBeVisible({
    timeout: 15_000,
  });
}

test('a journal entry and its deletion reach the other device', async ({ browser }) => {
  const server = fakeRecords();
  const phone = await openDevice(browser, server);
  await phone.goto('/');
  await expect(phone.locator('#main')).toBeVisible({ timeout: 60_000 });
  await writeEntry(phone, 'Written on the phone');
  await syncNow(phone);
  expect(server.rows.get('entry/e-shared')).toMatchObject({ deleted: false });

  const laptop = await openDevice(browser, server);
  await laptop.goto('/profile');
  await expect(laptop.getByText('Written on the phone')).toBeVisible({ timeout: 60_000 });

  await writeEntry(laptop, null);
  await syncNow(laptop);
  expect(server.rows.get('entry/e-shared')).toMatchObject({ deleted: true });

  await syncNow(phone);
  await phone.goto('/profile');
  await expect(phone.locator('#main')).toBeVisible();
  await expect(phone.getByText('Written on the phone')).toHaveCount(0);
});

test('a returning person opens on Today on a new device, not Welcome', async ({ browser }) => {
  const server = fakeRecords();
  server.rows.set('profile/profile', {
    kind: 'profile',
    record_id: 'profile',
    data: { value: { name: 'Grace' } },
    deleted: false,
    updated_at: new Date().toISOString(),
  });
  const page = await openDevice(browser, server, { setUp: false });
  await page.goto('/');
  await expect(page.locator('#main')).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /Profile: your journey/ })).toHaveText('G');
});

test('offline, Settings says changes will sync later', async ({ browser }) => {
  const server = fakeRecords();
  const page = await openDevice(browser, server);
  await page.unroute(`https://${host}/**`);
  await page.route(`https://${host}/**`, (route) => route.abort());
  await page.goto('/profile/settings');
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(page.getByText(/Offline\. Changes are saved here/)).toBeVisible({ timeout: 15_000 });
});
