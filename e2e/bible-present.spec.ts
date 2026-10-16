import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe.configure({ timeout: 120_000 });

test('Bible on the TV: show, highlight, step, blank and the lesson list', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, '/bible');
  await page.getByLabel('Search the Bible').fill('jn 3 16');
  await page.keyboard.press('Enter');

  // Show on TV starts the presentation and puts the verse up.
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Show on TV' }).click();
  const output = await popup;
  const tv = output.getByTestId('output');
  await expect(tv).toContainText('For God so loved the world');
  await expect(page.getByText('Output connected')).toBeVisible();

  // Tapping a word highlights it on the TV.
  await page
    .getByRole('region', { name: 'Highlight words' })
    .getByRole('button', { name: 'loved', exact: true })
    .click();
  await expect(tv.locator('[class*="emphasis"]').first()).toContainText('loved');

  // Next verse follows on the TV and in the reader.
  await page.keyboard.press('Space');
  await expect(tv).toContainText('For God sent not his Son');
  await expect(page.getByRole('toolbar', { name: 'Selected verses' })).toContainText('John 3:17');

  // Blank hides it; showing again brings it back.
  const blank = page.getByRole('button', { name: /^Blank/ });
  await page.keyboard.press('b');
  await expect(blank).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('b');
  await expect(blank).toHaveAttribute('aria-pressed', 'false');

  // Lesson list: add, then show from the list.
  await page.getByRole('button', { name: 'Add to lesson' }).click();
  await page.getByLabel('Search the Bible').fill('ps 23 1');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add to lesson' }).click();
  const lesson = page.getByRole('region', { name: 'Lesson' });
  await expect(lesson.getByRole('listitem')).toHaveCount(2);
  await lesson.getByRole('button', { name: /^1 John 3:17/ }).click();
  await expect(tv).toContainText('For God sent not his Son');
  await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();

  // Esc clears the verse from the TV once nothing is selected.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(tv).not.toContainText('For God sent not his Son');

  // The lesson is remembered.
  await page.reload();
  await expect(page.getByRole('region', { name: 'Lesson' }).getByRole('listitem')).toHaveCount(2);
});
