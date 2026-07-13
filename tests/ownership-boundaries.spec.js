import { expect, test } from '@playwright/test';
import {
  E2E_REGULAR_USER,
  E2E_SECOND_REGULAR_USER,
  loginViaApi,
  resetTestDatabase,
} from './e2e-helpers';

// Request paths are doubled (/api/api/...): the vite dev proxy strips the
// leading /api, leaving the Laravel-native /api/... route.
async function createFormViaApi(request, csrfToken, title) {
  const response = await request.post('/api/api/forms', {
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
      response: await request.get(`/api/api/forms/${formId}`),
    },
    {
      label: 'responses list',
      response: await request.get(`/api/api/forms/${formId}/responses`),
    },
    {
      label: 'response export',
      response: await request.get(`/api/api/forms/${formId}/responses/export`),
    },
    {
      label: 'form update',
      response: await request.put(`/api/api/forms/${formId}`, {
        headers: {
          'X-CSRF-Token': otherLogin.csrf_token,
        },
        data: {
          title: 'Unauthorized update attempt',
          description: 'This must be rejected.',
          category_id: 1,
          questions: [],
        },
      }),
    },
    {
      label: 'form delete',
      response: await request.delete(`/api/api/forms/${formId}`, {
        headers: {
          'X-CSRF-Token': otherLogin.csrf_token,
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
