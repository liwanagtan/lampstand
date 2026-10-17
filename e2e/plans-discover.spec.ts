import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('find a plan by feeling, by group and by search; preview, start and reflect', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await openApp(page, '/plans');
  const nav = page.getByRole('navigation', { name: 'Main' });

  // By feeling: a chip opens the category, empty feelings stay hidden.
  const feel = page.getByRole('group', { name: 'For how you feel' });
  await expect(feel.getByRole('link', { name: /Pride/ })).toHaveCount(0);
  await feel.getByRole('link', { name: /^Anxiety/ }).click();
  await expect(page.getByRole('heading', { name: 'Anxiety', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'When anxiety rises' }).click();

  // The plan page previews day 1 before you commit.
  await expect(page.getByRole('heading', { name: 'When anxiety rises' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'First reading' })).toContainText(
    'Bring it to God',
  );
  await page.getByRole('button', { name: 'Start plan' }).click();
  await expect(page.getByRole('region', { name: 'Devotional' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Prayer' })).toBeVisible();

  // Reflect on this day writes into Journal, tied to the reading.
  await page.getByRole('button', { name: 'Reflect on this day' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByLabel('Title')).toHaveValue('When anxiety rises · Day 1');
  await sheet.getByLabel('Your entry').fill('Naming my worries helped.');
  await expect(sheet.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Journal' }).click();
  await expect(page.getByRole('button', { name: /When anxiety rises · Day 1/ })).toContainText(
    'Philippians 4:4',
  );

  // By group: Grow in faith › New to faith › First steps.
  await nav.getByRole('link', { name: 'Plans' }).click();
  await page
    .getByRole('group', { name: 'Grow in faith' })
    .getByRole('link', { name: /New to faith/ })
    .click();
  await expect(page.getByRole('link', { name: /First steps/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'First steps in faith' })).toBeVisible();

  // By search, and by pace.
  await nav.getByRole('link', { name: 'Plans' }).click();
  await page.getByLabel('Search plans').fill('gospels');
  await expect(page.getByRole('link', { name: 'The life of Jesus in 21 days' })).toBeVisible();
  await page.getByLabel('Search plans').fill('');
  await page.getByRole('radio', { name: 'Weekly lessons' }).click();
  const discover = page.getByRole('region', { name: 'Discover' });
  await expect(discover.getByRole('link', { name: 'Sharing your faith' })).toBeVisible();
  await expect(discover.getByRole('link', { name: 'When anxiety rises' })).toHaveCount(0);
});
