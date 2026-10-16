import { expect, test, type Page } from '@playwright/test';
import { importSample } from './helpers';

test.describe.configure({ timeout: 120_000 });

async function present(page: Page): Promise<Page> {
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await expect(page.getByText('Output connected')).toBeVisible();
  // Put a content slide live so we can see it stay visible under the overlay.
  await page.getByRole('button', { name: 'Slide 5, section' }).dblclick();
  await expect(output.getByTestId('output')).toContainText('The Word reveals');
  return output;
}

test('the 3-second test: / jn 3 16 Enter puts John 3:16 on the TV with the slide still visible', async ({
  page,
}) => {
  const output = await present(page);
  const t0 = Date.now();
  await page.keyboard.press('/');
  await page.keyboard.type('jn 3 16');
  await page.keyboard.press('Enter');
  await expect(output.getByTestId('output')).toContainText('For God so loved the world', {
    timeout: 3000,
  });
  expect(Date.now() - t0).toBeLessThan(3000);
  await expect(output.getByTestId('output')).toContainText('John 3:16 · KJV');
  await expect(output.getByTestId('output')).toContainText('The Word reveals'); // slide underneath, lower third

  // Side panel keeps the slide visible too; full screen hides it.
  await page.keyboard.press('2');
  await expect(page.getByText('Side panel')).toBeVisible();
  await expect(output.getByTestId('output')).toContainText('The Word reveals');
  await page.keyboard.press('3');
  await expect(page.getByText('Full screen', { exact: true })).toBeVisible();

  // Esc clears the overlay; the slide is unchanged.
  await page.keyboard.press('Escape');
  await expect(output.getByTestId('output')).not.toContainText('For God so loved the world');
  await expect(output.getByTestId('output')).toContainText('The Word reveals');
});

test('translation suffix, cycling and next verse', async ({ page }) => {
  const output = await present(page);
  await page.keyboard.press('/');
  await page.keyboard.type('jn 3 16 web');
  await page.keyboard.press('Enter');
  await expect(output.getByTestId('output')).toContainText('John 3:16 · WEB');
  await expect(output.getByTestId('output')).toContainText('only born Son');

  await page.keyboard.press('t'); // WEB → ASV
  await expect(output.getByTestId('output')).toContainText('John 3:16 · ASV');
  await expect(page.getByText('Switched to ASV')).toBeVisible();

  await page.keyboard.press('Alt+ArrowRight');
  await expect(output.getByTestId('output')).toContainText('John 3:17 · ASV');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(output.getByTestId('output')).toContainText('John 3:16 · ASV');

  // History lists every verse shown, newest first, and can reshow.
  await page.getByRole('tab', { name: /History/ }).click();
  const history = page.getByRole('list', { name: 'Verse history' }).getByRole('button');
  await expect(history.first()).toContainText('John 3:16');
  await expect(history).toHaveCount(3);
});

test('Shift+Enter previews without touching the TV; Enter then sends it', async ({ page }) => {
  const output = await present(page);
  await page.keyboard.press('/');
  await page.keyboard.type('ps 23 1-3');
  await page.keyboard.press('Shift+Enter');
  await expect(page.getByText('Verse · Psalm 23:1–3 · KJV')).toBeVisible();
  await expect(output.getByTestId('output')).not.toContainText('The Lord is my shepherd');
  await page.keyboard.press('Enter');
  await expect(output.getByTestId('output')).toContainText('The Lord is my shepherd');
});

test('invalid references shake with a hint; words search', async ({ page }) => {
  await present(page);
  await page.keyboard.press('/');
  await page.keyboard.type('jn 3 99');
  await expect(page.getByRole('alert').filter({ hasText: 'John 3 has 36 verses.' })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'John 3 has 36 verses.' })).toBeVisible();

  await page.getByLabel('Verse command bar').fill('"lamp unto my feet"');
  await expect(page.getByText('Matches in KJV')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('option', { name: /Psalm 119:105/ })).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Verse · Psalm 119:105 · KJV')).toBeVisible();
});

test('verse queue holds verse slides and extra references; shown items are checked', async ({
  page,
}) => {
  const output = await present(page);
  await page.getByRole('tab', { name: /Queue/ }).click();
  const queue = page.getByRole('list', { name: 'Verse queue' }).getByRole('button');
  await expect(queue).toHaveCount(12); // 8 verse slides + 4 extraRefs
  await expect(queue.last()).toContainText('Matthew 5:14–16');
  await queue.last().click();
  await expect(output.getByTestId('output')).toContainText('Ye are the light of the world');

  await page.keyboard.press('/');
  await page.keyboard.type('rom 8 28');
  await page.keyboard.press('Control+Enter');
  await expect(queue).toHaveCount(13);
  await expect(queue.last()).toContainText('Romans 8:28');
});

test('shortcut sheet and command palette', async ({ page }) => {
  await present(page);
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('Type a command or slide number…').fill('blank');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Blank/ })).toHaveAttribute('aria-pressed', 'true');
});
