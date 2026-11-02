import { test, expect } from '@playwright/test';
test('two-minute synthetic worker observation (not a physical-device benchmark)', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/tests/browser/worker-harness.html?durationMs=120000');
  await expect(page.getByRole('status')).not.toHaveText('Loading', { timeout: 170000 });
  const proof = JSON.parse(await page.getByRole('status').innerText());
  expect(proof.error).toBeUndefined(); expect(proof.mode).toBe('worker');
  expect(proof.elapsedMs).toBeGreaterThanOrEqual(120000);
  expect(proof.diagnostics.completed).toBeGreaterThan(100);
  expect(proof.diagnostics.errors).toBe(0);
  console.log('Sustained synthetic worker observation:', JSON.stringify(proof));
});
