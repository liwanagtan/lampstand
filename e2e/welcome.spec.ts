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

test('presenting: Today remains the onboarding landing page', async ({ page }) => {
  await startWelcome(page);
  await page.getByLabel('What should we call you?').fill('Grace');
  await page.getByRole('button', { name: 'Continue' }).click();
  const next = page.getByRole('button', { name: 'Continue' });
  await expect(next).toBeDisabled();
  await page.getByText('Teach and present').click();
  await next.click();
  await expect(
    page.getByRole('heading', { name: 'Where are you in your faith journey?' }),
  ).toBeVisible();
  await next.click();
  await page.getByRole('radio', { name: /WEB/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Complete setup', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await navLabels(page)).toEqual(['Today', 'Bible', 'Screen']);
  await expect(page.getByRole('link', { name: /Profile: your journey/ })).toHaveText('G');
});

test('growing daily with a plan: opens Today with the plan started', async ({ page }) => {
  await startWelcome(page);
  await page.getByLabel('What should we call you?').fill('Grace Santos');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Grow daily').click();
  await page.getByText('Read and study').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /The Gospels in 40 days/ }).click();
  await page.getByRole('button', { name: 'Complete setup' }).click();
  await expect(page.getByRole('heading', { name: 'Preparing your daily reading…' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(await navLabels(page)).toEqual(['Today', 'Plans', 'Bible']);
  await expect(page.getByText('The Gospels in 40 days').first()).toBeVisible();

  // Profile greets by name and mirrors the same choices; switching one on adds its tab,
  // Customize trims a part.
  await page.getByRole('link', { name: /Profile: your journey/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Grace Santos');
  const sections = page.getByRole('navigation', { name: 'Profile sections' });
  await sections.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Presenting' })).toHaveCount(0);
  await sections.getByRole('link', { name: 'About you' }).click();
  await page.getByRole('switch', { name: 'Teach and present' }).click();
  expect(await navLabels(page)).toEqual(['Today', 'Plans', 'Bible', 'Screen']);
  await sections.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Presenting' })).toBeVisible();
  await sections.getByRole('link', { name: 'About you' }).click();
  await page.getByRole('button', { name: 'Customize' }).click();
  await page.getByRole('switch', { name: 'Plans' }).click();
  expect(await navLabels(page)).toEqual(['Today', 'Bible', 'Screen']);
  await expect(page.getByRole('switch', { name: 'Grow daily (customised)' })).toBeChecked();
});

test('a name is required and readers can start with only the daily verse', async ({ page }) => {
  await startWelcome(page);
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByLabel('What should we call you?').fill('  ');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.getByLabel('What should we call you?').fill('Grace');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByText('Grow daily').click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('radio', { name: /Just the verse of the day/ }).click();
  await page.getByRole('button', { name: 'Complete setup' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await navLabels(page)).toEqual(['Today', 'Plans', 'Bible']);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});
