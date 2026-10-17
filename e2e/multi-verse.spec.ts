import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test.describe('on a phone', () => {
  test.use({ hasTouch: true });

  test('tap two verses to select a range, highlight it and note it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page, '/bible');
    await page.getByLabel('Search the Bible').fill('jn 3');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'John 3' })).toBeVisible();

    await page.locator('[data-verse="12"] button').last().tap();
    await page.locator('[data-verse="18"] button').last().tap();
    const bar = page.getByRole('toolbar', { name: 'Selected verses' });
    await expect(bar).toContainText('John 3:12–18 · 7 verses');

    await bar.getByRole('button', { name: 'Highlight yellow' }).tap();
    // One continuous band: inner verses join both neighbours.
    await expect(page.locator('[data-verse="12"]')).toHaveAttribute('data-join-next', 'true');
    await expect(page.locator('[data-verse="15"]')).toHaveAttribute('data-join-prev', 'true');
    await expect(page.locator('[data-verse="18"]')).not.toHaveAttribute('data-join-next', 'true');

    await bar.getByRole('button', { name: 'Add a note' }).tap();
    await page.getByRole('dialog').getByRole('textbox').fill('Earthly and heavenly things.');
    await page.getByRole('button', { name: 'Save note' }).tap();
    await expect(page.getByRole('button', { name: /Note on John 3:12–18/ })).toBeVisible();
    await expect(page.locator('[data-verse="12"]')).toHaveAttribute('data-bracket', 'top');
    await expect(page.locator('[data-verse="18"]')).toHaveAttribute('data-bracket', 'bottom');

    // Tapping the lone selected verse clears it.
    await page.locator('[data-verse="20"] button').last().tap();
    await expect(bar).toContainText('John 3:20');
    await page.locator('[data-verse="20"] button').last().tap();
    await expect(bar).toBeHidden();
  });
});

test('a note typed across chapters shows in both chapters', async ({ page }) => {
  await openApp(page, '/bible');
  await page.getByLabel('Search the Bible').fill('jn 3:34-4:2');
  await page.keyboard.press('Enter');
  const bar = page.getByRole('toolbar', { name: 'Selected verses' });
  await expect(bar).toContainText('John 3:34–4:2 · 5 verses');
  await bar.getByRole('button', { name: 'Add a note' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Across the chapter break.');
  await page.getByRole('button', { name: 'Save note' }).click();

  const note = page.getByRole('button', { name: /Note on John 3:34–4:2/ });
  await expect(note).toBeVisible();
  await expect(page.locator('[data-verse="36"]')).toHaveAttribute('data-bracket', 'bottom');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Next chapter' }).first().click();
  await expect(page.getByRole('heading', { name: 'John 4' })).toBeVisible();
  await expect(note).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toHaveAttribute('data-bracket', 'top');
});
