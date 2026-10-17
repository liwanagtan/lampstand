import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('app shell loads and the theme switch works', async ({ page }) => {
  await openApp(page, '/me');
  await expect(page.getByRole('heading', { name: 'Me', level: 1 })).toBeVisible();
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('every route renders', async ({ page }) => {
  for (const [path, heading] of [
    ['/settings', 'Me'],
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
    ['/bible/plans', /\/plans$/, 'Find a plan for where you are'],
    ['/bible/journal', /\/journal$/, 'Your journal'],
    ['/import', /\/screen\/import$/, 'Import'],
    ['/settings', /\/me$/, 'Me'],
  ] as const) {
    await openApp(page, from);
    await expect(page).toHaveURL(to);
    if (heading) await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
});

test('phones get a bottom tab bar and no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/bible', '/plans', '/journal', '/screen', '/me']) {
    await openApp(page, path);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  }
  const tabs = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
  await expect(tabs).toHaveText(['Today', 'Bible', 'Plans', 'Journal', 'Screen']);
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
    ['/journal', 'journal'],
    ['/screen', 'stage'],
  ] as const) {
    await openApp(page, path);
    await expect(page.locator('#main')).toHaveAttribute('data-atmosphere', atmosphere);
  }
  // Screen is a dark stage even in light mode.
  await page.emulateMedia({ colorScheme: 'light' });
  await openApp(page, '/screen');
  const bg = await page.locator('#main').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe('rgb(9, 12, 17)');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page, '/plans');
  const anim = await page
    .locator('[data-enter]')
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});
