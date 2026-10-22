import { expect, test } from '@playwright/test';
import { openApp, openVerseActions } from './helpers';

test.describe('on a phone', () => {
  test.use({ hasTouch: true });

  test('Search finds a verse, a plan and your own note; Screen waits in Profile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // A note of your own to find.
    await openApp(page, '/search');
    await page.getByRole('searchbox', { name: 'Search' }).fill('rom 8 28');
    await page.getByRole('region', { name: 'Passage' }).getByRole('button').tap();
    await openVerseActions(page, 28);
    await page.getByRole('button', { name: 'Add a note' }).tap();
    await page.getByRole('dialog').getByRole('textbox').fill('Even the hard days.');
    await page.getByRole('button', { name: 'Save note' }).tap();
    await expect(page.getByRole('button', { name: 'Edit note' })).toBeVisible();

    const tabs = page.getByRole('navigation', { name: 'Main' });
    await tabs.getByRole('link', { name: 'Search' }).tap();
    await expect(page).toHaveURL(/\/search$/);
    const box = page.getByRole('searchbox', { name: 'Search' });
    await expect(box).toBeFocused();

    // A reference opens the passage.
    await box.fill('jn 3 16');
    await page
      .getByRole('region', { name: 'Passage' })
      .getByRole('button', { name: /John 3:16/ })
      .tap();
    await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();
    await expect(page.locator('[data-verse="16"] button[aria-pressed]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // A feeling finds plans and verses.
    await tabs.getByRole('link', { name: 'Search' }).tap();
    await page.getByRole('searchbox', { name: 'Search' }).fill('anxiety');
    await expect(
      page.getByRole('region', { name: 'Plans' }).getByRole('link', { name: /When anxiety rises/ }),
    ).toBeVisible();

    // A feeling brings the passages readers find most helpful (OpenBible.info).
    await page.getByRole('searchbox', { name: 'Search' }).fill('lonely');
    await expect(page.getByRole('region', { name: 'Verses for loneliness' })).toBeVisible();

    // Your own words come back too.
    await page.getByRole('searchbox', { name: 'Search' }).fill('hard days');
    const mine = page.getByRole('region', { name: 'Saved reflections and verses' });
    await mine.getByRole('button', { name: /Note · Romans 8:28/ }).tap();
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue('Even the hard days.');
    await page.keyboard.press('Escape');

    // Screen is not a phone tab; Profile has the way in.
    await expect(tabs.getByRole('link', { name: 'Screen' })).toHaveCount(0);
    await tabs.getByRole('link', { name: 'Profile' }).tap();
    await page
      .getByRole('navigation', { name: 'Profile sections' })
      .getByRole('link', { name: 'About you' })
      .tap();
    await page.getByRole('link', { name: /Open Screen/ }).tap();
    await expect(page).toHaveURL(/\/screen$/);
  });
});

test('laptops keep Screen in the top bar, with search right there', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, '/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveText(['Today', 'Plans', 'Bible', 'Screen']);
  await expect(page.getByRole('link', { name: /Open Screen/ })).toHaveCount(0);

  // `/` jumps to the field; results drop down as you type.
  await page.keyboard.press('/');
  const box = page.getByLabel('Search Lampstand');
  await expect(box).toBeFocused();
  await box.fill('anxiety');
  const results = page.getByRole('listbox', { name: 'Search results' });
  await expect(results.getByRole('option', { name: /When anxiety rises/ })).toBeVisible();
  await results.getByRole('option', { name: /See all results/ }).click();
  await expect(page).toHaveURL(/\/search\?q=anxiety$/);
  await expect(page.getByRole('searchbox', { name: 'Search', exact: true })).toHaveValue('anxiety');

  // A reference opens the passage, and the reader bar has no search box of its own.
  await page.getByLabel('Search Lampstand').fill('jn 3 16');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();
  await expect(page.locator('[data-verse="16"] button[aria-pressed]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Search the Bible')).toHaveCount(0);
});
