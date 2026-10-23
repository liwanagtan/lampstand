import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

// A deploy while the app stays open (an installed app resumed, not reloaded) still reaches the
// update screen: Lampstand looks for a new version when it comes back to the foreground.
test('a new version found on returning to the app offers Update and restart', async ({ page }) => {
  test.setTimeout(120_000);
  const sw = 'dist/sw.js';
  const original = readFileSync(sw, 'utf8');
  try {
    await openApp(page);
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      return Boolean(reg?.active);
    });
    // The deploy: a changed service worker on the server.
    writeFileSync(sw, `${original}\n// deploy ${Date.now()}\n`);
    // Checks are at most a minute apart, counted from when the app opened.
    await page.waitForTimeout(61_000);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const dialog = page.getByRole('dialog', { name: 'A new Lampstand is ready' });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByRole('button', { name: 'Update and restart' })).toBeVisible();
  } finally {
    writeFileSync(sw, original);
  }
});
