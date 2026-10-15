import { expect, test, type Page } from '@playwright/test';
import { importSample } from './helpers';

test.describe.configure({ timeout: 120_000 });

async function openEditor(page: Page) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  await page.getByRole('button', { name: 'Actions for A Lamp in the Dark' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByRole('navigation', { name: 'Slides' })).toBeVisible();
}

const saved = (page: Page) => expect(page.getByText('Saved')).toBeVisible();

test('every edit persists after a reload', async ({ page }) => {
  await openEditor(page);
  await page.screenshot({ path: 'test-results/editor.png' });

  // Edit text on slide 6 (point).
  await page.getByRole('button', { name: 'Slide 6, point' }).click();
  await page.getByLabel('Heading', { exact: true }).fill('Light shows the truth');
  await saved(page);

  // Add a slide, change its type, duplicate, delete, reorder.
  await page.getByRole('button', { name: 'Add slide' }).click();
  await page.getByRole('menuitem', { name: 'Statement' }).click();
  await expect(page.getByText('Slide 7 of 22')).toBeVisible();
  await page.getByLabel('Statement', { exact: true }).fill('Walk in the light');
  await page.getByRole('button', { name: 'Change type' }).click();
  await page.getByRole('menuitem', { name: 'Quote' }).click();
  await expect(page.getByText('Slide 7 of 22 · Quote')).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate' }).click();
  await expect(page.getByText('Slide 8 of 23 · Quote')).toBeVisible();
  await page.getByRole('button', { name: 'More slide actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete slide' }).click();
  await expect(page.getByText(/of 22/)).toBeVisible();
  await page.getByRole('button', { name: 'Slide 7, quote' }).click();
  await page.getByRole('button', { name: 'Move up' }).click();
  await expect(page.getByText('Slide 6 of 22 · Quote')).toBeVisible();

  // Presentation settings.
  await page.getByRole('button', { name: 'Presentation settings' }).click();
  await page.getByLabel('Title', { exact: true }).fill('A Lamp in the Dark (edited)');
  await page.getByRole('button', { name: 'Done' }).click();
  await saved(page);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'A Lamp in the Dark (edited)' })).toBeVisible();
  await expect(page.getByText('Slide 1 of 22')).toBeVisible();
  await page.getByRole('button', { name: 'Slide 6, quote' }).click();
  await expect(page.getByLabel('Quote', { exact: true })).toHaveValue('Walk in the light');
  await page.getByRole('button', { name: 'Slide 7, point' }).click();
  await expect(page.getByLabel('Heading', { exact: true })).toHaveValue('Light shows the truth');
});

test('undo restores the previous state for 50 steps', async ({ page }) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Slide 4, statement' }).click();
  const original = await page.getByLabel('Statement', { exact: true }).inputValue();
  // 50 separate edits: 49 moves and one text change.
  for (let i = 0; i < 49; i++) {
    await page.getByRole('button', { name: i % 2 === 0 ? 'Move down' : 'Move up' }).click();
  }
  await page.getByLabel('Statement', { exact: true }).fill('Changed');
  for (let i = 0; i < 50; i++) await page.keyboard.press('Control+z');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(page.getByText('Slide 4 of 21')).toBeVisible();
  await expect(page.getByLabel('Statement', { exact: true })).toHaveValue(original);
  await expect(page.getByRole('button', { name: 'Redo' })).toBeEnabled();
  await page.keyboard.press('Control+Shift+z');
  await expect(page.getByRole('button', { name: 'Undo' })).toBeEnabled();
});

test('verse fields validate references and character limits show near the limit', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('button', { name: 'Slide 3, verse' }).click();
  await page.getByLabel('Reference', { exact: true }).fill('Jn 3:99');
  await expect(page.getByText('John 3 has 36 verses.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Slide 3, verse, has problems/ })).toBeVisible();
  await page.getByLabel('Reference', { exact: true }).fill('Psalm 23');
  await expect(page.getByText('Psalm 23 · 6 verses')).toBeVisible();

  await page.getByRole('button', { name: 'Slide 6, point' }).click();
  await page.getByLabel('Heading', { exact: true }).fill('x'.repeat(50));
  await expect(page.getByText('50/60')).toBeVisible();
});
