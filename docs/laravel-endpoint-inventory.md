# Laravel Endpoint Inventory

Current status: Laravel serves the React build and handles the legacy PHP-shaped routes through `form-builder-api/laravel/routes/web.php`. Laravel-native aliases now exist for reads, response reads, and form writes; the frontend uses `/api/...` routes for all of these. Compatibility `.php` routes remain active for rollback, old hardening tests, and endpoint groups not migrated yet.

## Endpoint Groups

| Area | Frontend / asset usage | Laravel route/controller | Legacy PHP file still present | Suggested native route |
| --- | --- | --- | --- | --- |
| Auth session | `check_session.php`, `login.php`, `logout.php` | `LegacyAuthController` | Yes | `GET /api/session`, `POST /api/login`, `POST /api/logout` |
| Forms list/detail | Frontend now calls `GET /api/forms`, `GET /api/forms/{id}`, `GET /api/public/forms/{code}`, `GET /api/categories`; compatibility routes still exist as `get_forms.php`, `get_form_details.php`, `get_form_by_code.php`, `get_categories.php` | `LegacyLookupController` | Yes | Migrated frontend reads to native aliases |
| Form writes | Frontend now calls `POST /api/forms`, `PUT /api/forms/{id}`, `DELETE /api/forms/{id}`; compatibility routes still exist as `save_form.php`, `update_form.php`, `delete_form.php` (used by Playwright ownership-boundary tests and left live for rollback) | `LegacyFormWriteController` | Yes | Migrated frontend writes to native aliases |
| Public submissions | Frontend now calls `POST /api/public/forms/{id}/responses`; compatibility route still exists as `submit_response.php` | `LegacySubmissionController` | Yes | Migrated frontend submission to native alias |
| Responses | Frontend now calls `GET /api/forms/{id}/responses`, `GET /api/responses/{id}`, `GET /api/forms/{id}/responses/export`; compatibility routes still exist as `get_responses.php`, `get_response_details.php`, `export_responses.php` | `LegacyLookupController` | Yes | Migrated frontend response reads/export to native aliases |
| Super admin forms | `get_all_forms.php` | `LegacyAdminFormController` | Yes | `GET /api/admin/forms` |
| Users | `get_users.php`, `create_user_api.php`, `delete_user.php`, `change_password.php` | `LegacyUserController` | Yes | `GET /api/users`, `POST /api/users`, `DELETE /api/users/{id}`, `PATCH /api/users/{id}/password` |
| Audit logs | `get_audit_logs.php` | `LegacyAuditLogController` | Yes | `GET /api/admin/audit-logs` |
| Notifications | `get_notifications.php`, `get_pending_notifications.php`, `acknowledge_notification.php`, `mark_notification_read.php` | `LegacyNotificationController` | Yes | `GET /api/notifications`, `GET /api/notifications/pending`, `POST /api/notifications/{id}/acknowledge`, `POST /api/notifications/{id}/read` |
| Banner | `upload_banner.php`, `remove_banner.php`, `/uploads/banner.png` | `LegacyBannerController`, static public file | Yes | `POST /api/banner`, `DELETE /api/banner`, `/storage/banner.png` or `/uploads/banner.png` compatibility |

## Current Dependency Hotspots

- Frontend API calls are centralized through `src/apiBase.js`. Lookup/form reads, response reads/export, and form writes (create/update/delete/duplicate) now use `/api/...`; remaining admin/auth/banner/notification calls still use `.php` compatibility names.
- `api-tests/api-hardening.test.mjs` reads old PHP files directly with `readApiFile(...)`.
- `api-tests/php-syntax.test.mjs` lints root `form-builder-api/*.php` files.
- `tests/ownership-boundaries.spec.js` intentionally exercises the compatibility `save_form.php`/`update_form.php`/`delete_form.php` routes directly via Playwright's `request` fixture; these must stay live until that test is converted too.
- Laravel feature tests already cover many compatibility routes in `form-builder-api/laravel/tests/Feature`, plus the new native form-write routes (`SaveFormEndpointTest`, `UpdateFormEndpointTest`, `DeleteFormEndpointTest`).

## Recommended Migration Order

1. **Keep compatibility routes live**
   In progress. Laravel-native `/api/...` routes are being added while `.php` routes remain available for rollback and old tests.

2. **Move low-risk reads first**
   Done. Frontend now calls `/api/categories`, `/api/forms`, `/api/forms/{id}`, and `/api/public/forms/{code}`.

3. **Move responses next**
   Done. Frontend now calls `/api/forms/{id}/responses`, `/api/responses/{id}`, and `/api/forms/{id}/responses/export`.

4. **Move form writes carefully**
   Done. `save_form.php`, `update_form.php`, and `delete_form.php` are now aliased as `POST /api/forms`, `PUT /api/forms/{id}`, and `DELETE /api/forms/{id}` (id injected from the route segment into the same controller methods), and the frontend (`FormBuilder.jsx`, `FormViewer.jsx` duplicate, `AdminFormList.jsx`, `FormList.jsx`) calls the native routes. Compatibility routes remain live for `tests/ownership-boundaries.spec.js` and rollback.

5. **Move public submissions**
   Done. `submit_response.php` is now aliased as `POST /api/public/forms/{id}/responses` (route `{id}` injected into the JSON payload as `form_id`, exempted from CSRF like the compatibility route since public respondents have no session). `FormDisplay.jsx` calls the native route. Compatibility route remains for rollback.

6. **Move admin/user/banner/notification routes**
   Convert these one group at a time because they carry CSRF, permission, upload, and notification side effects.

7. **Replace old PHP hardening tests**
   Convert tests that inspect root PHP files into Laravel feature tests or Laravel source assertions. This is required before removing root PHP files.

8. **Retire root PHP endpoints**
   Once every frontend call and test targets Laravel-native routes, remove or archive the old PHP endpoint files.

## Verification Snapshot

Latest checks after migrating lookup and response reads:

- `php artisan test`: 78 passed
- `npm run test:api`: 44 passed
- `npm run lint`: 0 errors, 8 existing hook dependency warnings
- `npm run build`: passed
- Built JS includes `/api/categories`, `/api/forms`, `/api/public/forms`, and `/api/responses`
- Built JS does not include migrated legacy endpoint names: `get_categories.php`, `get_forms.php`, `get_form_details.php`, `get_form_by_code.php`, `get_responses.php`, `get_response_details.php`, `export_responses.php`

## Definition of Done

- Frontend calls `/api/...` routes instead of `.php` route names.
- Laravel routes/controllers own all backend behavior.
- Old PHP file inspection tests are removed or replaced with Laravel tests.
- `php artisan test`, `npm run test:api`, `npm run lint`, and `npm run build` pass.
- The app can be run with Laravel plus MySQL, without XAMPP Apache serving PHP endpoints.
