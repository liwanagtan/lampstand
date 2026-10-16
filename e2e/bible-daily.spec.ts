import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Today, reading plans and the journal', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await openApp(page, '/bible/today');
  const verse = page.getByRole('region', { name: 'Verse of the day' });
  await expect(verse.locator('blockquote')).toContainText(/\w{3,}/);

  // Start a plan, mark the first day read.
  await page.getByRole('button', { name: 'Choose a plan' }).click();
  const gospels = page.getByRole('region', { name: 'The Gospels in 40 days' });
  await gospels.getByRole('button', { name: 'Start plan' }).click();
  await expect(gospels).toContainText('Matthew 1–4');
  await gospels.getByRole('button', { name: 'Mark day 1 read' }).click();
  await expect(gospels).toContainText('1 of 40 days');
  await expect(gospels.getByRole('checkbox', { name: /^Day 1:/ })).toBeChecked();

  // Read opens the reader at the day's first chapter.
  await gospels.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Matthew \d+$/ })).toBeVisible();

  // Journal autosaves and is listed back on Today.
  await page.getByRole('link', { name: 'Journal' }).click();
  await page.getByLabel('What stands out to you?').fill('Grace upon grace.');
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('What stands out to you?')).toHaveValue('Grace upon grace.');
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('region', { name: 'Journal' })).toContainText('You wrote today.');

  // The Library shows the verse of the day.
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse of the day' })).toBeVisible();
});
