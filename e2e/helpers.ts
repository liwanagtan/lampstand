import { expect, type Page } from '@playwright/test';

export const SAMPLE = 'tests/fixtures/sample-sermon.lampstand.json';

/** Opens the app and waits for first-run Bible setup. */
export async function openApp(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('#main')).toBeVisible({ timeout: 60_000 });
}

export async function importFile(page: Page, file: string) {
  await openApp(page, '/import');
  await page.getByLabel('Choose a presentation file').setInputFiles(file);
}

export async function importSample(page: Page) {
  await importFile(page, SAMPLE);
  await expect(page.getByText('Ready to save')).toBeVisible();
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
}
