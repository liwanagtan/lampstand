import { expect, type Page } from '@playwright/test';

export const SAMPLE = 'tests/fixtures/sample-sermon.lampstand.json';

/** Opens the app and waits for first-run Bible setup. */
export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('#main')).toBeVisible({ timeout: 60_000 });
}

export async function importFile(page: Page, file: string) {
  await openApp(page, '/import');
  await page.getByLabel('Choose a slides file').setInputFiles(file);
}

export async function importSample(page: Page) {
  await importFile(page, SAMPLE);
  await expect(page.getByText('Ready to save')).toBeVisible();
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.getByRole('heading', { name: 'Screen', exact: true, level: 1 })).toBeVisible();
}

/** A verse reached by search is marked; tapping it opens the selection actions. */
export async function openVerseActions(page: Page, verse: number) {
  const button = page.locator(`[data-verse="${verse}"] [aria-pressed]`);
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.click();
  await expect(page.getByRole('toolbar', { name: 'Selected verses' })).toBeVisible();
}

/** Switches the reader's layout in the Reading sheet (Read is the default). */
export async function chooseLayout(page: Page, layout: 'Read' | 'Study') {
  await page
    .getByRole('button', { name: /^Reading settings/ })
    .filter({ visible: true })
    .first()
    .click();
  await page.getByRole('radio', { name: new RegExp(`^${layout}`) }).click();
  await page.keyboard.press('Escape');
}
