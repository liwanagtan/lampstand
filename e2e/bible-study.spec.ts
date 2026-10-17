import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('highlight, bookmark and note a passage, then find them on the Notes page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 820 });
  await openApp(page, '/bible');
  await page.getByLabel('Search the Bible').fill('rom 8 28');
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: 'Highlight yellow' }).click();
  await expect(page.locator('[data-verse="28"] mark')).toHaveAttribute('data-color', 'yellow');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();

  await page.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Even the hard days.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(
    page.getByRole('button', { name: /Note on Romans 8:28: Even the hard days/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Note on Romans 8:28/ }).click();
  await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue('Even the hard days.');
  await page.keyboard.press('Escape');

  // Marks survive a reload.
  await page.reload();
  await expect(page.locator('[data-verse="28"] mark')).toBeVisible();

  await page.getByRole('link', { name: 'Journal' }).click();
  await page.getByRole('button', { name: 'Notes & highlights' }).click();
  const list = page.getByRole('list', { name: 'Marked passages' });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('radio', { name: /Notes/ }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Even the hard days.');

  // Delete with undo.
  await list.getByRole('button', { name: /Delete note on Romans 8:28/ }).click();
  await expect(list).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);

  // Open goes back to the reader at that verse.
  await list.getByRole('button', { name: 'Open Romans 8:28' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8' })).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Selected verses' })).toContainText('Romans 8:28');
});
