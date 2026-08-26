import { expect, test } from '@playwright/test';
import {
  E2E_REGULAR_USER,
  E2E_SUPER_ADMIN,
  openRowActionMenu,
  resetTestDatabase,
} from './e2e-helpers';

// The default 720px viewport leaves no room below the last row of a short
// table for its actions dropdown, clipping items like "Delete" off-screen
// (confirmed via a CI failure screenshot). This test always deletes the
// second of two rows, so it needs the extra height.
test.use({ viewport: { width: 1280, height: 1200 } });

async function login(page, user) {
  await page.goto('/');
  await page.locator('#login-username').fill(user.username);
  await page.locator('#login-password').fill(user.password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function logout(page) {
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.locator('#login-username')).toBeVisible();
}

async function createTextQuestionForm(page, formTitle, questionText) {
  await page.getByRole('button', { name: '+ New Form' }).click();

  const formDetails = page.locator('.fb-paper').filter({ hasText: 'Form Details' });
  await formDetails.locator('input[placeholder="Enter form title"]').fill(formTitle);

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

test('notification gate shows every pending notification in sequence, not just the first', async ({ page }) => {
  // Regression test: acknowledging one notification used to trigger a toast,
  // which re-rendered App with a new onComplete identity, which re-ran
  // NotificationGate's pending-notifications fetch mid-queue and silently
  // dropped whatever came next. Two pending notifications is the minimum
  // needed to observe the drop.
  const formToEdit = `E2E Gate Edit ${Date.now()}`;
  const formToDelete = `E2E Gate Delete ${Date.now()}`;

  await login(page, E2E_REGULAR_USER);
  await expect(page.getByRole('button', { name: 'My Forms' })).toBeVisible();
  await createTextQuestionForm(page, formToEdit, 'What is your office?');
  await createTextQuestionForm(page, formToDelete, 'What is your role?');
  await logout(page);

  // A super admin acting on someone else's forms is what queues a
  // notification for the owner - editing and deleting each queue one.
  await login(page, E2E_SUPER_ADMIN);
  await expect(page.getByRole('button', { name: 'All Forms' })).toBeVisible();

  const editRow = page.locator('tr').filter({ has: page.locator('.afl-form-title', { hasText: formToEdit }) });
  await expect(editRow).toBeVisible();
  let dropdown = await openRowActionMenu(page, editRow);
  await dropdown.locator('.afl-dropdown-item', { hasText: 'Edit' }).click();
  const formDetails = page.locator('.fb-paper').filter({ hasText: 'Form Details' });
  await formDetails.locator('textarea[placeholder="Enter form description"]').fill('Edited by a super admin.');
  await page.getByRole('button', { name: /Update Form/ }).click();
  await expect(page.getByText('Form updated successfully')).toBeVisible();

  const deleteRow = page.locator('tr').filter({ has: page.locator('.afl-form-title', { hasText: formToDelete }) });
  await expect(deleteRow).toBeVisible();
  dropdown = await openRowActionMenu(page, deleteRow);
  await dropdown.locator('.afl-dropdown-item', { hasText: 'Delete' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete Form' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Form' }).click();
  await expect(page.getByText('Form deleted.')).toBeVisible();

  await logout(page);

  // The owner logs back in and must see both notifications, one at a time.
  await login(page, E2E_REGULAR_USER);

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.notif-modal__progress')).toHaveText('Notification 1 of 2');
  await page.getByRole('button', { name: 'Acknowledge & Continue' }).click();

  await expect(page.locator('.notif-modal__progress')).toHaveText('Notification 2 of 2');
  await page.getByRole('button', { name: 'Acknowledge & Continue' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'My Forms' })).toBeVisible();
});
