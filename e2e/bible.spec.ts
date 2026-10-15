import { expect, test } from '@playwright/test';

test('first run prepares the five Bibles, then never again', async ({ page }) => {
  test.setTimeout(90_000);
  const t0 = Date.now();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({ timeout: 60_000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(30_000);
  const count = await page.evaluate(async () => {
    const req = indexedDB.open('lampstand');
    const db: IDBDatabase = await new Promise((res) => (req.onsuccess = () => res(req.result)));
    return new Promise<number>((res) => {
      const r = db.transaction('translations').objectStore('translations').count();
      r.onsuccess = () => res(r.result);
    });
  });
  expect(count).toBe(5);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible({ timeout: 3_000 });
});
