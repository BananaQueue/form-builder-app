import { expect } from '@playwright/test';
import process from 'node:process';

export const E2E_SUPER_ADMIN = {
  username: 'e2e_super_admin',
  password: 'PlaywrightTest123!',
};

export const E2E_REGULAR_USER = {
  username: 'e2e_regular_user',
  password: 'PlaywrightTest123!',
};

export const E2E_SECOND_REGULAR_USER = {
  username: 'e2e_regular_user_two',
  password: 'PlaywrightTest123!',
};

export async function resetTestDatabase(request) {
  const response = await request.post('/api/test_reset_database.php', {
    headers: {
      'X-E2E-Reset-Token': process.env.E2E_RESET_TOKEN ?? 'local-e2e-reset',
    },
  });
  const body = await response.text();

  expect(
    response.ok(),
    `Test database reset should succeed before E2E tests. Status ${response.status()}: ${body}`,
  ).toBe(true);
}

// Note: request paths below are doubled (/api/api/...). The vite dev proxy
// strips the leading /api, leaving the Laravel-native /api/... route
// (e.g. /api/api/login -> /api/login), mirroring how the app's apiUrl()
// builds URLs in dev.
export async function loginViaApi(request, username, password) {
  const response = await request.post('/api/api/login', {
    data: { username, password },
  });
  const body = await response.text();

  expect(
    response.ok(),
    `API login should succeed for ${username}. Status ${response.status()}: ${body}`,
  ).toBe(true);

  return JSON.parse(body);
}

export async function getAuditLogs(request, params = {}) {
  const search = new URLSearchParams(params);
  const response = await request.get(`/api/test_audit_logs.php?${search.toString()}`, {
    headers: {
      'X-E2E-Reset-Token': process.env.E2E_RESET_TOKEN ?? 'local-e2e-reset',
    },
  });
  const body = await response.text();

  expect(
    response.ok(),
    `Audit lookup should succeed in test database. Status ${response.status()}: ${body}`,
  ).toBe(true);

  return JSON.parse(body).logs;
}

export async function getLastResetCode(request) {
  const response = await request.get('/api/test_last_reset_code.php', {
    headers: {
      'X-E2E-Reset-Token': process.env.E2E_RESET_TOKEN ?? 'local-e2e-reset',
    },
  });
  const body = await response.text();

  expect(
    response.ok(),
    `Reset code lookup should succeed in test database. Status ${response.status()}: ${body}`,
  ).toBe(true);

  return JSON.parse(body).code;
}

export async function getFormFromApi(page, formTitle) {
  return page.evaluate(async (title) => {
    const response = await fetch('/api/api/admin/forms?per_page=10', {
      credentials: 'include',
    });
    const result = await response.json();
    return result.forms.find((form) => form.title === title);
  }, formTitle);
}

export async function getUserFromApi(page, username) {
  return page.evaluate(async (targetUsername) => {
    const response = await fetch('/api/api/users', {
      credentials: 'include',
    });
    const result = await response.json();
    return result.users.find((user) => user.username === targetUsername);
  }, username);
}

export async function openRowActionMenu(page, row) {
  const menuButton = row.locator('.afl-dot-btn');
  const dropdown = page.locator('.afl-dropdown');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    // Only click to OPEN the menu. The dot button is a toggle, so clicking again
    // while a slow-rendering menu is opening would close it — the race that made
    // this flaky under CI's slower headless rendering. Guard on visibility first.
    if (!(await dropdown.isVisible())) {
      await menuButton.click();
    }
    try {
      await expect(dropdown).toBeVisible({ timeout: 2000 });
      return dropdown;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }

  return dropdown;
}
