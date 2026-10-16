import { expect, test } from '@playwright/test';
import { importSample } from './helpers';

test.describe.configure({ timeout: 120_000 });

test('the Sermon screen plays the animated Scene on the TV, offline-ready', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  context.on('request', (r) => {
    const u = new URL(r.url());
    if (
      !['localhost', '127.0.0.1'].includes(u.hostname) &&
      !u.protocol.startsWith('blob') &&
      !u.protocol.startsWith('data')
    )
      external.push(r.url());
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await output.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press('s');

  const scene = output.frameLocator('hyperframes-player iframe');
  await expect(scene.locator('#title')).toHaveText('A Lamp in the Dark', { timeout: 15_000 });
  await expect(scene.locator('#speaker')).toHaveText('Pastor Daniel Cruz');
  await expect(scene.locator('#ref')).toHaveText('Psalm 119:105');
  await expect(scene.locator('#excerpt')).toContainText('Thy word is a lamp unto my feet');
  await expect(scene.locator('#date')).toHaveText('Sun · Oct 18');
  // It keeps playing: the player's clock advances.
  const t1 = await output.evaluate(
    () =>
      (document.querySelector('hyperframes-player') as unknown as { currentTime: number })
        .currentTime,
  );
  await output.waitForTimeout(1500);
  const t2 = await output.evaluate(
    () =>
      (document.querySelector('hyperframes-player') as unknown as { currentTime: number })
        .currentTime,
  );
  expect(t2).toBeGreaterThan(t1);
  await output.waitForTimeout(1500);
  await output.screenshot({ path: 'test-results/scene-output.png' });
  expect(external).toEqual([]);
});

test('Reduce motion shows the still poster frame', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await importSample(page);
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
  await page.keyboard.press('s');
  const player = page.locator('[data-pane="live"] hyperframes-player');
  await expect(player).toHaveCount(1, { timeout: 15_000 });
  await expect
    .poll(
      () =>
        player.evaluate((el) => (el as unknown as { paused: boolean; currentTime: number }).paused),
      { timeout: 15_000 },
    )
    .toBe(true);
  expect(
    await player.evaluate((el) => (el as unknown as { currentTime: number }).currentTime),
  ).toBeCloseTo(2, 0);
});
