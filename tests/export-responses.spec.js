import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';
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
    'Created by Playwright for export verification.',
  );

  const addQuestion = page.locator('.fb-paper').filter({ hasText: 'Add Question' });
  await addQuestion.locator('input[placeholder="Enter your question"]').fill(questionText);
  await addQuestion.locator('.fb-select').selectOption('text');
  await page.getByRole('button', { name: '+ Add Question to Form' }).click();

  await page.getByRole('button', { name: /Save Form to Database/ }).click();
  await expect(page.getByText('Form saved successfully')).toBeVisible();
}

async function submitPublicResponse(page, formCode, formTitle, answerText) {
  await page.goto(`/form/${formCode}`);
  await expect(page.getByRole('heading', { name: formTitle })).toBeVisible();
  await page.locator('input[placeholder="Your answer"]').fill(answerText);
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.locator('.fd-privacy-checkbox').check();
  await page.getByRole('button', { name: 'Confirm & Submit' }).click();
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
}

async function openResponsesForForm(page, formTitle) {
  await page.goto('/');
  const row = page.locator('tr').filter({ has: page.locator('.afl-form-title', { hasText: formTitle }) });
  await expect(row).toBeVisible();
  const dropdown = await openRowActionMenu(page, row);
  await dropdown.locator('.afl-dropdown-item', { hasText: 'Responses' }).click();
  await expect(page.getByRole('heading', { name: formTitle })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('admin can export submitted responses to CSV and audit the export', async ({ page, request }) => {
  const formTitle = `E2E Export Form ${Date.now()}`;
  const questionText = 'What is your office?';
  const answerText = 'Regional NGA Export Office';

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle, questionText);

  const savedForm = await getFormFromApi(page, formTitle);
  expect(savedForm?.form_code, 'created form should have a public form code').toBeTruthy();

  await submitPublicResponse(page, savedForm.form_code, formTitle, answerText);
  await openResponsesForForm(page, formTitle);
  await expect(page.locator('.rl-subtitle')).toHaveText('1 response');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export CSV/ }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  const csv = Buffer.concat(chunks).toString('utf8');
  expect(download.suggestedFilename()).toMatch(/E2E_Export_Form_.*_responses_\d{4}-\d{2}-\d{2}\.csv/);
  expect(csv).toContain('Submitted At');
  expect(csv).toContain(questionText);
  expect(csv).toContain(answerText);

  const logs = await getAuditLogs(request, {
    action: 'RESPONSES_EXPORTED',
    entity_label: formTitle,
  });

  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({
    actor_username: E2E_SUPER_ADMIN.username,
    action: 'RESPONSES_EXPORTED',
    entity_type: 'form',
    entity_label: formTitle,
  });
});
