import { expect, test } from '@playwright/test';
import { importSample, openApp } from './helpers';

test.describe.configure({ timeout: 120_000 });

test('settings: defaults, appearance, reduce motion, translations, backup', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await importSample(page);
  await openApp(page, '/settings');
  await page.screenshot({ path: 'test-results/settings.png', fullPage: true });

  // Appearance and reduce motion persist.
  await page
    .getByRole('radiogroup', { name: 'App appearance' })
    .getByRole('radio', { name: 'Dark' })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByText('Reduce motion', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');

  // Default overlay mode.
  await page.getByLabel('Default verse overlay').click();
  await page.getByRole('option', { name: 'Side panel' }).click();
  await expect(page.getByLabel('Default verse overlay')).toContainText('Side panel');
  await page.waitForTimeout(300);

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');
  await expect(page.getByLabel('Default verse overlay')).toContainText('Side panel');

  // Built-in translations are listed and can't be removed.
  const rows = page.getByRole('table').getByRole('row');
  await expect(rows).toHaveCount(7);
  await expect(page.getByRole('cell', { name: 'Built in' })).toHaveCount(6);

  // Import a translation, then remove it.
  await page.getByLabel('Choose a translation file').setInputFiles({
    name: 'tst.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'lampstand-bible',
        version: 1,
        code: 'TST',
        name: 'Test Translation',
        language: 'en',
        license: 'Test only',
        books: [{ osis: 'JHN', name: 'John', chapters: [['In the beginning was the Word.']] }],
      }),
    ),
  });
  await expect(page.getByText('Added Test Translation (TST)')).toBeVisible();
  await expect(rows).toHaveCount(8);
  await page.getByRole('row', { name: /TST/ }).getByRole('button', { name: 'Remove' }).click();
  await expect(rows).toHaveCount(7);

  // Export a backup.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^lampstand-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await file.path();

  // Restore it into an empty library.
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('lampstand');
      r.onsuccess = () => res(r.result);
    });
    const tx = db.transaction('presentations', 'readwrite');
    tx.objectStore('presentations').clear();
    await new Promise((res) => (tx.oncomplete = res));
  });
  await page.getByLabel('Choose a backup file').setInputFiles(path);
  await expect(page.getByText('1 added, 0 updated, 0 unchanged.')).toBeVisible();
});
