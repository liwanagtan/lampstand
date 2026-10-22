import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe('Bible reader', () => {
  test('search by reference opens the chapter and selects the verse', async ({ page }) => {
    await openApp(page, '/bible');
    await page.getByLabel('Search Lampstand').fill('jn 3 16');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();
    // The verse is marked; tapping it opens its actions.
    const verse = page.locator('[data-verse="16"] button[aria-pressed]');
    await expect(verse).toHaveAttribute('aria-pressed', 'true');
    const bar = page.getByRole('toolbar', { name: 'Selected verses' });
    await expect(bar).toBeHidden();
    await verse.click();
    await expect(bar).toContainText('John 3:16');
    // Shift-click extends the selection.
    await page.locator('[data-verse="18"] button[aria-pressed]').click({ modifiers: ['Shift'] });
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
    await page.getByRole('button', { name: 'Reading settings' }).click();
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
  await page.getByRole('button', { name: /Study notes on verse 1$/ }).click();
  const sheet = panel;
  await expect(sheet).toContainText('logos');
  await sheet.getByRole('link', { name: 'Gen 1:1' }).first().click();
  await expect(page.getByRole('heading', { name: 'Genesis 1' })).toBeVisible();
});
