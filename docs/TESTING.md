# Testing Guide

## Test Types

The project has four major test layers:

```text
npm run lint      # ESLint frontend checks
npm run test:api  # Static API checks and PHP syntax validation
npm run test:e2e  # Playwright browser tests
php artisan test  # Laravel feature/unit tests, run from form-builder-api/laravel
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

The API/static tests still inspect some legacy root PHP files while the Laravel conversion is in progress.

## E2E Tests

Run:

```powershell
cd form-builder-app
npm run test:e2e
```

The E2E suite expects:

- Vite frontend at `http://127.0.0.1:5173`
- Laravel backend reachable through the Vite `/api` proxy
- dedicated test database named `form_builder_test`
- destructive tests pointed at a Laravel testing server, commonly `http://127.0.0.1:8001`

Example app `.env.local` for destructive smoke testing:

```powershell
Copy-Item .env.example .env.local
```

Then set:

```text
VITE_API_TARGET=http://127.0.0.1:8001
```

Run the Laravel testing server from `../form-builder-api/laravel`:

```powershell
php artisan serve --env=testing --host=0.0.0.0 --port=8001
```

The Laravel server must be running before E2E tests can reset and seed the test database.

## Laravel Tests

Run:

```powershell
cd ..\form-builder-api\laravel
php artisan test
```

The Laravel test suite uses the in-memory SQLite configuration in `phpunit.xml` unless explicitly overridden.

## Current Known Test Environment Failure

If E2E fails with `ECONNREFUSED` for API calls, the frontend dev server is running but the configured Laravel backend is not reachable.

Fix:

1. Start Laravel on the port configured by `VITE_API_TARGET`.
2. Confirm `http://127.0.0.1:8001/_fb_laravel_health` is reachable for the testing server.
3. Confirm the testing Laravel environment points to `form_builder_test`.
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
cd ../form-builder-api/laravel
php artisan test
```

Run E2E against a disposable database and an actual Laravel server, not against production or a developer database.
