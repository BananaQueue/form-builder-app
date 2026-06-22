import { expect, test } from '@playwright/test';
import {
  E2E_SUPER_ADMIN,
  getAuditLogs,
  getUserFromApi,
  resetTestDatabase,
} from './e2e-helpers';

async function loginAsSuperAdmin(page) {
  await page.goto('/');
  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();
}

async function login(page, username, password) {
  await page.goto('/');
  await page.locator('#login-username').fill(username);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

function rowForUser(page, username) {
  return page.locator('tr').filter({ has: page.locator('.um-td-username', { hasText: username }) });
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('user creation, password change, and deletion are audited', async ({ page, request }) => {
  const username = `e2e_user_${Date.now()}`;
  const initialPassword = 'InitialPass123!';
  const changedPassword = 'ChangedPass123!';

  await loginAsSuperAdmin(page);
  await page.getByRole('button', { name: 'Users' }).click();
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Password (min 12 chars)"]').fill(initialPassword);
  await page.getByRole('button', { name: '+ Add User' }).click();

  await expect(page.getByText('User created.')).toBeVisible();
  await expect(rowForUser(page, username)).toBeVisible();

  const createdUser = await getUserFromApi(page, username);
  expect(createdUser?.id, 'created user should be available through get_users.php').toBeTruthy();

  const createdLogs = await getAuditLogs(request, {
    action: 'USER_CREATED',
    entity_label: username,
  });
  expect(createdLogs).toHaveLength(1);
  expect(createdLogs[0]).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    action: 'USER_CREATED',
    entity_type: 'user',
    entity_label: username,
  });
  expect(Number(createdLogs[0].entity_id)).toBe(Number(createdUser.id));

  const userRow = rowForUser(page, username);
  await userRow.getByRole('button', { name: 'Change Password' }).click();
  await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
  await page.locator('.um-modal input[placeholder="New password (min 12 chars)"]').fill(changedPassword);
  await page.getByRole('button', { name: 'Save Password' }).click();

  await expect(page.getByText(`Password updated for "${username}".`)).toBeVisible();

  const passwordLogs = await getAuditLogs(request, {
    action: 'USER_PASSWORD_CHANGED',
  });
  const passwordLog = passwordLogs.find((log) => Number(log.entity_id) === Number(createdUser.id));
  expect(passwordLog).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    action: 'USER_PASSWORD_CHANGED',
    entity_type: 'user',
  });

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await login(page, username, changedPassword);
  await expect(page.getByRole('button', { name: 'My Forms' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await loginAsSuperAdmin(page);
  await page.getByRole('button', { name: 'Users' }).click();
  await expect(rowForUser(page, username)).toBeVisible();

  await rowForUser(page, username).getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.notif-modal')).toContainText(`Delete user "${username}"?`);
  await page.getByRole('button', { name: 'Confirm' }).click();

  await expect(page.getByText(`"${username}" deleted.`)).toBeVisible();
  await expect(rowForUser(page, username)).toHaveCount(0);

  const deletedLogs = await getAuditLogs(request, {
    action: 'USER_DELETED',
    entity_label: username,
  });
  expect(deletedLogs).toHaveLength(1);
  expect(deletedLogs[0]).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    action: 'USER_DELETED',
    entity_type: 'user',
    entity_label: username,
  });
  expect(Number(deletedLogs[0].entity_id)).toBe(Number(createdUser.id));
});

test('super admin PIN opens the change password modal', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.getByRole('button', { name: 'Users' }).click();
  await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();

  const superAdminRow = rowForUser(page, E2E_SUPER_ADMIN.username);
  await superAdminRow.getByRole('button', { name: 'Change Password' }).click();

  await expect(page.getByRole('heading', { name: 'Protected Super Admin Account' })).toBeVisible();
  await page.locator('input[placeholder="Enter Super Admin PIN"]').fill('0000');
  await page.getByRole('button', { name: 'Confirm PIN' }).click();

  await expect(page.getByRole('heading', { name: 'Change Password' })).toBeVisible();
  await expect(page.locator('.um-modal')).toContainText(`Setting new password for ${E2E_SUPER_ADMIN.username}`);
  await expect(page.locator('.um-modal input[placeholder="New password (min 12 chars)"]')).toBeVisible();
});
