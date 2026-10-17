import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe.configure({ timeout: 120_000 });

test('Bible console: preview, show, step, highlight, blank and the passage queue', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, '/screen');
  await page.getByRole('button', { name: /Show the Bible/ }).click();
  await expect(page).toHaveURL(/\/screen\/bible$/);

  // Search selects the passage into Preview; Enter puts it on the TV.
  await page.getByLabel('Search the Bible').fill('jn 3 16');
  await page.keyboard.press('Enter');
  await expect(page.getByText('John 3:16 · KJV').first()).toBeVisible();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Show on screen' }).click();
  const output = await popup;
  const tv = output.getByTestId('output');
  await expect(tv).toContainText('For God so loved the world');
  await expect(page.getByText('Output connected')).toBeVisible();

  // Same keys as a sermon: → steps the TV to the next verse, B blanks, Esc clears.
  await page.keyboard.press('ArrowRight');
  await expect(tv).toContainText('For God sent not his Son');
  const blank = page.getByRole('button', { name: /^Blank/ });
  await page.keyboard.press('b');
  await expect(blank).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('b');
  await expect(blank).toHaveAttribute('aria-pressed', 'false');

  // Highlight words of what is live.
  await page.getByRole('tab', { name: 'Highlight' }).click();
  await page
    .getByRole('region', { name: 'Highlight words' })
    .getByRole('button', { name: 'world', exact: true })
    .first()
    .click();
  await expect(tv.locator('[class*="emphasis"]').first()).toContainText('world');

  // Pick verses from the chapter, line them up, then show one from the queue.
  await page.getByRole('tab', { name: 'Chapter' }).click();
  await page.getByRole('list', { name: 'John 3' }).getByRole('button', { name: /^18/ }).click();
  await page.getByRole('button', { name: 'Add to queue' }).click();
  await page.getByLabel('Search the Bible').fill('ps 23 1-3');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add to queue' }).click();
  const queue = page.getByRole('navigation', { name: 'Passage queue' });
  await expect(queue.getByRole('button', { name: /^Passage \d/ })).toHaveCount(2);
  await queue.getByRole('button', { name: /^Passage 1: John 3:18/ }).dblclick();
  await expect(tv).toContainText('He that believeth on him is not condemned');

  await page.keyboard.press('Escape');
  await expect(page.getByText('Nothing on screen')).toBeVisible();
});
