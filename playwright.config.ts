import { defineConfig } from '@playwright/test';
const backend = process.env.COGNI_LOCAL_BACKEND_URL;
if (backend && (!['127.0.0.1','localhost','[::1]'].includes(new URL(backend).hostname) || !process.env.COGNI_E2E_EMAIL || !process.env.COGNI_E2E_PASSWORD)) throw new Error('Backend UI tests require complete disposable loopback fixtures');
export default defineConfig({
  testIgnore: backend ? [] : ['**/backend.spec.ts'],
  testDir: './tests/browser', timeout: 60_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4175', browserName: 'chromium', viewport: { width: 1280, height: 800 }, trace: 'off', screenshot: 'only-on-failure' },
  reporter: [['list']],
  webServer: { command: 'node scripts/browser-test-server.mjs', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
});
