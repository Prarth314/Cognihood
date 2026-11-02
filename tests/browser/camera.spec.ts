import { test, expect } from '@playwright/test';
test('synthetic denied permission does not download or initialize the face model', async ({ page }) => {
  const models: string[] = []; page.on('request', request => { if (request.url().includes('face_landmarker.task')) models.push(request.url()); });
  await page.goto('/tests/browser/camera-harness.html?permission=denied');
  await expect(page.getByRole('alert')).toContainText('Camera permission denied');
  await expect(page.getByText('Camera off', { exact: true })).toBeVisible();
  expect(models).toEqual([]);
});
test('synthetic permission resolving after cancellation closes its track without attaching video', async ({ page }) => {
  await page.goto('/tests/browser/camera-harness.html?permission=pending');
  await expect(page.getByText('Waiting for camera permission…')).toBeVisible();
  await page.getByRole('button', { name: 'Stop fixture' }).click();
  await page.getByRole('button', { name: 'Grant synthetic permission' }).click();
  await expect(page.getByText('Track: ended')).toBeVisible();
  expect(await page.locator('video').evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
});
test('synthetic track termination withdraws evidence and offers stationary recovery', async ({ page }) => {
  await page.goto('/tests/browser/camera-harness.html');
  await expect(page.getByText('Local analysis ready')).toBeVisible({ timeout: 55000 });
  await page.getByRole('button', { name: 'Disconnect synthetic track' }).click();
  await expect(page.getByRole('alert')).toContainText('Camera disconnected');
  await expect(page.getByText('Missing signal: true')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry camera check' })).toBeVisible();
  expect(await page.locator('video').evaluate(video => (video as HTMLVideoElement).srcObject)).toBeNull();
});
