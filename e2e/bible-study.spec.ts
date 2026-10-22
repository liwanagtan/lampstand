import { expect, test } from '@playwright/test';
import { openApp, openVerseActions } from './helpers';

test('highlight, bookmark and note a passage, then find them on the Notes page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 820 });
  await openApp(page, '/bible');
  await page.getByLabel('Search Lampstand').fill('rom 8 28');
  await page.keyboard.press('Enter');
  await openVerseActions(page, 28);

  await page.getByRole('button', { name: 'Highlight yellow' }).click();
  await expect(page.locator('[data-verse="28"] mark')).toHaveAttribute('data-color', 'yellow');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();

  await page.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Even the hard days.');
  await page.getByRole('button', { name: 'Save note' }).click();
  // Read layout: a small note mark after the verse; the verse's bar opens the note.
  await expect(page.getByRole('img', { name: 'Note: Even the hard days.' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit note' }).click();
  await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue('Even the hard days.');
  await page.keyboard.press('Escape');

  // Marks survive a reload.
  await page.reload();
  await expect(page.locator('[data-verse="28"] mark')).toBeVisible();

  // Everything marked shows in the one timeline in Profile › Journey.
  await page.getByRole('link', { name: /Profile: your journey/ }).click();
  const list = page.getByRole('list', { name: / entries$/ });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: /Highlights/ })).toContainText('1');
  await page.getByRole('radio', { name: /Notes/ }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await expect(list).toContainText('Even the hard days.');

  // A journal entry joins the same timeline.
  await page.getByRole('radio', { name: /All/ }).click();
  await page.getByRole('button', { name: 'New entry' }).click();
  await page.getByRole('dialog').getByLabel('Your entry').fill('Grateful today.');
  await expect(
    page.getByRole('dialog').getByRole('status').filter({ hasText: 'Saved' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list.getByRole('listitem')).toHaveCount(4);
  await page.getByRole('radio', { name: /Notes/ }).click();

  // Delete with undo.
  await list.getByRole('button', { name: /Delete note on Romans 8:28/ }).click();
  await expect(list).toBeHidden();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);

  // Open goes back to the reader at that verse.
  await list.getByRole('button', { name: 'Open Romans 8:28' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8' })).toBeVisible();
  await expect(page.locator('[data-verse="28"] [aria-pressed]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
