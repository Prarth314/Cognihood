import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

async function checkThemes(page: Page) {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: 'light' });
}

test('confirmed account can sign in, review consent, export/delete a session and sign out', async ({ page }) => {
  test.skip(!process.env.COGNI_E2E_EMAIL, 'Disposable backend fixture is required');
  await page.addInitScript(() => {
    localStorage.setItem('cognihood_onboarding_done', 'true');
    (window as any).__cameraCalls = 0;
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = (...args) => { (window as any).__cameraCalls++; return original(...args); };
  });
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.COGNI_E2E_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.COGNI_E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: /A clearer view/ })).toBeVisible();
  await expect(page).toHaveURL(/\/app\/?$/);
  await page.getByRole('button', { name: /Start a session/ }).click();
  await expect(page.getByRole('heading', { name: 'Pre-drive check', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable camera check' })).toBeDisabled();
  await expect(page.getByText('Camera is off', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__cameraCalls)).toBe(0);
  await checkThemes(page);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: /Your trip archives/ }).click();
  await expect(page.getByRole('table', { name: 'Trip history' })).toBeVisible();
  await checkThemes(page);
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  const report = page.getByRole('dialog', { name: 'Trip report' });
  await expect(report).toBeVisible();
  await checkThemes(page);
  page.once('dialog', dialog => dialog.accept());
  const downloadEvent = page.waitForEvent('download');
  await report.getByRole('button', { name: 'Export this session' }).click();
  const stream = await (await downloadEvent).createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(exported.session).not.toHaveProperty('userId');
  expect(exported.session.id).toBeTruthy();
  page.once('dialog', dialog => dialog.accept());
  await report.getByRole('button', { name: 'Delete session', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No trips yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/app/records'); await expect(page).toHaveURL(/\/login\?next=/);
});
