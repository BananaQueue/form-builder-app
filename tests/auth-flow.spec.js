import { expect, test } from '@playwright/test';
import { E2E_SUPER_ADMIN, resetTestDatabase } from './e2e-helpers';

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('super admin can log in against seeded test database', async ({ page }) => {
  await page.goto('/');

  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Users' })).toBeVisible();
  await expect(page.locator('.nav-user-chip')).toContainText(E2E_SUPER_ADMIN.username);
});
