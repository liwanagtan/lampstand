import { test, expect } from '@playwright/test';
import { openApp, importSample } from './helpers';

for (const width of [360, 390, 640, 641, 768, 820, 1024, 1100, 1101, 1440]) {
  test(`personal pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/plans', '/salvation', '/profile/settings', '/screen']) {
      await openApp(page, path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        path,
      ).toBe(true);
      const overflow = await page
        .locator('#main')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(overflow, path).toBe(false);
    }
  });
}

test('study notes dock on wide screens and become a dialog on tablets', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, '/bible');
  await page.getByRole('button', { name: 'About John' }).click();
  await expect(page.getByRole('complementary', { name: 'Study notes' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.setViewportSize({ width: 820, height: 1000 });
  await expect(page.getByRole('dialog', { name: 'John', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('guided plan completion offers reflection and immediate next reading', async ({ page }) => {
  await openApp(page, '/plans/p/first-steps-in-faith');
  await page.getByRole('button', { name: 'Start plan', exact: true }).click();
  await page.getByRole('button', { name: 'Finish day 1', exact: true }).click();
  const done = page.getByRole('dialog', { name: 'Day 1 done' });
  await expect(done.getByRole('button', { name: 'Write a reflection' })).toBeVisible();
  await done.getByRole('button', { name: 'Return to passage' }).click();
  await expect(page.getByRole('button', { name: 'Read day 2 now' })).toBeVisible();
  await page.getByRole('button', { name: 'Reflect on today', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Title')).toHaveValue(
    'First steps in faith · Day 1',
  );
});

test('tablet editor keeps fields and preview accessible', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await importSample(page);
  await page.getByRole('button', { name: 'Actions for A Lamp in the Dark' }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Slides' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
