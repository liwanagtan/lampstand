import { expect, test } from '@playwright/test';
import { importSample } from './helpers';

test.describe.configure({ timeout: 180_000 });

test('no request ever leaves localhost during a full run (PRD §10)', async ({ page, context }) => {
  const external: string[] = [];
  context.on('request', (req) => {
    const url = new URL(req.url());
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      !url.protocol.startsWith('blob') &&
      !url.protocol.startsWith('data')
    ) {
      external.push(req.url());
    }
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('/');
  await page.keyboard.type('jn 3 16');
  await page.keyboard.press('Enter');
  await expect(output.getByTestId('output')).toContainText('For God so loved');
  await page.keyboard.press('/');
  await page.keyboard.type('"still waters"');
  await expect(page.getByText('Matches in KJV')).toBeVisible({ timeout: 10_000 });
  expect(external).toEqual([]);
});

test('after the first visit the app works with the network unplugged', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  // Wait for the service worker to finish precaching and take control.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first install doesn't claim the open page; a reload puts it under the worker.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), {
      timeout: 30_000,
    })
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  await page.keyboard.press('/');
  await page.keyboard.type('ps 23 1 web');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-pane="live"]')).toContainText('Psalm 23:1 · WEB');

  // A fresh output window opens offline too.
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await expect(output.getByTestId('output')).toContainText(
    'The LORD is my shepherd; I shall lack nothing',
  );
  await context.setOffline(false);
});
