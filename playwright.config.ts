import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 60_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', browserName: 'chromium', viewport: { width: 1280, height: 800 }, trace: 'off', screenshot: 'only-on-failure' },
  reporter: [['list']],
  webServer: { command: 'node scripts/browser-test-server.mjs', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
});
