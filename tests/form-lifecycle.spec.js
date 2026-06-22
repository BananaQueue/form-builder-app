import { expect, test } from '@playwright/test';
import {
  E2E_SUPER_ADMIN,
  getAuditLogs,
  getFormFromApi,
  openRowActionMenu,
  resetTestDatabase,
} from './e2e-helpers';

async function loginAsSuperAdmin(page) {
  await page.goto('/');
  await page.locator('#login-username').fill(E2E_SUPER_ADMIN.username);
  await page.locator('#login-password').fill(E2E_SUPER_ADMIN.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();
}

async function createTextQuestionForm(page, formTitle, questionText) {
  await page.getByRole('button', { name: '+ New Form' }).click();

  const formDetails = page.locator('.fb-paper').filter({ hasText: 'Form Details' });
  await formDetails.locator('input[placeholder="Enter form title"]').fill(formTitle);
  await formDetails.locator('textarea[placeholder="Enter form description"]').fill(
    'Created by Playwright against form_builder_test.',
  );

  const addQuestion = page.locator('.fb-paper').filter({ hasText: 'Add Question' });
  await addQuestion.locator('input[placeholder="Enter your question"]').fill(questionText);
  await addQuestion.locator('.fb-select').selectOption('text');
  await page.getByRole('button', { name: '+ Add Question to Form' }).click();

  await expect(page.locator('.fb-preview-card')).toContainText(questionText);
  await page.getByRole('button', { name: /Save Form to Database/ }).click();
  await expect(page.getByText('Form saved successfully')).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('super admin can create a form with a text question', async ({ page }) => {
  const formTitle = `E2E Form ${Date.now()}`;

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle, 'What is your office?');
  await page.getByRole('button', { name: 'All Forms' }).click();

  await expect(page.locator('.afl-form-title', { hasText: formTitle })).toBeVisible();
  await expect(page.locator('tbody')).toContainText('1');
});

test('public respondent can submit a response and admin can view it', async ({ page }) => {
  const formTitle = `E2E Public Form ${Date.now()}`;
  const questionText = 'What is your office?';
  const answerText = 'Regional NGA Test Office';

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle, questionText);

  const savedForm = await getFormFromApi(page, formTitle);
  expect(savedForm?.form_code, 'created form should have a public form code').toBeTruthy();

  await page.goto(`/form/${savedForm.form_code}`);
  await expect(page.getByRole('heading', { name: formTitle })).toBeVisible();
  await page.locator('input[placeholder="Your answer"]').fill(answerText);
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('heading', { name: /Privacy Notice/ })).toBeVisible();
  await page.locator('.fd-privacy-checkbox').check();
  await page.getByRole('button', { name: 'Confirm & Submit' }).click();

  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();

  await page.goto('/');
  const row = page.locator('tr').filter({ has: page.locator('.afl-form-title', { hasText: formTitle }) });
  await expect(row).toBeVisible();
  await expect(row.locator('td').nth(4)).toHaveText('1');

  let dropdown = await openRowActionMenu(page, row);
  await dropdown.locator('.afl-dropdown-item', { hasText: 'Responses' }).click();

  await expect(page.getByRole('heading', { name: formTitle })).toBeVisible();
  await expect(page.locator('.rl-subtitle')).toHaveText('1 response');
  await page.getByRole('button', { name: 'View Details' }).click();

  await expect(page.getByRole('heading', { name: 'Response Details' })).toBeVisible();
  await expect(page.locator('.rv-answer-card')).toContainText(questionText);
  await expect(page.locator('.rv-answer-value__text')).toHaveText(answerText);
});

test('super admin can delete a form and audit the deletion', async ({ page, request }) => {
  const formTitle = `E2E Delete Form ${Date.now()}`;

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle, 'What is your office?');

  const savedForm = await getFormFromApi(page, formTitle);
  expect(savedForm?.form_code, 'created form should have a public form code').toBeTruthy();

  await page.goto('/');
  const row = page.locator('tr').filter({ has: page.locator('.afl-form-title', { hasText: formTitle }) });
  await expect(row).toBeVisible();

  const dropdown = await openRowActionMenu(page, row);
  await dropdown.locator('.afl-dropdown-item', { hasText: 'Delete' }).click();

  await expect(page.getByRole('dialog', { name: 'Delete Form' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Form' }).click();

  await expect(page.getByText('Form deleted.')).toBeVisible();
  await expect(page.locator('.afl-form-title', { hasText: formTitle })).toHaveCount(0);

  await page.goto(`/form/${savedForm.form_code}`);
  await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
  await expect(page.locator('.fd-state-screen--error')).toContainText('Form not found');

  const logs = await getAuditLogs(request, {
    action: 'FORM_DELETED',
    entity_label: formTitle,
  });

  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    actor_role: 'super_admin',
    action: 'FORM_DELETED',
    entity_type: 'form',
    entity_label: formTitle,
  });
  expect(Number(logs[0].entity_id)).toBe(savedForm.id);
});

test('super admin can update a form and audit the update', async ({ page, request }) => {
  const originalTitle = `E2E Update Form ${Date.now()}`;
  const updatedTitle = `${originalTitle} Updated`;
  const updatedDescription = 'Updated by Playwright against form_builder_test.';

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, originalTitle, 'What is your office?');

  const savedForm = await getFormFromApi(page, originalTitle);
  expect(Number(savedForm?.id), 'created form should be available through get_all_forms.php').toBeGreaterThan(0);

  await page.goto('/');
  const row = page.locator('tr').filter({ has: page.locator('.afl-form-title', { hasText: originalTitle }) });
  await expect(row).toBeVisible();

  const dropdown = await openRowActionMenu(page, row);
  await dropdown.locator('.afl-dropdown-item', { hasText: 'Edit' }).click();

  const formDetails = page.locator('.fb-paper').filter({ hasText: 'Form Details' });
  await expect(formDetails.locator('input[placeholder="Enter form title"]')).toHaveValue(originalTitle);
  await formDetails.locator('input[placeholder="Enter form title"]').fill(updatedTitle);
  await formDetails.locator('textarea[placeholder="Enter form description"]').fill(updatedDescription);
  await page.getByRole('button', { name: /Update Form/ }).click();

  await expect(page.getByText('Form updated successfully')).toBeVisible();
  const updatedRow = page.locator('tr').filter({ hasText: updatedTitle });
  await expect(updatedRow).toBeVisible();
  await expect(page.locator('tr').filter({ hasText: originalTitle }).filter({ hasNotText: 'Updated' })).toHaveCount(0);

  const logs = await getAuditLogs(request, {
    action: 'FORM_UPDATED',
    entity_label: updatedTitle,
  });

  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    actor_role: 'super_admin',
    action: 'FORM_UPDATED',
    entity_type: 'form',
    entity_label: updatedTitle,
  });
  expect(Number(logs[0].entity_id)).toBe(Number(savedForm.id));
});
