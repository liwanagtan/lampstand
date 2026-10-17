import { expect, test, type Page } from '@playwright/test';

// A true first run: no onboarding flag.
test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ timeout: 120_000 });

async function startWelcome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Lampstand' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page).toHaveURL(/\/welcome$/);
}

const navLabels = (page: Page) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link').allTextContents();

test('presenting only: just the Bible and Screen, opening on Screen', async ({ page }) => {
  await startWelcome(page);
  await page.getByLabel('Your name').fill('Grace');
  await page.getByRole('button', { name: 'Continue' }).click();
  const next = page.getByRole('button', { name: 'Continue' });
  await expect(next).toBeDisabled();
  await page.getByText('Teach and present').click();
  await next.click();
  await page.getByRole('radio', { name: /WEB/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/screen$/);
  expect(await navLabels(page)).toEqual(['Bible', 'Screen']);
  await expect(page.getByRole('link', { name: /Me: profile and settings/ })).toHaveText('G');
});

test('growing daily with a plan: opens on Today, greets by name, plan started', async ({
  page,
}) => {
  await startWelcome(page);
  await page.getByLabel('Your name').fill('Grace Santos');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Grow daily').click();
  await page.getByText('Read and study').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /The Gospels in 40 days/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(', Grace');
  expect(await navLabels(page)).toEqual(['Today', 'Bible', 'Plans', 'Journal']);
  await expect(page.getByRole('region', { name: 'The Gospels in 40 days' })).toBeVisible();

  // Me mirrors the same choices; switching one on adds its tab, Customize trims a part.
  await page.getByRole('link', { name: /Me: profile and settings/ }).click();
  await expect(page.getByRole('heading', { name: 'Presenting' })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Teach and present' }).click();
  await expect(page.getByRole('heading', { name: 'Presenting' })).toBeVisible();
  expect(await navLabels(page)).toEqual(['Today', 'Bible', 'Plans', 'Journal', 'Screen']);
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('switch', { name: 'Plans' }).click();
  expect(await navLabels(page)).toEqual(['Today', 'Bible', 'Journal', 'Screen']);
  await expect(page.getByRole('switch', { name: 'Grow daily (customised)' })).toBeChecked();
});

test('skipping shows everything', async ({ page }) => {
  await startWelcome(page);
  await page.getByRole('button', { name: 'Skip, show me everything' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await navLabels(page)).toEqual(['Today', 'Bible', 'Plans', 'Journal', 'Screen']);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});
