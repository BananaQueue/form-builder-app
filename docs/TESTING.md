# Testing Guide

## Test Types

The project has three major test layers:

```text
npm run lint      # ESLint frontend checks
npm run test:api  # Static API checks and PHP syntax validation
npm run test:e2e  # Playwright browser tests
```

## API Tests

Run:

```powershell
cd form-builder-app
npm run test:api
```

These tests check:

- CSRF enforcement
- Super Admin-only endpoint enforcement
- password hashing and login hardening
- file upload validation
- public response server-side validation
- ownership checks
- audit logging calls
- PHP syntax for API entrypoints

## E2E Tests

Run:

```powershell
cd form-builder-app
npm run test:e2e
```

The E2E suite expects:

- Vite frontend at `http://127.0.0.1:5173`
- PHP backend reachable through Vite proxy at `/api`
- dedicated test database named `form_builder_test`
- test guard enabled in `form-builder-api/db.local.php`

Example local test config:

```powershell
Copy-Item ..\form-builder-api\db.local.example.php ..\form-builder-api\db.local.php
```

`db.local.php` should include:

```php
return [
    'host' => 'localhost',
    'dbname' => 'form_builder_test',
    'username' => 'root',
    'password' => '',
    'allow_test_guard' => true,
    'test_reset_token' => 'local-e2e-reset',
];
```

The PHP backend must be running before E2E tests can reset and seed the test database.

## Current Known Test Environment Failure

If E2E fails with `ECONNREFUSED` for `/form-builder-api/test_reset_database.php`, the frontend dev server is running but the PHP backend is not reachable at `http://localhost/form-builder-api`.

Fix:

1. Start Apache/XAMPP or equivalent.
2. Confirm `http://localhost/form-builder-api/test_database_guard.php` is reachable.
3. Confirm `db.local.php` points to `form_builder_test`.
4. Rerun `npm run test:e2e`.

## Recommended Additional Tests

- Public submission rate-limit/spam tests.
- Refresh/deep-link behavior for admin pages.
- Migration tests from empty database.
- Backup/restore drill.
- Large form performance tests.
- Concurrent edit/delete tests.
- Accessibility tests.
- Mobile visual regression tests.
- Production config test to verify test endpoints are disabled.

## CI Recommendation

Minimum CI pipeline:

```text
npm ci
npm run lint
npm run test:api
npm run build
npm run test:e2e
```

Run E2E against a disposable database and an actual PHP server, not against production or a developer database.

