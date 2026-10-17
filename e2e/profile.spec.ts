import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Profile greets you, opens on Journey, and keeps your plans and colour', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await openApp(page, '/profile');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your profile');
  await page.getByRole('link', { name: 'Add your name' }).click();
  await expect(page).toHaveURL(/\/profile\/you$/);
  await page.getByLabel('Your name').fill('Ruth');
  await page.getByLabel('Your name').press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ruth');

  // Avatar colour follows you to the top bar.
  await page.getByRole('radio', { name: 'Sage' }).click();
  await expect(
    page.getByRole('link', { name: /Profile: your journey/ }).locator('[data-avatar-color]'),
  ).toHaveAttribute('data-avatar-color', 'sage');

  // Start a plan; Journey shows it going, and the summary counts it.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Plans' }).click();
  await page.getByLabel('Search plans').fill('anxiety');
  await page.getByRole('link', { name: 'When anxiety rises' }).first().click();
  await page.getByRole('button', { name: 'Start plan' }).click();
  await expect(page).toHaveURL(/\/plans\/when-anxiety-rises\/1$/);
  await page.getByRole('link', { name: /Profile: your journey/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ruth');
  await expect(page.getByText('1 plan going')).toBeVisible();
  const summary = page.getByRole('region', { name: 'Your journey so far' });
  await expect(summary).toContainText('Plans going1');
  await expect(
    page
      .getByRole('region', { name: 'Your plans' })
      .getByRole('link', { name: 'When anxiety rises' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Journal' })).toBeVisible();

  // Settings is its own tab.
  await page
    .getByRole('navigation', { name: 'Profile sections' })
    .getByRole('link', { name: 'Settings' })
    .click();
  await expect(page).toHaveURL(/\/profile\/settings$/);
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
});
