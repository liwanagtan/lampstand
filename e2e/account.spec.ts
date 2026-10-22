import { expect, test, type Page } from '@playwright/test';
import { host, signIn } from './account';
import { openApp } from './helpers';

test.skip(!host, 'Supabase is not configured for this build');

/** A guest journal entry, written straight into the guest database. */
function writeGuestEntry(page: Page) {
  return page.evaluate(
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
}

test('a guest brings their journal into the account they sign in to', async ({ page }) => {
  await openApp(page);
  await writeGuestEntry(page);

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
  await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('dialog', { name: 'Bring your guest data?' })).toHaveCount(0);
});

test.describe('the offer to save', () => {
  // Default test storage turns the offer off; these tests start without that.
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [{ name: 'lampstand.onboarded', value: '1' }],
        },
      ],
    },
  });

  test('comes once, after the first reflection, and "Not now" is final', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('dialog', { name: 'Keep your journey' })).toHaveCount(0);
    await writeGuestEntry(page);
    await page.reload();
    const offer = page.getByRole('dialog', { name: 'Keep your journey' });
    await expect(offer).toBeVisible({ timeout: 30_000 });
    await offer.getByRole('button', { name: 'Not now' }).click();
    await expect(offer).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#main')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('dialog', { name: 'Keep your journey' })).toHaveCount(0);
  });

  test('signing in from it brings the journey along without asking again', async ({ page }) => {
    await openApp(page);
    await writeGuestEntry(page);
    await page.reload();
    const offer = page.getByRole('dialog', { name: 'Keep your journey' });
    await expect(offer).toBeVisible({ timeout: 30_000 });
    // Google itself is out of reach here: the redirect is cut and a session stands in.
    await page.route(`https://${host}/**`, (route) => route.abort());
    await offer.getByRole('button', { name: 'Continue with Google' }).click();
    await page.waitForTimeout(500);
    await page.goto('/');
    expect(
      await page.evaluate(() => localStorage.getItem('lampstand.guestImport.afterSignIn')),
    ).toBe('1');
    await signIn(page);
    await page.reload();
    await expect(page.locator('#main')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('dialog', { name: 'Bring your guest data?' })).toHaveCount(0);
    await page.goto('/profile');
    await expect(page.getByText('Written before signing in')).toBeVisible();
  });
});
