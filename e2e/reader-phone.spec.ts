import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.use({ hasTouch: true });

test('on a phone the reader is all thumbs: pill, Aa sheet, and the selection bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/bible');
  await expect(page.getByLabel('Search Lampstand')).toBeHidden();
  const bar = page.getByRole('group', { name: 'Bible reading controls' });
  const pill = page.getByRole('navigation', { name: 'Chapter', exact: true });

  // The reference has local reading controls, with no shared brand/greeting bar.
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(bar).toContainText('John 1');
  await pill.getByRole('button', { name: 'Next chapter' }).tap();
  await expect(bar.getByRole('button', { name: 'John 2', exact: true })).toBeVisible();
  await expect(pill).toContainText('John 2');
  await pill.getByRole('button', { name: 'Previous chapter' }).tap();
  await expect(bar.getByRole('button', { name: 'John 1', exact: true })).toBeVisible();

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
  await page.getByRole('button', { name: 'Reading settings', exact: true }).tap();
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
  await page
    .getByRole('group', { name: 'Plan reading controls' })
    .getByRole('button', { name: /Reading settings:/ })
    .tap();
  const sheet = page.getByRole('dialog', { name: 'Reading' });
  await expect(sheet.getByLabel('Parallel translation')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Larger text' }).tap();
});

test('on a phone Screen is reachable from Profile and says it is for a laptop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/screen');
  await expect(page.getByText(/Look around here, then present from a laptop/)).toBeVisible();
  await page.getByRole('link', { name: 'Back to Profile', exact: true }).tap();
  await expect(page).toHaveURL(/\/profile\/you$/);
});
