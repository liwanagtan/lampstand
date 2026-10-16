import { expect, test } from '@playwright/test';
import { importFile, importSample, openApp } from './helpers';

test.describe.configure({ timeout: 90_000 });

test('the sample sermon imports with zero errors and saves to the library', async ({ page }) => {
  await importFile(page, 'tests/fixtures/sample-sermon.lampstand.json');
  await expect(
    page.locator('header').getByRole('heading', { name: 'A Lamp in the Dark' }),
  ).toBeVisible();
  await expect(page.getByText('Ready to save')).toBeVisible();
  await expect(page.getByText(/problem/)).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Slide preview' }).getByRole('listitem')).toHaveCount(
    21,
  );
  await expect(page.getByText('2 slides need a background')).toBeVisible();
  await page.getByRole('tab', { name: 'Modern' }).click();
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByText('Pastor Daniel Cruz · Sun, Oct 18, 2026')).toBeVisible();
});

test('a file with three errors lists all three with slide numbers', async ({ page }) => {
  await importFile(page, 'tests/fixtures/three-errors.lampstand.json');
  await expect(page.getByText('This file has 3 problems')).toBeVisible();
  const issues = page.getByRole('alert').getByRole('button');
  await expect(issues).toHaveText([
    'Slide 4 (statement): Statement is 95 characters; the limit is 90.',
    'Slide 11 (list): A list needs at least 2 items.',
    "Slide 15 (verse): 'Jhn 3:166' doesn't exist — John 3 has 36 verses.",
  ]);
  await expect(page.getByRole('button', { name: 'Save to library' })).toBeDisabled();
  await issues.nth(1).click();
  await expect(
    page
      .getByRole('img', { name: 'Slide 11' })
      .or(page.getByText('Slide 11 (list) can’t be shown')),
  ).toBeInViewport();
});

test('malformed JSON shows one friendly message', async ({ page }) => {
  await importFile(page, 'tests/fixtures/malformed.lampstand.json');
  await expect(page.getByText('This file has 1 problem')).toBeVisible();
  await expect(page.getByText(/^This isn't valid JSON/)).toBeVisible();
  await expect(page.getByText(/SyntaxError|Unexpected token|at JSON/)).toHaveCount(0);
});

test('empty library invites an import, and import is upload-only', async ({ page }) => {
  await openApp(page, '/');
  await expect(page.getByRole('heading', { name: 'Your library is empty' })).toBeVisible();
  await expect(page.getByText(/Claude|skill/i)).toHaveCount(0);
  await page.getByRole('button', { name: 'Import presentation' }).click();
  await expect(page).toHaveURL(/\/import$/);
  await expect(page.getByText('Drop a .lampstand.json file here')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('library: search, duplicate, delete with undo, export', async ({ page }) => {
  await importSample(page);
  const cards = page.getByRole('list', { name: 'Presentations' }).getByRole('listitem');
  await expect(cards).toHaveCount(1);

  await page.getByRole('button', { name: 'Actions for A Lamp in the Dark' }).click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(cards).toHaveCount(2);

  await page.getByPlaceholder('Search by title or speaker').fill('copy');
  await expect(cards).toHaveCount(1);
  await page.getByPlaceholder('Search by title or speaker').fill('daniel');
  await expect(cards).toHaveCount(2);
  await page.getByPlaceholder('Search by title or speaker').fill('');

  await page.getByRole('button', { name: 'Actions for A Lamp in the Dark (copy)' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(cards).toHaveCount(2);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Actions for A Lamp in the Dark', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Export JSON' }).click();
  expect((await download).suggestedFilename()).toBe('a-lamp-in-the-dark.lampstand.json');
});

test('50 presentations load and scroll smoothly', async ({ page }) => {
  await importSample(page);
  // Clone the saved record 49 times straight into IndexedDB.
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res) => {
      const r = indexedDB.open('lampstand');
      r.onsuccess = () => res(r.result);
    });
    const all: { id: string; title: string }[] = await new Promise((res) => {
      const r = db.transaction('presentations').objectStore('presentations').getAll();
      r.onsuccess = () => res(r.result);
    });
    const base = all[0]!;
    const tx = db.transaction('presentations', 'readwrite');
    for (let i = 1; i < 50; i++) {
      tx.objectStore('presentations').put({
        ...base,
        id: `seed-${i}`,
        title: `Sermon ${i}`,
        updatedAt: Date.now() - i * 1000,
      });
    }
    await new Promise((res) => (tx.oncomplete = res));
  });
  const t0 = Date.now();
  await page.reload();
  const cards = page.getByRole('list', { name: 'Presentations' }).getByRole('listitem');
  await expect(cards).toHaveCount(50, { timeout: 10_000 });
  expect(Date.now() - t0).toBeLessThan(5000);
  // Scroll to the bottom and measure frame times.
  const longFrames = await page.evaluate(async () => {
    const main = document.querySelector('#main')!;
    const frames: number[] = [];
    let last = performance.now();
    let running = true;
    const tick = (t: number) => {
      frames.push(t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (let y = 0; y <= main.scrollHeight; y += 120) {
      main.scrollTop = y;
      await new Promise((r) => requestAnimationFrame(r));
    }
    running = false;
    return frames.filter((f) => f > 100).length;
  });
  expect(longFrames).toBeLessThan(5);
});
