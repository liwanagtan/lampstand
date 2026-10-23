import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('on a phone, Go to shows the testaments as tabs and opens chapters in place', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page, '/bible');
  await page.getByRole('button', { name: /John 1/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Go to' });
  // Opens on the testament you are reading in.
  await expect(sheet.getByRole('tab', { name: 'New Testament' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await sheet.getByRole('tab', { name: 'Old Testament' }).click();
  await sheet.getByRole('button', { name: /^Psalms/ }).click();
  await sheet.getByRole('button', { name: '23', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Psalms 23', level: 1 })).toBeVisible();
});
