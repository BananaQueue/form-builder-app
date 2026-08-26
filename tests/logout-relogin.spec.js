import { expect, test } from '@playwright/test';
import { E2E_SUPER_ADMIN, resetTestDatabase } from './e2e-helpers';

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('logging back in immediately after logout succeeds without a page reload', async ({ page }) => {
  // Regression test: api/login is CSRF-protected, and the in-memory CSRF
  // token used to only ever get set on initial mount or on a successful
  // login - never refreshed after logout. Since logout invalidates the
  // session server-side (issuing a fresh token with the new one), the
  // stale in-memory token became permanently unusable for the rest of the
  // SPA's life, and every subsequent login attempt failed with a CSRF
  // mismatch the UI could only report as "Login failed" - indistinguishable
  // from a wrong password. This only reproduces WITHOUT a page reload
  // between logout and the next login, which is exactly what a real user
  // does and exactly what every other e2e test's login() helper avoids by
  // always starting with page.goto('/').
  await page.goto('/');
  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.locator('#login-username')).toBeVisible();

  // No page.goto here - staying in the same SPA instance is the whole point.
  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();
  await expect(page.getByText('Login failed')).not.toBeVisible();
});
