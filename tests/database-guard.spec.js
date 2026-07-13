import { expect, test } from '@playwright/test';

test('E2E tests are connected to the dedicated test database', async ({ request }) => {
  const response = await request.get('/api/test_database_guard.php');

  expect(response.ok(), [
    'Playwright E2E must be pointed at a dedicated test database.',
    'Copy form-builder-api/laravel/.env.testing.example to .env.testing',
    'and set DB_DATABASE=form_builder_test before running database-backed tests.',
  ].join(' ')).toBe(true);

  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    database: 'form_builder_test',
  });
});
