import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('find a plan by feeling, by group and by search; preview, start and reflect', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await openApp(page, '/plans');
  const nav = page.getByRole('navigation', { name: 'Main' });

  // By feeling: a chip opens the category. (Empty categories stay hidden: see the unit test.)
  const feel = page.getByRole('group', { name: 'For how you feel' });
  // The first feelings show as chips; See all lists every one.
  await expect(feel.getByRole('link', { name: 'See all' })).toBeVisible();
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
  await page.getByRole('link', { name: /Profile: your journey/ }).click();
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
  // Filters are chips that work like select fields.
  await page.getByRole('button', { name: 'Length' }).click();
  await page.getByRole('menuitem', { name: 'Weekly lessons' }).click();
  const discover = page.getByRole('region', { name: 'Discover' });
  await expect(discover.getByRole('link', { name: 'Sharing your faith' })).toBeVisible();
  await expect(discover.getByRole('link', { name: 'When anxiety rises' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Length: Weekly lessons' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear length' }).click();
  await page.getByRole('button', { name: 'For' }).click();
  await page.getByRole('menuitem', { name: 'Groups' }).click();
  await expect(discover.getByRole('link', { name: 'Parables of Jesus' })).toBeVisible();
  await expect(discover.getByRole('link', { name: 'When anxiety rises' })).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ hasTouch: true });

  test('Plans greets you, and filters open as a bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page, '/plans');
    await expect(page.getByRole('heading', { name: 'A plan for you', exact: true })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await page.getByRole('button', { name: 'Length' }).tap();
    const sheet = page.getByRole('dialog', { name: 'Length' });
    await sheet.getByRole('radio', { name: 'Monthly lessons' }).tap();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: 'Length: Monthly lessons' })).toBeVisible();
  });
});

test('in a plan day, every part follows the text size', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await openApp(page, '/plans/p/when-anxiety-rises');
  await page.getByRole('button', { name: 'Start plan' }).click();
  const size = (sel: string) =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const note = 'p[class*="note"]';
  const chapter = 'section[aria-label^="Philippians"] div[class*="chapter"]';
  const before = [await size(note), await size(chapter)];
  // The one reading control opens the Reading sheet with the size scale.
  await page
    .getByRole('button', { name: /^Reading settings/ })
    .filter({ visible: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Reading' })
    .getByRole('button', { name: 'Larger text' })
    .click();
  await page.keyboard.press('Escape');
  await expect.poll(() => size(chapter)).toBeGreaterThan(before[1]!);
  expect(await size(note)).toBeGreaterThan(before[0]!);
});
