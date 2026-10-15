// WCAG 2.2 AA checks for the operator app (PRD §10 Accessibility).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { importSample, openApp } from './helpers';

test.describe.configure({ timeout: 120_000 });

async function audit(page: Page, label: string) {
  // Let entrance animations (toasts, cascades) finish so text is measured at full opacity.
  await page.waitForTimeout(800);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    // Slide drawings are decorative (aria-hidden) and checked for 7:1 contrast in unit tests.
    .exclude('[data-template]')
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  if (serious.length) {
    console.log(
      label,
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          nodes: v.nodes.slice(0, 3).map((n) => [n.target, n.failureSummary?.slice(0, 200)]),
        })),
        null,
        1,
      ),
    );
  }
  expect(serious, `${label}: ${serious.map((v) => v.id).join(', ')}`).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`operator screens pass axe in ${scheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1366, height: 768 });
    await openApp(page, '/');
    await audit(page, 'empty library');
    await importSample(page);
    await audit(page, 'library');
    await openApp(page, '/import');
    await audit(page, 'import');
    await openApp(page, '/settings');
    await audit(page, 'settings');
    await openApp(page, '/');
    await page.getByRole('button', { name: 'Actions for A Lamp in the Dark' }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await expect(page.getByRole('navigation', { name: 'Slides' })).toBeVisible();
    await audit(page, 'editor');
    await page.goto('/');
    await page.getByRole('button', { name: 'Present A Lamp in the Dark' }).click();
    await expect(page.getByText('LIVE', { exact: true })).toBeVisible();
    await audit(page, 'control screen');
  });
}
