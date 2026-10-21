import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('discover salvation content and read the gospel response', async ({ page }) => {
  await openApp(page, '/plans');
  await page
    .getByRole('group', { name: 'Grow in faith' })
    .getByRole('link', { name: /Understanding salvation/ })
    .click();
  await page.getByRole('link', { name: 'The good news: trusting Jesus', exact: true }).click();
  await page.getByRole('button', { name: 'Start plan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Why we need rescue', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Devotional' })).toContainText('grace');
  await page.goto('/plans/good-news-personal-faith/3');
  await expect(
    page.getByRole('heading', { name: 'Repent and personally trust Christ' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Devotional' })).toContainText('Jesus saves');
  await expect(page.getByRole('region', { name: 'Prayer' })).toContainText('personal Saviour');
});

test('age shelves expose personal readings on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/plans');
  await page
    .getByRole('group', { name: 'Grow in faith' })
    .getByRole('link', { name: /Ages and life stages/ })
    .click();
  await page.getByRole('link', { name: /Children · Ages 6–9/ }).click();
  await page.getByRole('link', { name: 'Little steps with Jesus', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Little steps with Jesus', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start plan' }).click();
  await expect(page.getByRole('region', { name: 'Devotional' })).toContainText(
    'Jesus welcomed them',
  );
  await expect(page.getByRole('region', { name: 'Prayer' })).toBeVisible();
});
