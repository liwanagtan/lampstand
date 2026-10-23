import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    // Past the first-run welcome; e2e/welcome.spec.ts starts without this.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          // The save-to-account offer is tested on its own (e2e/account.spec.ts).
          localStorage: [
            { name: 'lampstand.onboarded', value: '1' },
            { name: 'lampstand.saveOffer.dismissed', value: '1' },
            { name: 'lampstand.installOffer.dismissed', value: '1' },
          ],
        },
      ],
    },
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
