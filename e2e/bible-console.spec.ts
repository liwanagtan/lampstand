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

  // Full screen only: no layout choices for the Bible.
  await expect(page.getByRole('radio', { name: /Lower third/i })).toHaveCount(0);

  // Every word on Live can be clicked to light it up; click again to turn it off.
  const live = page.locator('[data-pane="live"]');
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

  // A long passage pages on Live itself.
  await page.getByLabel('Search the Bible').fill('ps 119 1-40');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Show on screen' }).click();
  const pager = page.getByRole('group', { name: 'Pages of the passage' });
  await expect(pager).toContainText(/^1 \/ \d/);
  await pager.getByRole('button', { name: 'Next page' }).click();
  await expect(pager).toContainText(/^2 \/ \d/);
  await page.screenshot({ path: 'test-results/console-pages.png' });
  await pager.getByRole('button', { name: 'Previous page' }).click();
  await expect(pager).toContainText(/^1 \/ \d/);

  await page.keyboard.press('Escape');
  await expect(page.getByText('Nothing on screen')).toBeVisible();
});

test('word study on the TV: choose a word, preview it, send it, take it off', async ({ page }) => {
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

  // Words opens a column beside Live. The TV shows the KJV, so it offers the BSB first.
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  const words = page.getByRole('region', { name: 'Words' });
  await expect(words).toContainText('The TV is showing KJV');
  await words.getByRole('button', { name: 'Show John 3:16 in BSB' }).click();
  await expect(tv).toContainText('one and only Son');

  // A picture behind the verses stays full size while a word is studied.
  await page.keyboard.press('g');
  await page.getByRole('button', { name: 'Choose…' }).click();
  await page.getByRole('list', { name: 'Background library' }).getByRole('button').first().click();
  await expect(tv.locator('img, video').first()).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Background' })
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Choose a word: the column previews its card; the TV doesn't change yet.
  const preview = words.locator('[data-pane="word-preview"]');
  await words
    .getByRole('group', { name: 'Words in the passage' })
    .getByRole('button', { name: 'loved', exact: true })
    .click();
  await expect(preview).toContainText('agapaō');
  await expect(words).toContainText('to love');
  await expect(tv).not.toContainText('agapaō');

  // Show on screen sends it.
  await words.getByRole('button', { name: /^Show on screen/ }).click();
  await expect(tv).toContainText('agapaō');
  await expect(tv).toContainText('Used in');
  // With Words open, the studyable words are underlined on the TV and on Live, apart from
  // clicked highlights; the word on screen is boxed.
  await expect(tv.locator('[class*="study"]').filter({ hasText: 'world' })).toHaveCount(1);
  await expect(tv.locator('[class*="studyActive"]')).toHaveText('loved');
  await expect(tv.locator('[class*="emphasis"]')).toHaveCount(0);
  await expect(page.locator('[data-pane="live"] [class*="studyActive"]')).toHaveText('loved');
  await page.screenshot({ path: 'test-results/console-words.png' });
  await output.screenshot({ path: 'test-results/word-study-tv.png' });

  // W takes it off so the class can be asked first, and sends it again.
  await page.keyboard.press('w');
  await expect(tv).not.toContainText('agapaō');
  await expect(tv).toContainText('For God so loved the world');
  // The underlines stay while Words is open; only the box goes.
  await expect(tv.locator('[class*="studyActive"]')).toHaveCount(0);
  await expect(tv.locator('[data-study]').first()).toBeVisible();
  await page.keyboard.press('w');
  await expect(tv).toContainText('agapaō');

  // Next word chooses the next one; the TV keeps "loved" until it is sent.
  await words.getByRole('button', { name: 'Next word' }).click();
  await expect(preview).toContainText('kosmos');
  await expect(tv).toContainText('agapaō');
  await words.getByRole('button', { name: /^Show on screen/ }).click();
  await expect(tv).toContainText('kosmos');

  // Another verse that uses it goes on the TV, and the word is put away with the old verse.
  await words
    .getByRole('button', { name: /^Show .* on screen$/ })
    .first()
    .click();
  await expect(tv).not.toContainText('kosmos');

  // Closing Words takes the underlines off the TV.
  await expect(tv.locator('[data-study]').first()).toBeVisible();
  await words.getByRole('button', { name: 'Close words' }).click();
  await expect(tv.locator('[data-study]')).toHaveCount(0);

  // Esc puts away the verse (the word went with the old one).
  await page.keyboard.press('Escape');
  await expect(page.getByText('Nothing on screen')).toBeVisible();
});
