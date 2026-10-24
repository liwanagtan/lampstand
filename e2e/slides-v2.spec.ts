import { test, expect } from '@playwright/test';
import { importFile } from './helpers';

test('v2 attachments wait in the regular queue and use the regular verse controls', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await importFile(page, 'tests/fixtures/rich-toward-god.lampstand.json');
  await expect(page.getByText('Ready to save')).toBeVisible();
  await expect(page.getByText(/can’t be shown/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Save to library' }).click();
  await page.getByRole('button', { name: 'Present Rich Toward God' }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  const tv = output.getByTestId('output');
  await expect(tv).toBeVisible();
  const operatorLive = page.getByRole('img', { name: 'Live output', exact: true });
  await expect(operatorLive.locator('[class*="placeholderText"]')).toContainText(
    'man looking at large barns',
  );
  await expect(tv.locator('[class*="placeholder"]')).toHaveCount(0);
  await expect(tv).not.toContainText('man looking at large barns');
  // A reconnected output uses a non-animated first frame; it must still hide operator guidance.
  await output.reload();
  await expect(tv).toContainText('Rich Toward God');
  await expect(tv.locator('[class*="placeholder"]')).toHaveCount(0);
  await expect(tv).not.toContainText('man looking at large barns');
  await expect(operatorLive.locator('[class*="placeholderText"]')).toBeVisible();
  await operatorLive.screenshot({ path: 'test-results/operator-background-guidance.png' });
  await tv.screenshot({ path: 'test-results/audience-clean-background.png' });
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Page 1 of 3', { exact: true }).first()).toBeVisible();
  await expect(tv.locator('sup')).toHaveCount(2);
  await expect(tv.locator('sup').first()).toHaveText('16');
  await page.keyboard.press(']');
  await expect(tv.locator('sup').first()).toHaveText('18');
  await page.keyboard.press(']');
  await expect(tv.locator('sup').first()).toHaveText('20');
  await page.keyboard.press('ArrowRight');
  const currentQueue = page.getByRole('list', { name: 'For this slide', exact: true });
  await expect(currentQueue).toContainText('Luke 12:21');
  await expect(tv.locator('sup')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hide panel', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next verse', exact: true })).toHaveCount(0);
  // The screenshot's point slide remains full width until its verse is explicitly shown.
  await page.getByRole('navigation', { name: 'Slides' }).getByRole('button').nth(6).click();
  await page.keyboard.press('Enter');
  await expect(currentQueue).toContainText('Psalm 24:1');
  await expect(currentQueue).not.toContainText('Luke 12:21');
  await expect(tv).toContainText('when our possessions possess us.');
  await expect(tv.locator('sup')).toHaveCount(0);
  await currentQueue.getByRole('button', { name: /^Psalm 24:1/ }).click();
  await expect(tv).toContainText('The earth is the');
  await expect(page.getByRole('button', { name: /Remove verse/ })).toBeVisible();
  await expect(
    page.getByRole('radiogroup', { name: 'How the verse shows' }).getByRole('radio').first(),
  ).toHaveText('1 Side panel');
  await expect(
    page.getByRole('radiogroup', { name: 'How the verse shows' }).getByRole('radio').first(),
  ).toHaveAttribute('aria-checked', 'true');
  // All four regular modes also apply to an attached verse.
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press(String(i + 1));
    await expect(
      page.getByRole('radiogroup', { name: 'How the verse shows' }).getByRole('radio').nth(i),
    ).toHaveAttribute('aria-checked', 'true');
    await expect(tv).toContainText('The earth is the');
  }
  await page.keyboard.press('1');
  await page.getByRole('button', { name: /Remove verse/ }).click();
  await expect(tv).not.toContainText('The earth is the');
  await expect(tv).toContainText('when our possessions possess us.');
  // Next changes slides without automatically showing the next slide's attachment.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(currentQueue).toContainText('Luke 12:19–20');
  await expect(tv.locator('sup')).toHaveCount(0);
  await currentQueue.getByRole('button').click();
  await expect(tv).toContainText('Soul, thou hast much goods');
  const emphasis = tv.locator('[class*="emphasisOn"]').first();
  await expect(emphasis).toHaveCSS('color', 'rgb(242, 179, 61)');
  await expect(emphasis).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  const side = tv.locator('[class*="sidePanel"]').last();
  await expect(side).toHaveCSS('border-radius', '0px');
  const frame = await tv.locator('[data-template]').boundingBox();
  const rail = await side.boundingBox();
  expect(rail!.y).toBeCloseTo(frame!.y, 0);
  expect(rail!.height).toBeCloseTo(frame!.height, 0);
  expect(rail!.width).toBeCloseTo(frame!.width * 0.42, 0);
  await output.screenshot({ path: 'test-results/side-panel-color-emphasis.png' });
  await page.keyboard.press('Escape');
  await expect(tv.locator('sup')).toHaveCount(0);
  // Searched verses continue to use the same controls.
  await page.keyboard.press('/');
  const command = page
    .getByLabel('Verse command bar', { exact: true })
    .filter({ visible: true })
    .last();
  await command.fill('John 3:16');
  await command.press('Enter');
  await expect(tv).toContainText('For God so loved');
  await command.blur();
  await page.keyboard.press('Escape');
  await expect(tv).not.toContainText('For God so loved');
  await expect(tv.locator('sup')).toHaveCount(0);
  // Reveal steps cannot skip an item, and Next still changes slides.
  await page.getByRole('navigation', { name: 'Slides' }).getByRole('button').nth(10).click();
  await page.keyboard.press('Enter');
  await expect(tv.locator('li:not([class*="hidden"])')).toHaveCount(0);
  for (let i = 1; i <= 4; i++) {
    await page.keyboard.press('r');
    await expect(tv.locator('li:not([class*="hidden"])')).toHaveCount(i);
  }
  await page.screenshot({ path: 'test-results/slides-v2-console.png' });
  await output.screenshot({ path: 'test-results/slides-v2-output.png' });
  await page.keyboard.press('ArrowRight');
  await expect(tv).toContainText('The Poverty of His Soul');
  await output.close();
});
