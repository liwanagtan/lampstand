import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.use({ hasTouch: true });

test('on a phone, sheets close with a downward drag, and the active tab returns to the top', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/bible');
  await page.getByRole('button', { name: 'Reading settings', exact: true }).tap();
  const sheet = page.getByRole('dialog', { name: 'Reading' });
  await expect(sheet).toBeVisible();

  // A small pull springs back…
  const box = (await sheet.locator('h2').boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + 40, { steps: 4 });
  await page.mouse.up();
  await expect(sheet).toBeVisible();
  // …a long one closes.
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + 260, { steps: 8 });
  await page.mouse.up();
  await expect(sheet).toBeHidden();

  // Tapping the tab you're on scrolls back to the top.
  await openApp(page, '/plans');
  await page.evaluate(() => document.getElementById('main')!.scrollTo(0, 900));
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plans' }).tap();
  await expect
    .poll(() => page.evaluate(() => document.getElementById('main')!.scrollTop))
    .toBeLessThan(5);
});
