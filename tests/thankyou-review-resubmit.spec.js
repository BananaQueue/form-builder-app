import { expect, test } from '@playwright/test';
import { E2E_SUPER_ADMIN, getFormFromApi, resetTestDatabase } from './e2e-helpers';

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

async function submitOnce(page, answerText) {
  await page.locator('input[placeholder="Your answer"]').fill(answerText);
  await page.getByRole('button', { name: 'Submit' }).click();
  // Privacy notice may or may not be enabled; confirm it if present.
  const privacyHeading = page.getByRole('heading', { name: /Privacy Notice/ });
  if (await privacyHeading.isVisible().catch(() => false)) {
    await page.locator('.fd-privacy-checkbox').check();
    await page.getByRole('button', { name: 'Confirm & Submit' }).click();
  }
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('respondent can review their response and submit another', async ({ page }) => {
  const formTitle = `E2E ThankYou Form ${Date.now()}`;
  const questionText = 'What is your office?';
  const answerText = 'Regional NGA Test Office';

  await loginAsSuperAdmin(page);
  await createTextQuestionForm(page, formTitle, questionText);

  const savedForm = await getFormFromApi(page, formTitle);
  expect(savedForm?.form_code).toBeTruthy();

  await page.goto(`/form/${savedForm.form_code}`);
  await expect(page.getByRole('heading', { name: formTitle })).toBeVisible();
  await submitOnce(page, answerText);

  // Review summary is hidden until requested.
  await expect(page.locator('.fd-summary')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review your response' }).click();
  const summary = page.locator('.fd-summary');
  await expect(summary).toContainText(questionText);
  await expect(summary).toContainText(answerText);

  // Toggle hides it again.
  await page.getByRole('button', { name: 'Hide response' }).click();
  await expect(page.locator('.fd-summary')).toHaveCount(0);

  // Submit another response returns to a blank form.
  await page.getByRole('button', { name: 'Submit another response' }).click();
  const input = page.locator('input[placeholder="Your answer"]');
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('');

  // A second submission works end to end.
  await submitOnce(page, 'Second Office Answer');
  await expect(page.getByRole('heading', { name: /Thank You/ })).toBeVisible();
});
