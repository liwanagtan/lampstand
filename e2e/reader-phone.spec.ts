import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.use({ hasTouch: true });

test('on a phone the reader is all thumbs: pill, Aa sheet, and the selection bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/bible');
  await expect(page.getByLabel('Search the Bible')).toBeHidden();
  const bar = page.getByRole('banner');
  const pill = page.getByRole('navigation', { name: 'Chapter', exact: true });

  // The bar is personal; the place is on the page and the pill.
  await expect(bar).toContainText('reading');
  await expect(bar).not.toContainText('John');
  await pill.getByRole('button', { name: 'Next chapter' }).tap();
  await expect(page.getByRole('heading', { name: 'John 2' })).toBeVisible();
  await expect(pill).toContainText('John 2');
  await pill.getByRole('button', { name: 'Previous chapter' }).tap();
  await expect(page.getByRole('heading', { name: 'John 1' })).toBeVisible();

  // Aa: translation and text size in a bottom sheet.
  await bar.getByRole('button', { name: 'Reading settings' }).tap();
  const sheet = page.getByRole('dialog', { name: 'Reading' });
  await sheet.getByRole('button', { name: 'Larger text' }).tap();
  await page.keyboard.press('Escape');

  // Selecting verses swaps the pill for the selection bar, with named actions.
  await page.locator('[data-verse="1"] button').last().tap();
  await expect(pill).toBeHidden();
  const selected = page.getByRole('toolbar', { name: 'Selected verses' });
  await expect(selected).toContainText('Bookmark');
  await expect(selected).toContainText('Note');
  await selected.getByRole('button', { name: 'Clear selection' }).tap();
  await expect(pill).toBeVisible();
});

test('on a phone a parallel translation reads beneath each verse, and plans use Aa', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/bible');
  await page.getByRole('banner').getByRole('button', { name: 'Reading settings' }).tap();
  await page.getByLabel('Parallel translation').tap();
  await page.getByRole('option', { name: /WEB/ }).tap();
  await page.keyboard.press('Escape');
  const verse = page.locator('[data-verse="1"]');
  const [first, second] = await Promise.all([
    verse.locator('span').first().boundingBox(),
    verse.locator('[data-code="WEB"]').boundingBox(),
  ]);
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 2);

  await openApp(page, '/plans/gospels-40/1');
  await expect(page.getByLabel('Translation', { exact: true })).toBeHidden();
  await page.getByRole('banner').getByRole('button', { name: 'Reading settings' }).tap();
  const sheet = page.getByRole('dialog', { name: 'Reading' });
  await expect(sheet.getByLabel('Parallel translation')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Larger text' }).tap();
});

test('on a phone Screen is reachable from Profile and says it is for a laptop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/screen');
  await expect(page.getByText('Screen is made for a laptop')).toBeVisible();
  await page.getByRole('banner').getByRole('link', { name: 'Back' }).tap();
  await expect(page).toHaveURL(/\/profile\/you$/);
});
