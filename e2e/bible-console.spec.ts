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
  await expect(tv).toContainText('For God sent not his Son'); // KJV, the default
  const blank = page.getByRole('button', { name: /^Blank/ });
  await page.keyboard.press('b');
  await expect(blank).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('b');
  await expect(blank).toHaveAttribute('aria-pressed', 'false');

  // The side panel is the chapter alone; tools live on the Live pane and in the dock.
  await expect(page.getByRole('tab')).toHaveCount(0);

  // Highlight: click words on the Live pane itself; click again to turn one off.
  const live = page.locator('[data-pane="live"]');
  await expect(page.getByRole('button', { name: 'Highlight', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await live.locator('[data-live-word="world"]').first().click();
  await expect(tv.locator('[class*="emphasis"]').first()).toContainText('world');
  await live.locator('[data-live-word="condemn"]').first().click();
  await expect(tv.locator('[class*="emphasis"]')).toHaveCount(4); // "world" three times
  await live.locator('[data-live-word="condemn"]').first().click();
  await expect(tv.locator('[class*="emphasis"]')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/console-highlight.png' });
  // The TV draws words plain: nothing there is clickable.
  await expect(tv.locator('[data-live-word]')).toHaveCount(0);

  // Background sits in the dock, beside Blank and Logo.
  await page.getByRole('button', { name: /^Background behind the verses/ }).click();
  await expect(page.getByRole('dialog', { name: 'Background' })).toBeVisible();
  await page.keyboard.press('Escape');

  // Pick verses from the chapter, line them up, then show one from the queue.
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

test('word study on the TV: tap a word, ask first, step through, put it away', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, '/screen');
  await page.getByRole('button', { name: /Show the Bible/ }).click();
  await page.getByLabel('Search the Bible').fill('jn 3 16');
  await page.keyboard.press('Enter');
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Show on screen' }).click();
  const output = await popup;
  const tv = output.getByTestId('output');
  await expect(tv).toContainText('For God so loved the world');

  // Words mode: the TV shows the KJV, so it offers the BSB, whose words are linked.
  const live = page.locator('[data-pane="live"]');
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  const words = page.getByRole('region', { name: 'Word study' });
  await expect(words).toContainText('The TV is showing KJV');
  await expect(live.locator('[data-live-study]')).toHaveCount(0);
  await words.getByRole('button', { name: 'Show John 3:16 in BSB' }).click();
  await expect(tv).toContainText('one and only Son');

  // Underlined words on the Live pane: click one and the TV studies it.
  await live.locator('[data-live-study="loved"]').click();
  await expect(tv).toContainText('agapaō');
  await expect(tv).toContainText('to love');
  await expect(tv).toContainText('Used in');
  await expect(words).toContainText('On the TV now');
  await page.screenshot({ path: 'test-results/console-words.png' });
  await output.screenshot({ path: 'test-results/word-study-tv.png' });

  // W hides the word so the class can be asked first, and brings it back.
  await page.keyboard.press('w');
  await expect(tv).not.toContainText('agapaō');
  await expect(tv).toContainText('For God so loved the world');
  await expect(live.locator('[data-live-study="loved"]')).toBeVisible();
  await page.keyboard.press('w');
  await expect(tv).toContainText('agapaō');

  // Next word steps through the verse.
  await words.getByRole('button', { name: 'Next word' }).click();
  await expect(tv).toContainText('kosmos');

  // Another verse that uses it goes on the TV, and the word is put away with the old verse.
  await words
    .getByRole('button', { name: /^Show .* on screen$/ })
    .first()
    .click();
  await expect(tv).not.toContainText('kosmos');

  // Esc puts away the verse (the word went with the old one).
  await page.keyboard.press('Escape');
  await expect(page.getByText('Nothing on screen')).toBeVisible();
});
