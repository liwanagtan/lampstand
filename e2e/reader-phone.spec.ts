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

  await pill.getByRole('button', { name: 'Next chapter' }).tap();
  await expect(bar).toContainText('John 2');
  await pill.getByRole('button', { name: 'Previous chapter' }).tap();
  await expect(bar).toContainText('John 1');

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
