import { expect, test } from '@playwright/test';

test('app shell loads and the theme switch works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('every route renders', async ({ page }) => {
  for (const [path, heading] of [
    ['/settings', 'Settings'],
    ['/import', 'Import'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('component gallery renders both themes', async ({ page }) => {
  await page.goto('/dev/components');
  await expect(page.getByRole('region', { name: 'light theme' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'dark theme' })).toBeVisible();
  await page
    .getByRole('region', { name: 'dark theme' })
    .getByRole('button', { name: 'Toast', exact: true })
    .click();
  await expect(page.getByText('Switched to WEB')).toBeVisible();
});
