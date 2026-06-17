import { expect, test } from '@playwright/test';
import { E2E_SUPER_ADMIN, getAuditLogs, resetTestDatabase } from './e2e-helpers';

async function loginAsSuperAdmin(page) {
  await page.goto('/');
  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();
}

async function createTextQuestionForm(page, formTitle) {
  await page.getByRole('button', { name: '+ New Form' }).click();

  const formDetails = page.locator('.fb-paper').filter({ hasText: 'Form Details' });
  await formDetails.locator('input[placeholder="Enter form title"]').fill(formTitle);
  await formDetails.locator('textarea[placeholder="Enter form description"]').fill(
    'Created by Playwright for audit verification.',
  );

  const addQuestion = page.locator('.fb-paper').filter({ hasText: 'Add Question' });
  await addQuestion.locator('input[placeholder="Enter your question"]').fill('What is your office?');
  await addQuestion.locator('.fb-select').selectOption('text');
  await page.getByRole('button', { name: '+ Add Question to Form' }).click();

  await page.getByRole('button', { name: /Save Form to Database/ }).click();
  await expect(page.getByText('Form saved successfully')).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('creating a form writes a FORM_CREATED audit log', async ({ page, request }) => {
  const formTitle = `E2E Audit Form ${Date.now()}`;

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle);

  const logs = await getAuditLogs(request, {
    action: 'FORM_CREATED',
    entity_label: formTitle,
  });

  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    actor_role: 'super_admin',
    action: 'FORM_CREATED',
    entity_type: 'form',
    entity_label: formTitle,
  });
  expect(Number(logs[0].entity_id)).toBeGreaterThan(0);
});
