import { expect, test } from '@playwright/test';
import {
  E2E_REGULAR_USER,
  E2E_SECOND_REGULAR_USER,
  loginViaApi,
  resetTestDatabase,
} from './e2e-helpers';

async function createFormViaApi(request, csrfToken, title) {
  const response = await request.post('/api/save_form.php', {
    headers: {
      'X-CSRF-Token': csrfToken,
    },
    data: {
      title,
      description: 'Created by ownership boundary E2E.',
      category_id: 1,
      privacy_notice: 1,
      step_mode: 0,
      questions: [
        {
          id: 'q_owner_boundary',
          question_text: 'What is your office?',
          question_type: 'text',
          type: 'text',
          text: 'What is your office?',
          is_required: 1,
          options: [],
        },
      ],
    },
  });
  const body = await response.text();

  expect(
    response.ok(),
    `Form creation should succeed for owner. Status ${response.status()}: ${body}`,
  ).toBe(true);

  return JSON.parse(body);
}

test.beforeEach(async ({ request }) => {
  await resetTestDatabase(request);
});

test('regular users cannot access another regular user form through protected APIs', async ({ request }) => {
  const ownerLogin = await loginViaApi(
    request,
    E2E_REGULAR_USER.username,
    E2E_REGULAR_USER.password,
  );
  const createdForm = await createFormViaApi(
    request,
    ownerLogin.csrf_token,
    `E2E Ownership Form ${Date.now()}`,
  );

  expect(Number(createdForm.form_id)).toBeGreaterThan(0);

  const otherLogin = await loginViaApi(
    request,
    E2E_SECOND_REGULAR_USER.username,
    E2E_SECOND_REGULAR_USER.password,
  );

  const formId = Number(createdForm.form_id);
  const protectedChecks = [
    {
      label: 'form details',
      response: await request.get(`/api/get_form_details.php?id=${formId}`),
    },
    {
      label: 'responses list',
      response: await request.get(`/api/get_responses.php?form_id=${formId}`),
    },
    {
      label: 'response export',
      response: await request.get(`/api/export_responses.php?form_id=${formId}`),
    },
    {
      label: 'form update',
      response: await request.post('/api/update_form.php', {
        headers: {
          'X-CSRF-Token': otherLogin.csrf_token,
        },
        data: {
          form_id: formId,
          title: 'Unauthorized update attempt',
          description: 'This must be rejected.',
          category_id: 1,
          questions: [],
        },
      }),
    },
    {
      label: 'form delete',
      response: await request.post('/api/delete_form.php', {
        headers: {
          'X-CSRF-Token': otherLogin.csrf_token,
        },
        data: {
          form_id: formId,
        },
      }),
    },
  ];

  for (const check of protectedChecks) {
    expect(
      check.response.status(),
      `${check.label} should reject access to another user's form`,
    ).toBe(403);
  }
});
