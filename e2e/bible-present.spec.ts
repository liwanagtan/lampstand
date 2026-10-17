import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe.configure({ timeout: 120_000 });

test('the reader keeps to reading: no TV controls, even on a selection', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, '/bible');
  await expect(page.getByRole('button', { name: /Start Presentation|Present/ })).toHaveCount(0);
  await page.getByLabel('Search the Bible').fill('jn 3 16');
  await page.keyboard.press('Enter');
  const bar = page.getByRole('toolbar', { name: 'Selected verses' });
  await expect(bar).toContainText('John 3:16');
  await expect(bar.getByRole('button', { name: 'Show on screen' })).toHaveCount(0);
});

test('a background picture shows behind Bible verses on the TV', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, '/screen');
  await page.getByRole('button', { name: /Show the Bible/ }).click();
  await page.getByLabel('Search the Bible').fill('ps 23 1');
  await page.keyboard.press('Enter');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Show on screen' }).click();
  const output = await popup;
  const tv = output.getByTestId('output');
  await expect(tv).toContainText('The Lord is my shepherd');

  await page.getByRole('tab', { name: 'Background' }).click();
  await page.getByRole('button', { name: 'Choose…' }).click();
  await page.getByRole('list', { name: 'Background library' }).getByRole('button').first().click();
  await expect(page.getByRole('button', { name: 'Remove background' })).toBeVisible();
  await expect(tv.locator('img, video').first()).toBeVisible();

  // It is remembered for next time, and can be removed.
  await page.reload();
  await page.getByRole('tab', { name: 'Background' }).click();
  await page.getByRole('button', { name: 'Remove background' }).click();
  await expect(page.getByRole('button', { name: 'Choose…' })).toBeVisible();
});

test('marks added in the reader appear in the plan reader', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 820 });
  await openApp(page, '/bible');
  await page.getByLabel('Search the Bible').fill('mt 1 1');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Highlight green' }).click();
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click();

  // The Bookmarks menu jumps back.
  await page.getByLabel('Search the Bible').fill('jn 1');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Bookmarks' }).click();
  await page.getByRole('menuitem', { name: 'Matthew 1:1' }).click();
  await expect(page.getByRole('heading', { name: 'Matthew 1' })).toBeVisible();

  await page.goto('/plans/gospels-40/1');
  const mark = page.locator('mark[data-color="green"]').first();
  await expect(mark).toContainText('The book of the generation of Jesus Christ');
  await expect(page.getByLabel('Bookmarked').first()).toBeVisible();
});
