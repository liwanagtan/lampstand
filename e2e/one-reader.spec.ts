import { expect, test } from '@playwright/test';
import { chooseLayout, openApp } from './helpers';

test('plan readings and the Bible share one reader: Read by default, Study on request', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await openApp(page, '/plans/p/gospels-40');
  await page.getByRole('button', { name: 'Start plan' }).click();
  await expect(page.getByRole('heading', { name: 'Matthew 1–4' })).toBeVisible();

  // Read: the passage flows as paragraphs, and a verse is a tap away from its actions.
  await expect(page.locator('p [data-verse="2"]').first()).toBeVisible();
  await page.locator('[data-verse="2"] [aria-pressed]').first().click();
  const bar = page.getByRole('toolbar', { name: 'Selected verses' });
  await expect(bar).toContainText('Matthew 1:2');
  await bar.getByRole('button', { name: 'Highlight green' }).click();
  await bar.getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.locator('[data-verse="2"] mark[data-color="green"]').first()).toBeVisible();

  // The same mark in the Bible reader, where Study lays the chapter out a verse per row.
  await page.getByLabel('Search Lampstand').fill('mt 1');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Matthew 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="2"] mark[data-color="green"]')).toBeVisible();
  await chooseLayout(page, 'Study');
  await expect(page.locator('li[data-verse="2"]')).toHaveAttribute('data-color', 'green');

  // The choice is remembered, and plan readings follow it.
  await page.reload();
  await expect(page.locator('li[data-verse="2"]')).toBeVisible();
  await page.goto('/plans/gospels-40/1');
  await expect(page.locator('li[data-verse="2"]').first()).toBeVisible();
});
