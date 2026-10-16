// PRD §10 performance targets, measured inside the browser. The real check is on the church
// laptop (8 GB Windows); these keep regressions out on any machine.
import { expect, test, type Page } from '@playwright/test';
import { importSample } from './helpers';

test.describe.configure({ timeout: 120_000 });

async function present(page: Page) {
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
}

test('cold start to library < 2 s', async ({ page }) => {
  await importSample(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  const ms = await page.evaluate(() => performance.now());
  console.log(`cold start ${ms.toFixed(0)} ms`);
  expect(ms).toBeLessThan(2000);
});

test('verse lookup keypress to result < 50 ms', async ({ page }) => {
  await present(page);
  const measure = (text: string, expected: string) =>
    page.evaluate(
      async ({ text, expected }) => {
        const input = document.querySelector<HTMLInputElement>(
          'input[aria-label="Verse command bar"]',
        )!;
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(input, '');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((r) => setTimeout(r, 50));
        const t0 = performance.now();
        setter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        for (;;) {
          const list = document.querySelector('[cmdk-list]');
          if (list?.textContent?.includes(expected)) return performance.now() - t0;
          if (performance.now() - t0 > 2000) return Infinity;
          await new Promise((r) => requestAnimationFrame(r));
        }
      },
      { text, expected },
    );
  await measure('gen 1 1', 'In the beginning'); // warm caches
  const times = [
    await measure('jn 3 16', 'For God so loved'),
    await measure('rom 8 28', 'all things work together'),
    await measure('ps 23 1 web', 'shepherd'),
  ];
  console.log(`verse lookup ${times.map((t) => t.toFixed(1)).join(', ')} ms`);
  for (const t of times) expect(t).toBeLessThan(50);
});

test('go live: keypress to TV change < 100 ms', async ({ page }) => {
  await present(page);
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await expect(page.getByText('Output connected')).toBeVisible();
  await output.evaluate(() => {
    const w = window as unknown as { __delays: number[] };
    w.__delays = [];
    const ch = new BroadcastChannel('lampstand-live');
    ch.onmessage = (e: MessageEvent<{ type: string; snapshot?: { changedAt: number } }>) => {
      if (e.data.type !== 'snapshot' || !e.data.snapshot) return;
      const sent = e.data.snapshot.changedAt;
      const obs = new MutationObserver(() => {
        w.__delays.push(Date.now() - sent);
        obs.disconnect();
      });
      obs.observe(document.querySelector('[data-testid="output"]')!, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    };
  });
  const keyAt: number[] = [];
  for (let i = 0; i < 5; i++) {
    keyAt.push(Date.now());
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
  }
  const delays = await output.evaluate(
    () => (window as unknown as { __delays: number[] }).__delays,
  );
  console.log(`go live ${delays.join(', ')} ms`);
  expect(delays.length).toBeGreaterThanOrEqual(5);
  for (const d of delays) expect(d).toBeLessThan(100);
});
