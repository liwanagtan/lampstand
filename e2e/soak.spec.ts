// PRD §10: a long run of auto-advancing slides and verses with no memory growth beyond 10%
// and < 600 MB for control + output. Run the full 2 hours on the church laptop:
//   SOAK_MINUTES=120 npm run soak
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { importSample } from './helpers';

const MINUTES = Number(process.env.SOAK_MINUTES ?? 0);
test.skip(!MINUTES, 'Set SOAK_MINUTES to run the soak test');
test.setTimeout((MINUTES + 5) * 60_000);

async function heap(cdp: CDPSession): Promise<number> {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  return metrics.find((m) => m.name === 'JSHeapUsedSize')!.value / 1024 / 1024;
}

async function cdpFor(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  return cdp;
}

test(`soak: ${MINUTES} minutes of slides and verses`, async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await importSample(page);
  await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Start Presentation' }).click();
  const output = await popup;
  await expect(page.getByText('Output connected')).toBeVisible();
  const [cc, oc] = [await cdpFor(page), await cdpFor(output)];

  const refs = [
    'jn 3 16',
    'ps 23',
    'rom 8 28-39',
    'isa 40 31',
    'mt 5 14-16 web',
    'heb 11 1',
    '1 cor 13 4-7 asv',
    'phil 4 13',
  ];
  const modes = ['1', '2', '3'];
  const samples: { t: number; control: number; output: number }[] = [];
  const end = Date.now() + MINUTES * 60_000;
  let step = 0;
  let nextSample = Date.now() + 60_000; // after a minute of warm-up
  while (Date.now() < end) {
    await page.keyboard.press('ArrowRight');
    if (step % 21 === 20) await page.keyboard.press('Home');
    if (step % 5 === 0) {
      await page.keyboard.press('/');
      await page.keyboard.type(refs[(step / 5) % refs.length]!);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(800);
      await page.keyboard.press(modes[step % 3]!);
      await page.waitForTimeout(800);
      await page.keyboard.press('Alt+ArrowRight');
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
    }
    if (step % 17 === 0) {
      // The animated Scene poster, live in both windows for a while.
      await page.keyboard.press('s');
      await page.waitForTimeout(6000);
      await page.keyboard.press('s');
    }
    if (step % 13 === 0) {
      await page.keyboard.press('b');
      await page.waitForTimeout(300);
      await page.keyboard.press('b');
    }
    await page.waitForTimeout(700);
    step++;
    if (Date.now() >= nextSample) {
      samples.push({ t: Date.now(), control: await heap(cc), output: await heap(oc) });
      console.log(
        `sample ${samples.length}: control ${samples.at(-1)!.control.toFixed(1)} MB, output ${samples.at(-1)!.output.toFixed(1)} MB`,
      );
      nextSample = Date.now() + 30_000;
    }
  }
  samples.push({ t: Date.now(), control: await heap(cc), output: await heap(oc) });
  const first = samples[0]!;
  const last = samples.at(-1)!;
  const growth = (last.control + last.output) / (first.control + first.output) - 1;
  console.log(`steps ${step}, heap growth ${(growth * 100).toFixed(1)}%`);
  expect(last.control + last.output).toBeLessThan(600);
  expect(growth).toBeLessThan(0.1);
});
