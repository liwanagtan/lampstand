import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Today, reading plans and the journal', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await openApp(page, '/bible/today');
  const verse = page.getByRole('region', { name: 'Verse of the day' });
  await expect(verse.locator('blockquote')).toContainText(/\w{3,}/);

  // Start a plan; only the next reading is shown.
  await page.getByRole('button', { name: 'Choose a plan' }).click();
  const gospels = page.getByRole('region', { name: 'The Gospels in 40 days' });
  await gospels.getByRole('button', { name: 'Start plan' }).click();
  await expect(gospels).toContainText('Matthew 1–4');
  await expect(gospels.getByRole('checkbox')).toHaveCount(0);

  // Read the day, then finish it after the last verse.
  await gospels.getByRole('button', { name: 'Read day 1' }).click();
  await expect(page.getByRole('heading', { name: 'Matthew 1–4' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Matthew 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish day 1' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Well done!' })).toBeVisible();
  await page.getByRole('button', { name: 'Read day 2 now' }).click();
  await expect(page.getByRole('heading', { name: 'Matthew 5–7' })).toBeVisible();
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect(gospels).toContainText('1 of 40');
  await expect(gospels.getByRole('button', { name: 'Read day 2' })).toBeVisible();

  // A weekly lesson plan shows this week's lesson, with its note and questions.
  const parables = page.getByRole('region', { name: 'Parables of Jesus' });
  await parables.getByRole('button', { name: 'Start plan' }).click();
  await expect(parables).toContainText("This week's lesson");
  await parables.getByRole('button', { name: 'Read lesson 1' }).click();
  await expect(page.getByRole('heading', { name: 'The Sower' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Questions' })).toContainText('four soils');
  await page.getByRole('button', { name: 'Finish lesson 1' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Well done!' })).toContainText(
    'The next lesson opens',
  );
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect(parables).toContainText('Lesson 2 opens');

  // Import a plan file.
  await page.getByLabel('Choose a plan file').setInputFiles({
    name: 'advent.lampstand-plan.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'lampstand-plan',
        version: 1,
        id: 'advent-test',
        name: 'Advent test',
        description: 'Two days.',
        pace: 'daily',
        days: [{ readings: ['Isaiah 9:1-7'] }, { readings: ['Luke 2:1-20'] }],
      }),
    ),
  });
  await expect(page.getByRole('region', { name: 'Advent test' })).toContainText('Imported');

  // Journal autosaves and is listed back on Today.
  await page.getByRole('link', { name: 'Journal' }).click();
  await page.getByLabel('What stands out to you?').fill('Grace upon grace.');
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('What stands out to you?')).toHaveValue('Grace upon grace.');
  await page.getByRole('link', { name: 'Today' }).click();
  await expect(page.getByRole('region', { name: 'Journal' })).toContainText('You wrote today.');

  // The Library shows the verse of the day.
  await page.getByRole('link', { name: 'Library' }).click();
  await expect(page.getByRole('heading', { name: 'Library', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Verse of the day' })).toBeVisible();
});
