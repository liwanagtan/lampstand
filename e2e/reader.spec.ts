import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe('Bible reader', () => {
  test('search by reference opens the chapter and selects the verse', async ({ page }) => {
    await openApp(page, '/bible');
    await page.getByLabel('Search Lampstand').fill('jn 3 16');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();
    // The verse is marked; tapping it opens its actions.
    const verse = page.locator('[data-verse="16"] [aria-pressed]');
    await expect(verse).toHaveAttribute('aria-pressed', 'true');
    const bar = page.getByRole('toolbar', { name: 'Selected verses' });
    await expect(bar).toBeHidden();
    await verse.click();
    await expect(bar).toContainText('John 3:16');
    // Shift-click extends the selection.
    await page.locator('[data-verse="18"] [aria-pressed]').click({ modifiers: ['Shift'] });
    await expect(bar).toContainText('John 3:16–18');
    await page.keyboard.press('Escape');
    await expect(bar).toBeHidden();
  });

  test('a whole chapter opens without a selection', async ({ page }) => {
    await openApp(page, '/bible');
    await page.getByLabel('Search Lampstand').fill('ps 23');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Psalms 23' })).toBeVisible();
    await expect(page.getByRole('toolbar', { name: 'Selected verses' })).toBeHidden();
  });

  test('word search finds verses', async ({ page }) => {
    await openApp(page, '/bible');
    await page.getByLabel('Search Lampstand').fill('still waters'); // KJV, the default
    const results = page.getByRole('listbox', { name: 'Search results' });
    await expect(results.getByRole('option').first()).toBeVisible();
    await results.getByRole('option', { name: /Psalm 23:2/ }).click();
    await expect(page.getByRole('heading', { name: 'Psalms 23' })).toBeVisible();
  });

  test('book picker, chapter stepping and parallel view', async ({ page }) => {
    await openApp(page, '/bible');
    await page.getByRole('button', { name: /^John 1/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Romans' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '8', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Romans 8' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('heading', { name: 'Romans 9' })).toBeVisible();
    // Side by side is part of the Study layout.
    await page
      .getByRole('button', { name: /^Reading settings/ })
      .filter({ visible: true })
      .click();
    await page.getByRole('radio', { name: /^Study/ }).click();
    await page.getByLabel('Parallel translation').click();
    await page.getByRole('option', { name: /WEB/ }).click();
    await expect(page.locator('[data-verse="1"]')).toContainText('I tell the truth in Christ');
    // Reader prefs persist across reloads.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Romans 9' })).toBeVisible();
  });
});

test('study notes: about the book, notes beside verses, links into the reader', async ({
  page,
}) => {
  await openApp(page, '/bible');
  // On a laptop the notes open in a side panel beside the text.
  const panel = page.getByRole('complementary', { name: 'Study notes' });
  await page.getByRole('button', { name: 'About John' }).click();
  await expect(panel).toContainText('The Gospel of John');
  await expect(panel).toContainText('Adapted from Tyndale Open Study Notes');
  // A verse's study notes are in its bar (Read layout; Study adds a mark in the margin).
  await page.locator('[data-verse="1"] [aria-pressed]').click();
  await page
    .getByRole('toolbar', { name: 'Selected verses' })
    .getByRole('button', { name: 'Study notes on verse 1' })
    .click();
  const sheet = panel;
  await expect(sheet).toContainText('logos');
  await sheet.getByRole('link', { name: 'Gen 1:1' }).first().click();
  await expect(page.getByRole('heading', { name: 'Genesis 1' })).toBeVisible();
});

test('word study: the words of a verse, their meaning, and where else they are used', async ({
  page,
}) => {
  await openApp(page, '/bible');
  await page.getByLabel('Search Lampstand').fill('ps 119:105 bsb');
  await page.keyboard.press('Enter');
  const verse = page.locator('[data-verse="105"]');
  // In the BSB a single selected verse shows its words underlined at once; no Words button.
  const lamp = verse.getByRole('button', { name: 'lamp', exact: true });
  await expect(lamp).toBeVisible();
  await expect(page.getByRole('button', { name: /^Word study on verse/ })).toHaveCount(0);

  await lamp.click();
  const panel = page.getByRole('complementary', { name: 'Word study' });
  await expect(lamp).toHaveAttribute('aria-pressed', 'true');
  await expect(panel).toContainText('STEP Bible');
  await expect(panel).toContainText('ner');
  await expect(panel).toContainText('Hebrew · noun, masculine · H5216');
  await expect(panel).toContainText(/Used in \d+ verses/);

  // A verse from the list opens in the panel, with Back.
  await panel.getByRole('button', { name: /^Exodus 25:37/ }).click();
  await expect(panel.getByRole('heading', { name: 'Exodus 25:37' })).toBeVisible();
  await panel.getByRole('button', { name: 'Back to Psalm 119:105' }).click();
  await expect(panel.getByRole('heading', { name: 'Psalm 119:105' })).toBeVisible();

  // Extending the selection underlines the new verse too.
  await page
    .locator('[data-verse="106"] [aria-pressed]')
    .first()
    .click({ modifiers: ['Shift'] });
  await expect(
    page.locator('[data-verse="106"]').getByRole('button', { name: 'sworn', exact: true }),
  ).toBeVisible();

  // Escape leaves word study; the verses stay selected with their words underlined.
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(lamp).toHaveAttribute('aria-pressed', 'false');
  // Escape again clears the selection; the verse is one button again.
  await page.keyboard.press('Escape');
  await expect(lamp).toBeHidden();
  await expect(verse.locator('[aria-pressed]').first()).toBeVisible();
});

test('word study in another translation shows the verse in the BSB', async ({ page }) => {
  await openApp(page, '/bible');
  // John 1 in the KJV, the default.
  await page.locator('[data-verse="1"] [aria-pressed]').click();
  await page.getByRole('button', { name: 'Word study on verse 1' }).click();
  const panel = page.getByRole('complementary', { name: 'Word study' });
  await expect(panel).toContainText('Words from the Berean Standard Bible.');
  await panel.getByRole('button', { name: 'Word', exact: true }).first().click();
  await expect(panel).toContainText('logos');
  await expect(panel).toContainText('G3056');
});
