import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.use({ hasTouch: true });

test('on a phone the top bar keeps the lamp and names the page, personally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/profile/you');
  await page.getByLabel('Your name').fill('Ruth');
  await page.getByLabel('Your name').blur();

  const bar = page.getByRole('banner');
  await openApp(page, '/');
  await expect(bar.getByRole('link', { name: 'Lampstand home' })).toBeVisible();
  await expect(bar).toContainText(', Ruth');

  await openApp(page, '/plans');
  await expect(bar).toContainText('Plans');

  // Deeper pages get a way back.
  await openApp(page, '/plans/p/when-anxiety-rises');
  await expect(bar).toContainText('When anxiety rises');
  await bar.getByRole('link', { name: 'Back' }).tap();
  await expect(page).toHaveURL(/\/plans$/);

  await openApp(page, '/profile');
  await expect(bar).toContainText('Ruth');
});
