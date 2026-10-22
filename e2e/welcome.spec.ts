import { expect, test, type Page } from '@playwright/test';

// A true first run: no onboarding flag.
test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ timeout: 120_000 });

async function startWelcome(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Grow in the Word, every day.' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByLabel('What should we call you?')).toHaveCount(0);
  await page.getByRole('button', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible({
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
  // Nothing chosen yet: the last step's button waits.
  await expect(page.getByRole('button', { name: 'Let’s begin' })).toBeDisabled();
  await page.getByText('Teach and present').click();
  // Presenting only: no plan to choose, so two questions in all.
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
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
  await page.getByRole('radio', { name: /Building a daily rhythm/ }).click();
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  expect(await navLabels(page)).toEqual(['Today', 'Plans', 'Bible']);
  await expect(page.getByText('Rhythms of grace').first()).toBeVisible();

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
  // The last Customize belongs to the usage choices (the first is the faith journey's).
  await page.getByRole('button', { name: 'Customize' }).last().click();
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
  await page.getByRole('radio', { name: /Just the verse of the day/ }).click();
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
  expect(await navLabels(page)).toEqual(['Today', 'Plans', 'Bible']);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
});
