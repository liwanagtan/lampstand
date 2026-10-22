import { expect, test } from '@playwright/test';
import { host, signIn } from './account';
import { openApp } from './helpers';

test.skip(!host, 'Supabase is not configured for this build');

test('a guest brings their journal into the account they sign in to', async ({ page }) => {
  await openApp(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('lampstand');
        req.onsuccess = () => {
          const tx = req.result.transaction('entries', 'readwrite');
          tx.objectStore('entries').put({
            id: 'e-guest',
            date: '2026-10-20',
            kind: 'journal',
            body: 'Written before signing in',
            createdAt: 1,
            updatedAt: 1,
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );

  await signIn(page);
  await page.reload();
  const dialog = page.getByRole('dialog', { name: 'Bring your guest data?' });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(dialog).toContainText('1 journal entry');
  await dialog.getByRole('button', { name: 'Bring it in' }).click();

  // The guest had finished setup, so the account opens on Today, not Welcome.
  await expect(page.locator('#main')).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/profile');
  await expect(page.getByText('Written before signing in')).toBeVisible();
  await page.reload();
  await expect(page.locator('#main')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('dialog', { name: 'Bring your guest data?' })).toHaveCount(0);
});

test('"Not now" keeps the guest data apart and does not ask again', async ({ page }) => {
  await openApp(page);
  await page.getByRole('link', { name: 'Bible', exact: true }).first().click();
  await signIn(page);
  await page.reload();
  const dialog = page.getByRole('dialog', { name: 'Bring your guest data?' });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Not now' }).click();
  await expect(dialog).toHaveCount(0);
  // Nothing came across, so the new account starts with its own setup.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Make Lampstand yours' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('dialog', { name: 'Bring your guest data?' })).toHaveCount(0);
});
