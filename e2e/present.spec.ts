import { expect, test, type Page } from '@playwright/test';
import { importSample } from './helpers';

test.describe.configure({ timeout: 120_000 });

async function startPresenting(page: Page) {
  await importSample(page);
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
}

async function openOutput(page: Page): Promise<Page> {
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await expect(output.getByTestId('output')).toBeVisible();
  return output;
}

const outputText = (output: Page) => output.getByTestId('output');

test('present with two windows: the output mirrors only what goes live', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startPresenting(page);
  const output = await openOutput(page);
  await expect(page.getByText('Output connected')).toBeVisible();

  // Slide 1 is the countdown.
  await expect(outputText(output)).toContainText('Service begins soon', { ignoreCase: true });

  // Selecting a slide into Preview must not change the TV.
  await page.getByRole('button', { name: 'Slide 5, section' }).click();
  await expect(page.getByText('Slide 5 · section')).toBeVisible();
  await expect(outputText(output)).toContainText('Service begins soon', { ignoreCase: true });

  // Enter sends it live.
  await page.keyboard.press('Enter');
  await expect(outputText(output)).toContainText('The Word reveals');

  // Next/previous go live immediately; clickers send PageDown/PageUp.
  await page.keyboard.press('PageDown');
  await expect(outputText(output)).toContainText('Light shows what is really there');
  await page.keyboard.press('ArrowLeft');
  await expect(outputText(output)).toContainText('The Word reveals');

  // Blank and logo cover the slide and return.
  await page.keyboard.press('b');
  await expect(page.getByRole('button', { name: /Blank/ })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('b');
  await expect(page.getByRole('button', { name: /Blank/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('build lists reveal one item per Next', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startPresenting(page);
  await page.getByRole('button', { name: 'Slide 11, list' }).click();
  await page.keyboard.press('Enter');
  await expect(page.getByText('item 0 of 3')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('item 1 of 3')).toBeVisible();
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await expect(page.getByText('item 3 of 3')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText('Slide 12 of 21')).toBeVisible();
});

test('closing and reopening the output restores exactly the live state', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startPresenting(page);
  let output = await openOutput(page);
  await page.getByRole('button', { name: 'Slide 11, list' }).click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('l');
  await expect(page.getByText('item 2 of 3')).toBeVisible();

  await output.close();
  await expect(page.getByText('Output disconnected.')).toBeVisible({ timeout: 8000 });

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();
  output = await popup;
  await expect(page.getByText('Output connected')).toBeVisible();
  await expect(page.getByText('Output disconnected.')).toHaveCount(0);
  // Logo screen still up; turning it off shows the list with exactly two items revealed.
  await page.keyboard.press('l');
  await expect(outputText(output)).toContainText('How the Word guides us');
  const items = output.locator('li');
  await expect(items).toHaveCount(3);
  await expect(output.locator('li:not([class*="hidden"])')).toHaveCount(2);
});

test('control dock: sermon, freeze, start and exit', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startPresenting(page);
  const output = await openOutput(page);
  await expect(page.getByRole('button', { name: 'Exit Presentation' })).toBeVisible();

  // Sermon poster covers the slide and toggles back.
  await page.keyboard.press('s');
  await expect(page.getByRole('button', { name: /Sermon/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(outputText(output)).toContainText('A Lamp in the Dark');
  await page.keyboard.press('s');

  // Freeze holds the TV while the operator keeps working.
  await page.getByRole('button', { name: 'Slide 5, section' }).dblclick();
  await expect(outputText(output)).toContainText('The Word reveals');
  await page.keyboard.press('f');
  await expect(page.getByRole('status').filter({ hasText: 'FROZEN' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  await expect(outputText(output)).toContainText('The Word reveals');
  await expect(outputText(output)).not.toContainText('Light shows what is really there');
  await page.keyboard.press('f');
  await expect(outputText(output)).toContainText('Light shows what is really there');

  // Exit asks first, then closes the output without a disconnected warning.
  await page.getByRole('button', { name: 'Exit Presentation' }).click();
  await page.getByRole('button', { name: 'Exit presentation' }).click();
  await expect(page.getByRole('button', { name: 'Start Presentation' })).toBeVisible();
  await expect(page.getByText('Not presenting')).toBeVisible();
  await expect(page.getByText('Output disconnected.')).toHaveCount(0);
});

test('the disconnected banner can be dismissed and hides itself', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startPresenting(page);
  const output = await openOutput(page);
  await output.close();
  await expect(page.getByText('Output disconnected.')).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'Dismiss warning' }).click();
  await expect(page.getByText('Output disconnected.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Output disconnected · Reopen' })).toBeVisible();
});

test('strip arrows page through the slides', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await startPresenting(page);
  const list = page.getByRole('navigation', { name: 'Slides' }).locator('ol');
  const before = await list.evaluate((el) => el.scrollLeft);
  await page.getByRole('button', { name: 'Scroll slides right' }).click();
  await expect.poll(() => list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
});
