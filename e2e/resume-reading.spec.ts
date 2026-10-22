import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1366, height: 860 },
]) {
  test(`Today resumes an unfinished plan reading at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openApp(page, '/');
    const reading = page.getByRole('region', { name: 'Continue reading' });
    await expect(reading.getByRole('link', { name: 'Open Bible' })).toBeVisible();

    await page.getByRole('link', { name: 'Plans' }).click();
    await page
      .getByRole('region', { name: 'A place to start' })
      .getByRole('link', { name: /The Gospels in 40 days/ })
      .click();
    await page.getByRole('button', { name: 'Start plan' }).click();
    await expect(page.getByRole('heading', { name: 'Matthew 1–4' })).toBeVisible();

    const main = page.locator('#main');
    // Scroll the way a reader does: a wheel or touch ends the page's own restoring.
    await main.hover();
    await page.mouse.wheel(0, 900);
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(300);
    const saved = await main.evaluate((el) => el.scrollTop);

    // Phones show a back arrow; larger screens link the plan's name.
    await page
      .getByRole('link', { name: 'Back to the plan' })
      .or(page.locator('#main').getByRole('link', { name: 'The Gospels in 40 days', exact: true }))
      .filter({ visible: true })
      .first()
      .click();
    await page.getByRole('link', { name: 'Today' }).click();
    const active = page.getByRole('region', { name: 'Continue your reading' });
    await expect(active.getByRole('button', { name: 'Continue day 1' })).toBeVisible();
    await active.getByRole('button', { name: 'Continue day 1' }).click();
    await expect(page.getByRole('heading', { name: 'Matthew 1–4' })).toBeVisible();
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(saved - 100);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Matthew 1–4' })).toBeVisible();
    await expect.poll(() => main.evaluate((el) => el.scrollTop)).toBeGreaterThan(saved - 100);
  });
}
