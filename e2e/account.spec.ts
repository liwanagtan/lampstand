import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openApp } from './helpers';

// A stored session stands in for Google sign-in; requests to Supabase are cut so the fake
// token is never checked (the app treats that like being offline).
function supabaseHost(): string | null {
  try {
    const env = readFileSync('.env.local', 'utf8');
    const url = /^VITE_SUPABASE_URL=(.+)$/m.exec(env)?.[1]?.trim();
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}
const host = supabaseHost();
test.skip(!host, 'Supabase is not configured for this build');

const USER = { id: '00000000-0000-4000-8000-000000000001', email: 'reader@example.com' };

async function signIn(page: Page) {
  await page.route(`https://${host}/**`, (route) => route.abort());
  await page.evaluate(
    ({ key, user }) => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem(
        key,
        JSON.stringify({
          access_token: 'test',
          refresh_token: 'test',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: now + 3600,
          user: {
            ...user,
            aud: 'authenticated',
            app_metadata: {},
            user_metadata: {},
            created_at: '',
          },
        }),
      );
    },
    { key: `sb-${host!.split('.')[0]}-auth-token`, user: USER },
  );
}

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
