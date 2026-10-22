import { expect, test } from '@playwright/test';
import { USER, host, storedSession } from './account';
import { openApp } from './helpers';

test.skip(!host, 'Supabase is not configured for this build');

test('maintainers see anonymous totals on /insights', async ({ page }) => {
  await openApp(page);
  await page.evaluate(
    ({ id, session }) => {
      localStorage.setItem(`lampstand.onboarded.${id}`, '1');
      localStorage.setItem('lampstand.guestImport.' + id, 'later');
      localStorage.setItem(session.name, session.value);
    },
    { id: USER.id, session: storedSession() },
  );
  await page.route(`https://${host}/**`, (route) => {
    const url = route.request().url();
    if (url.includes('/rest/v1/rpc/usage_report'))
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          daily: [
            { day: '2026-10-20', name: 'google_chosen', events: 3, devices: 3 },
            { day: '2026-10-20', name: 'guest_chosen', events: 5, devices: 5 },
            { day: '2026-10-20', name: 'welcome_started', events: 8, devices: 8 },
            { day: '2026-10-20', name: 'welcome_completed', events: 6, devices: 6 },
          ],
          active: [{ day: '2026-10-20', daily: 12, weekly: 30 }],
          retention: [{ cohort_day: '2026-10-19', after: 1, cohort: 4, returned: 3 }],
        }),
      });
    if (url.includes('/rest/v1/user_records'))
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return route.abort();
  });
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Usage insights' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('3 / 5')).toBeVisible();
  await expect(page.getByText('75%')).toHaveCount(2); // Welcome finished, and day-1 return
  await expect(page.getByRole('row', { name: /2026-10-20 12 30/ })).toBeVisible();
});
