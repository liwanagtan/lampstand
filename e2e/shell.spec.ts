import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('app shell loads in light mode, with Dark and System unavailable for now', async ({
  page,
}) => {
  await openApp(page, '/profile/settings');
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  const appearance = page.getByRole('radiogroup', { name: 'App appearance' });
  await expect(appearance.getByRole('radio', { name: 'Light' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(appearance.getByRole('radio', { name: 'Dark' })).toBeDisabled();
  await expect(appearance.getByRole('radio', { name: 'System' })).toBeDisabled();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('every route renders', async ({ page }) => {
  for (const [path, heading] of [
    ['/settings', 'Appearance'],
    ['/import', 'Import'],
  ] as const) {
    await openApp(page, path);
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
});

test('component gallery renders both themes', async ({ page }) => {
  await openApp(page, '/dev/components');
  await expect(page.getByRole('region', { name: 'light theme' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'dark theme' })).toBeVisible();
  await page
    .getByRole('region', { name: 'dark theme' })
    .getByRole('button', { name: 'Toast', exact: true })
    .click();
  await expect(page.getByText('Switched to WEB')).toBeVisible();
});

test('old links land on their new homes', async ({ page }) => {
  for (const [from, to, heading] of [
    ['/bible/today', /\/$/, null],
    ['/bible/plans', /\/plans$/, 'A plan for you'],
    ['/bible/journal', /\/profile$/, 'Your journey starts here'],
    ['/journal', /\/profile$/, 'Your journey starts here'],
    ['/me', /\/profile\/you$/, 'You'],
    ['/import', /\/screen\/import$/, 'Import'],
    ['/settings', /\/profile\/settings$/, 'Appearance'],
  ] as const) {
    await openApp(page, from);
    await expect(page).toHaveURL(to);
    if (heading) await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
});

test('phones get a bottom tab bar and no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/',
    '/bible',
    '/plans',
    '/profile',
    '/profile/you',
    '/profile/settings',
    '/search',
    '/screen',
  ]) {
    await openApp(page, path);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  }
  const tabs = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
  await expect(tabs).toHaveText(['Today', 'Plans', 'Bible', 'Search', 'Profile']);
  await tabs.filter({ hasText: 'Plans' }).click();
  await expect(page).toHaveURL(/\/plans$/);
});

test('each workspace has its own atmosphere, and reduced motion stills page entrances', async ({
  page,
}) => {
  for (const [path, atmosphere] of [
    ['/', 'today'],
    ['/bible', 'bible'],
    ['/plans', 'plans'],
    ['/profile', 'journal'],
    ['/screen', 'screen'],
  ] as const) {
    await openApp(page, path);
    await expect(page.locator('#main')).toHaveAttribute('data-atmosphere', atmosphere);
  }
  // Screen shares the calm light workspace (the TV output itself stays dark).
  await page.emulateMedia({ colorScheme: 'dark' });
  await openApp(page, '/screen');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const [bg, pageBg] = await page
    .locator('#main')
    .evaluate((el) => [
      getComputedStyle(el).backgroundColor,
      getComputedStyle(document.body).backgroundColor,
    ]);
  expect(bg).toBe(pageBg);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, '/plans');
  const anim = await page
    .locator('[data-enter]')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});
