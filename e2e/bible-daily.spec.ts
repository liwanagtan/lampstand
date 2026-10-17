import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('Today, reading plans and the journal', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 860 });
  await openApp(page, '/');
  const verse = page.getByRole('region', { name: 'Verse of the day' });
  await expect(verse.locator('blockquote')).toContainText(/\w{3,}/);
  await expect(page.getByRole('region', { name: 'This week' })).toBeVisible();

  // Read in context opens the chapter in a side panel, without leaving Today.
  await verse.getByRole('button', { name: 'Read in context' }).click();
  await expect(page.getByRole('dialog')).toContainText('Around');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);

  // Reflect writes into the journal from a side panel.
  await verse.getByRole('button', { name: 'Reflect' }).click();
  await page.getByRole('dialog').getByLabel('Your entry').fill('Be still and know.');
  await expect(
    page.getByRole('dialog').getByRole('status').filter({ hasText: 'Saved' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', { name: 'Reflection' })).toContainText(
    'Be still and know.',
  );

  // Present turns into Stop Presenting; leaving Today ends a session Today started.
  const popup = page.waitForEvent('popup');
  await verse.getByRole('button', { name: 'Show on screen' }).click();
  const output = await popup;
  await expect(output.getByTestId('output')).toContainText(/\w{3,}/);
  await verse.getByRole('button', { name: 'Stop showing' }).click();
  await expect.poll(() => output.isClosed()).toBe(true);
  const popup2 = page.waitForEvent('popup');
  await verse.getByRole('button', { name: 'Show on screen' }).click();
  const output2 = await popup2;
  await expect(verse.getByRole('button', { name: 'Stop showing' })).toBeVisible();
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect.poll(() => output2.isClosed()).toBe(true);
  await page.getByRole('link', { name: 'Today' }).click();

  // Start a plan; only the next reading is shown.
  await page.getByRole('button', { name: 'Choose a plan' }).click();
  // Discover: open the plan page, preview, then start.
  await page.getByRole('link', { name: 'The Gospels in 40 days' }).click();
  await expect(page.getByRole('region', { name: 'First reading' })).toContainText('Matthew 1–4');
  await page.getByRole('button', { name: 'Start plan' }).click();

  // Starting opens day 1; read it, then finish after the last verse.
  await expect(page.getByRole('heading', { name: 'Matthew 1–4' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Matthew 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish day 1' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Well done!' })).toBeVisible();
  await page.getByRole('button', { name: 'Read day 2 now' }).click();
  await expect(page.getByRole('heading', { name: 'Matthew 5–7' })).toBeVisible();
  await page.getByRole('link', { name: 'Plans' }).click();
  const gospels = page.getByRole('region', { name: 'The Gospels in 40 days' });
  await expect(gospels).toContainText('1 of 40');
  await expect(gospels.getByRole('button', { name: 'Read day 2' })).toBeVisible();

  // A weekly lesson plan shows this week's lesson, with its note and questions.
  await page.getByRole('link', { name: 'Parables of Jesus' }).first().click();
  await page.getByRole('button', { name: 'Start plan' }).click();
  await expect(page.getByRole('heading', { name: 'The Sower' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Questions' })).toContainText('four soils');
  await page.getByRole('button', { name: 'Finish lesson 1' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Well done!' })).toContainText(
    'The next lesson opens',
  );
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect(page.getByRole('region', { name: 'Parables of Jesus' })).toContainText(
    'Lesson 2 opens',
  );

  // Import a plan file (a version 1 file still works).
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
  await expect(
    page.getByRole('group', { name: 'More plans' }).getByRole('link', { name: 'Advent test' }),
  ).toBeVisible();

  // Journey's journal: a new entry with a chosen verse, edited in a side panel.
  await page.getByRole('link', { name: /Profile: your journey/ }).click();
  await page.getByRole('button', { name: 'New entry' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Verse').fill('psalm 23 1');
  await sheet.getByLabel('Verse').press('Enter');
  await expect(sheet).toContainText('The Lord is my shepherd');
  await sheet.getByLabel('Title').fill('My shepherd');
  await sheet.getByLabel('Your entry').fill('Grace upon grace.');
  await expect(sheet.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  await page.keyboard.press('Escape');
  const list = page.getByRole('button', { name: /My shepherd/ });
  await expect(list).toContainText('Psalm 23:1');
  await page.reload();
  await expect(page.getByRole('button', { name: /My shepherd/ })).toBeVisible();

  // Screen is one tap away, with its two ways in.
  await page.getByRole('link', { name: 'Screen' }).click();
  await expect(page.getByRole('heading', { name: 'Screen', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /Show the Bible/ })).toBeVisible();
});
