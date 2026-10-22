import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.use({ hasTouch: true });

for (const width of [360, 390, 430, 640]) {
  test(`mobile reference uses page headings and bottom navigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, heading] of [
      ['/', /Good|Peace/],
      ['/plans', /A plan for you/],
      ['/search', 'Search'],
      ['/profile', 'Your profile'],
    ] as const) {
      await openApp(page, path);
      await expect(page.getByRole('banner')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Lampstand home' })).toHaveCount(0);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Main', exact: true })).toBeVisible();
    }
  });
}

test('mobile pages retain contextual back links and reading controls without the brand bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/plans/p/when-anxiety-rises');
  await page.getByRole('link', { name: 'Back to Plans', exact: true }).tap();
  await expect(page).toHaveURL(/\/plans$/);
  await openApp(page, '/plans/first-steps-in-faith/1');
  const controls = page.getByRole('group', { name: 'Plan reading controls' });
  await expect(controls).toContainText('First steps in faith');
  await controls.getByRole('button', { name: /Reading settings:/ }).tap();
  await expect(page.getByRole('dialog', { name: 'Reading', exact: true })).toBeVisible();
});
