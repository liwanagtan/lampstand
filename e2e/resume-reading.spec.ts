import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1366, height: 860 },
]) {
  test(`Today resumes an unfinished plan reading at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openApp(page, '/');
    // Nothing to resume yet: no placeholder card.
    await expect(page.getByRole('region', { name: 'Verse of the day' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Continue reading' })).toHaveCount(0);

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

    // Leave mid-chapter. Phones read without the tab bar; the pinned back arrow stays in reach.
    const back = page.getByRole('link', { name: 'Back to the plan' });
    if (await back.isVisible()) {
      // A first-visit toast sits over the top of the screen for a few seconds.
      await expect(page.getByText('Lampstand is ready to work offline')).toBeHidden({
        timeout: 15_000,
      });
      // Tap where it is on screen: locator.click would first scroll its unpinned spot into view.
      const box = (await back.boundingBox())!;
      expect(box.y).toBeLessThan(80); // Pinned at the top, mid-chapter.
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page).toHaveURL(/\/plans\/p\/gospels-40$/);
    }
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
