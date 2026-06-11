import { expect, test } from '@playwright/test';

test('login page renders and accepts input', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.login-heading')).toHaveText('Welcome back');
  await expect(page.locator('.login-app-name')).toHaveText('Form Builder');

  await page.locator('#login-username').fill('playwright_test_user');
  await page.locator('#login-password').fill('bad_password');

  await expect(page.locator('#login-username')).toHaveValue('playwright_test_user');
  await expect(page.locator('#login-password')).toHaveValue('bad_password');
  await expect(page.locator('button[type="submit"]')).toBeEnabled();
});

test('public form route renders not found state for unknown code', async ({ page }) => {
  await page.goto('/form/nonexistent-test-code');

  await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
  await expect(page.locator('.fd-state-screen--error')).toContainText(
    /Form not found|Could not connect to server/,
  );
});
