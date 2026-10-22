import { expect, test } from '@playwright/test';
import { openApp, openVerseActions } from './helpers';

test.describe('on a phone', () => {
  test.use({ hasTouch: true });

  test('tap two verses to select a range, highlight it and note it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Getting there with thumbs: the pill opens the picker as a bottom sheet.
    await openApp(page, '/bible');
    await page
      .getByRole('navigation', { name: 'Chapter', exact: true })
      .getByRole('button', { name: /^John/ })
      .tap();
    const picker = page.getByRole('dialog', { name: 'Go to' });
    // The current book opens already showing its chapters.
    await expect(picker.getByRole('button', { name: 'John 21' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await picker.getByRole('button', { name: '3', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();

    await page.locator('[data-verse="12"] [aria-pressed]').tap();
    await page.locator('[data-verse="18"] [aria-pressed]').tap();
    const bar = page.getByRole('toolbar', { name: 'Selected verses' });
    await expect(bar).toContainText('John 3:12–18 · 7 verses');

    await bar.getByRole('button', { name: 'Highlight yellow' }).tap();
    // One continuous band: inner verses join both neighbours.
    await expect(page.locator('[data-verse="12"]')).toHaveAttribute('data-join-next', 'true');
    await expect(page.locator('[data-verse="15"]')).toHaveAttribute('data-join-prev', 'true');
    await expect(page.locator('[data-verse="18"]')).not.toHaveAttribute('data-join-next', 'true');

    await bar.getByRole('button', { name: 'Add a note' }).tap();
    await page.getByRole('dialog').getByRole('textbox').fill('Earthly and heavenly things.');
    await page.getByRole('button', { name: 'Save note' }).tap();
    // Phones hide the verse margin (and its note icon); the selection bar edits the note.
    await expect(bar.getByRole('button', { name: 'Edit note' })).toBeVisible();
    await expect(page.locator('[data-verse="12"]')).toHaveAttribute('data-bracket', 'top');
    await expect(page.locator('[data-verse="18"]')).toHaveAttribute('data-bracket', 'bottom');

    // A verse inside the noted range shows a small note mark, and its bar opens that note.
    await page.locator('[data-verse="20"] [aria-pressed]').tap();
    await page.locator('[data-verse="20"] [aria-pressed]').tap();
    await expect(page.locator('[data-verse="18"] [class*="mobileMarks"]')).toBeVisible();
    await page.locator('[data-verse="15"] [aria-pressed]').tap();
    await bar.getByRole('button', { name: 'Edit note' }).tap();
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue(
      'Earthly and heavenly things.',
    );
    await page.keyboard.press('Escape');
    await bar.getByRole('button', { name: 'Clear selection' }).tap();

    // Tapping the lone selected verse clears it.
    await page.locator('[data-verse="20"] [aria-pressed]').tap();
    await expect(bar).toContainText('John 3:20');
    await page.locator('[data-verse="20"] [aria-pressed]').tap();
    await expect(bar).toBeHidden();
  });
});

test('a note typed across chapters shows in both chapters', async ({ page }) => {
  await openApp(page, '/bible');
  await page.getByLabel('Search Lampstand').fill('jn 3:34-4:2');
  await page.keyboard.press('Enter');
  await openVerseActions(page, 34);
  const bar = page.getByRole('toolbar', { name: 'Selected verses' });
  await expect(bar).toContainText('John 3:34–4:2 · 5 verses');
  await bar.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Across the chapter break.');
  await page.getByRole('button', { name: 'Save note' }).click();

  const note = page.getByRole('button', { name: /Note on John 3:34–4:2/ });
  await expect(note).toBeVisible();
  await expect(page.locator('[data-verse="36"]')).toHaveAttribute('data-bracket', 'bottom');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next chapter' }).first().click();
  await expect(page.getByRole('heading', { name: 'John 4' })).toBeVisible();
  await expect(note).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toHaveAttribute('data-bracket', 'top');
});
