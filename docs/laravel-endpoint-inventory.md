# Laravel Endpoint Inventory

Current status: migration complete. Every endpoint is served exclusively through its Laravel-native `/api/...` route in `form-builder-api/laravel/routes/web.php`. The `.php`-suffixed compatibility routes that used to alias the same controller methods have been removed — there is no dual routing left to retire.

## Endpoint Groups

| Area | Native route | Laravel route/controller |
| --- | --- | --- |
| Auth session | `GET /api/session`, `POST /api/login`, `POST /api/logout` | `LegacyAuthController` |
| Forms list/detail | `GET /api/forms`, `GET /api/forms/{id}`, `GET /api/public/forms/{code}`, `GET /api/categories` | `LegacyLookupController` |
| Form writes | `POST /api/forms`, `PUT /api/forms/{id}`, `DELETE /api/forms/{id}` | `LegacyFormWriteController` |
| Public submissions | `POST /api/public/forms/{id}/responses` | `LegacySubmissionController` |
| Responses | `GET /api/forms/{id}/responses`, `GET /api/responses/{id}`, `GET /api/forms/{id}/responses/export` | `LegacyLookupController` |
| Super admin forms | `GET /api/admin/forms` | `LegacyAdminFormController` |
| Users | `GET /api/users`, `POST /api/users`, `DELETE /api/users/{id}`, `PATCH /api/users/{id}/password` | `LegacyUserController` |
| Audit logs | `GET /api/admin/audit-logs` | `LegacyAuditLogController` |
| Notifications | `GET /api/notifications`, `GET /api/notifications/pending`, `POST /api/notifications/{id}/acknowledge`, `POST /api/notifications/{id}/read` | `LegacyNotificationController` |
| Banner | `POST /api/banner`, `DELETE /api/banner`; image served statically from `/uploads/banner.png` | `LegacyBannerController`, static public file |

Controllers are still named `Legacy*Controller` — that reflects the raw-SQL-over-Eloquent implementation style carried over from the pre-Laravel PHP app, not a routing compromise. There is nothing "legacy" left about how they're reached.

## What's still `.php`-suffixed (and why that's fine)

Four standalone E2E test-helper routes remain at `test_database_guard.php`, `test_reset_database.php`, `test_audit_logs.php`, and `test_last_reset_code.php`. These never had a native `/api/...` counterpart — they're guarded test-only utilities (env + database-name + token checks), not a legacy/native pair, so there was nothing to retire there.

## Current Dependency Hotspots

- Frontend API calls are centralized through `src/apiBase.js` and call only `/api/...` routes.
- `api-tests/api-hardening.test.mjs` asserts security properties against the Laravel source directly (controllers, `bootstrap/app.php`, `config/app.php`) and against the native route groups in `routes/web.php`.
- Laravel feature tests (`form-builder-api/laravel/tests/Feature`) hit the native routes; each `*EndpointTest` file that used to carry a parallel "legacy path" test case for shape-parity now has just the one native-path case (removing the parity duplicate lost no coverage), and a few tests whose scenario only made sense for a query-string ID (e.g. "form ID is required" with no ID at all) were dropped since the native path-parameter routes make that request unreachable.
- `tests/ownership-boundaries.spec.js` and the e2e helpers (`loginViaApi`, `getFormFromApi`, `getUserFromApi`) already called native routes before this cleanup — nothing there changed.

## Verification Snapshot

- `php artisan test`: 92 passed
- `npm run test:api`: 55 passed
- `npm run lint`: 0 errors, 8 pre-existing hook-dependency warnings
- `npm run build`: passed
- No `.php`-suffixed route in `routes/web.php` duplicates a native `/api/...` route

## Definition of Done

- [x] Frontend calls `/api/...` routes instead of `.php` route names.
- [x] Laravel routes/controllers own all backend behavior.
- [x] Old PHP file inspection tests are removed or replaced with Laravel tests.
- [x] `php artisan test`, `npm run test:api`, `npm run lint`, and `npm run build` pass.
- [x] The app runs on Laravel plus MySQL, without XAMPP Apache serving PHP endpoints.
- [x] No duplicate `.php`-suffixed route surface remains alongside the native `/api/...` routes.
