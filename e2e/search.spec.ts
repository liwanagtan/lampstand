import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

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
    await page.getByRole('button', { name: 'Add a note' }).tap();
    await page.getByRole('dialog').getByRole('textbox').fill('Even the hard days.');
    await page.getByRole('button', { name: 'Save note' }).tap();
    await expect(page.getByRole('button', { name: /Note on Romans 8:28/ })).toBeVisible();

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
    await expect(page.getByRole('toolbar', { name: 'Selected verses' })).toContainText('John 3:16');

    // A feeling finds plans and verses.
    await tabs.getByRole('link', { name: 'Search' }).tap();
    await page.getByRole('searchbox', { name: 'Search' }).fill('anxiety');
    await expect(
      page.getByRole('region', { name: 'Plans' }).getByRole('link', { name: /When anxiety rises/ }),
    ).toBeVisible();

    // Your own words come back too.
    await page.getByRole('searchbox', { name: 'Search' }).fill('hard days');
    const mine = page.getByRole('region', { name: 'Your journey' });
    await mine.getByRole('button', { name: /Note · Romans 8:28/ }).tap();
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue('Even the hard days.');
    await page.keyboard.press('Escape');

    // Screen is not a phone tab; Profile has the way in.
    await expect(tabs.getByRole('link', { name: 'Screen' })).toHaveCount(0);
    await tabs.getByRole('link', { name: 'Profile' }).tap();
    await page
      .getByRole('navigation', { name: 'Profile sections' })
      .getByRole('link', { name: 'Profile' })
      .tap();
    await page.getByRole('link', { name: /Present on a screen/ }).tap();
    await expect(page).toHaveURL(/\/screen$/);
  });
});

test('laptops keep Screen in the top bar, with a Search button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openApp(page, '/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link')).toHaveText(['Today', 'Bible', 'Plans', 'Screen']);
  await page.getByRole('link', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/\/search$/);
  await expect(page.getByRole('link', { name: /Present on a screen/ })).toHaveCount(0);
});
