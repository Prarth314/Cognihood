import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { legalLinks } from '../../services/siteRoutes';
for (const colorScheme of ['light', 'dark'] as const) for (const route of ['/', '/mission', '/how-it-works', '/hardware', '/login', ...legalLinks.map(([, path]) => path)]) {
  test(`public accessibility (${colorScheme}): ${route}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto(route);
    const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  });
}
test('public navigation and protected routes work with production CSP', async ({ page }) => {
  const errors: string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto('/login');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self' 'wasm-unsafe-eval'");
  await expect(page.getByRole('heading',{name:'Good to see you.'})).toBeVisible();
  await page.goto('/app/records');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Frecords/);
  expect(errors).toEqual([]);
});
test('mobile login has no horizontal overflow and keyboard access remains available', async ({ page }) => {
  await page.setViewportSize({width:390,height:844}); await page.goto('/login');
  await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.keyboard.press('Tab'); await expect(page.getByRole('link',{name:'Skip to sign in'})).toBeFocused();
});
test('real worker loads same-origin WASM under CSP and keeps main-thread timers responsive', async ({ page }) => {
  await page.goto('/tests/browser/worker-harness.html');
  await expect(page.getByRole('status')).not.toHaveText('Loading',{timeout:55_000});
  const proof=JSON.parse(await page.getByRole('status').innerText());
  expect(proof.error).toBeUndefined(); expect(proof.mode).toBe('worker'); expect(proof.detected).toBe(false); expect(proof.ticks).toBeGreaterThan(0);
  console.log('Synthetic non-face worker timing:',JSON.stringify(proof));
});
