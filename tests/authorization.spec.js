import { expect, test } from '@playwright/test';
import { E2E_REGULAR_USER, resetTestDatabase } from './e2e-helpers';

async function loginAsRegularUser(page) {
  await page.goto('/');
  await page.locator('#login-username').fill(E2E_REGULAR_USER.username);
  await page.locator('#login-password').fill(E2E_REGULAR_USER.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'My Forms' })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('regular user cannot access super-admin navigation or direct routes', async ({ page }) => {
  await loginAsRegularUser(page);

  await expect(page.getByRole('button', { name: 'All Forms' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Users' })).toHaveCount(0);
  await expect(page.locator('.nav-user-chip')).toContainText(E2E_REGULAR_USER.username);

  await page.goto('/settings');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'My Forms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);

  await page.goto('/users');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'My Forms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Users' })).toHaveCount(0);
});
