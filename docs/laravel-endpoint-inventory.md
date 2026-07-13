# Laravel Endpoint Inventory

Current status: Laravel serves the React build and handles the legacy PHP-shaped routes through `form-builder-api/laravel/routes/web.php`. Laravel-native aliases now exist for reads, response reads, and form writes; the frontend uses `/api/...` routes for all of these. Compatibility `.php` routes remain active for rollback, old hardening tests, and endpoint groups not migrated yet.

## Endpoint Groups

| Area | Frontend / asset usage | Laravel route/controller | Legacy PHP file still present | Suggested native route |
| --- | --- | --- | --- | --- |
| Auth session | Frontend now calls `GET /api/session`, `POST /api/login`, `POST /api/logout`; compatibility routes still exist as `check_session.php`, `login.php`, `logout.php` | `LegacyAuthController` | Yes | Migrated frontend auth to native aliases |
| Forms list/detail | Frontend now calls `GET /api/forms`, `GET /api/forms/{id}`, `GET /api/public/forms/{code}`, `GET /api/categories`; compatibility routes still exist as `get_forms.php`, `get_form_details.php`, `get_form_by_code.php`, `get_categories.php` | `LegacyLookupController` | Yes | Migrated frontend reads to native aliases |
| Form writes | Frontend now calls `POST /api/forms`, `PUT /api/forms/{id}`, `DELETE /api/forms/{id}`; compatibility routes still exist as `save_form.php`, `update_form.php`, `delete_form.php` (used by Playwright ownership-boundary tests and left live for rollback) | `LegacyFormWriteController` | Yes | Migrated frontend writes to native aliases |
| Public submissions | Frontend now calls `POST /api/public/forms/{id}/responses`; compatibility route still exists as `submit_response.php` | `LegacySubmissionController` | Yes | Migrated frontend submission to native alias |
| Responses | Frontend now calls `GET /api/forms/{id}/responses`, `GET /api/responses/{id}`, `GET /api/forms/{id}/responses/export`; compatibility routes still exist as `get_responses.php`, `get_response_details.php`, `export_responses.php` | `LegacyLookupController` | Yes | Migrated frontend response reads/export to native aliases |
| Super admin forms | Frontend now calls `GET /api/admin/forms`; compatibility route still exists as `get_all_forms.php` | `LegacyAdminFormController` | Yes | Migrated frontend admin list to native alias |
| Users | Frontend now calls `GET /api/users`, `POST /api/users`, `DELETE /api/users/{id}`, `PATCH /api/users/{id}/password`; compatibility routes still exist as `get_users.php`, `create_user_api.php`, `delete_user.php`, `change_password.php` | `LegacyUserController` | Yes | Migrated frontend user management to native aliases |
| Audit logs | Frontend now calls `GET /api/admin/audit-logs`; compatibility route still exists as `get_audit_logs.php` | `LegacyAuditLogController` | Yes | Migrated frontend audit log to native alias |
| Notifications | Frontend now calls `GET /api/notifications`, `GET /api/notifications/pending`, `POST /api/notifications/{id}/acknowledge`, `POST /api/notifications/{id}/read`; compatibility routes still exist as `get_notifications.php`, `get_pending_notifications.php`, `acknowledge_notification.php`, `mark_notification_read.php` | `LegacyNotificationController` | Yes | Migrated frontend notifications to native aliases |
| Banner | Frontend now calls `POST /api/banner`, `DELETE /api/banner`; the image stays at static `/uploads/banner.png`; compatibility routes still exist as `upload_banner.php`, `remove_banner.php` | `LegacyBannerController`, static public file | Yes | Migrated frontend banner upload/remove to native aliases |

## Current Dependency Hotspots

- Frontend API calls are centralized through `src/apiBase.js`. Lookup/form reads, response reads/export, form writes (create/update/delete/duplicate), public submission, auth session (login/logout/session), the super-admin forms list, user management (list/create/delete/change-password), the audit log, notifications (list/pending/acknowledge/mark-read), and banner upload/remove now use `/api/...`. The only remaining `.php` route names in the frontend are gone; the banner image stays at the static `/uploads/banner.png` public asset (not a `.php` endpoint).
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

6. **Move auth session**
   Done. `check_session.php`, `login.php`, and `logout.php` are now aliased as `GET /api/session`, `POST /api/login`, and `POST /api/logout` (same `LegacyAuthController` methods; `api/login` added to the CSRF exemption list like `login.php` since login precedes any token). `App.jsx` (session check + logout) and `LoginPage.jsx` (login) call the native routes. Compatibility routes remain live for the `loginViaApi` e2e helper and rollback.

7. **Move admin/user/banner/notification routes**
   Convert these one group at a time because they carry CSRF, permission, upload, and notification side effects.
   Super admin forms done: `get_all_forms.php` is now aliased as `GET /api/admin/forms` (same `LegacyAdminFormController::allForms`; a query-string read, so no path-id injection). `AdminFormList.jsx` calls the native route. Compatibility route remains live for rollback and the `api-hardening` PHP-file inspection test.
   Users done: `get_users.php`/`create_user_api.php` are aliased as `GET`/`POST /api/users`, `delete_user.php` as `DELETE /api/users/{id}`, and `change_password.php` as `PATCH /api/users/{id}/password` (route `{id}` injected into the JSON payload as `user_id` for the delete/password routes, same pattern as the native form-write aliases). These native routes deliberately stay CSRF-protected (not added to the exemption list) since the frontend already sends the token via `csrfHeaders`. `UserManagement.jsx` (list/create/delete/change-password) and the `AdminFormList.jsx` owner-filter fetch call the native routes. The `getUserFromApi` e2e helper stays on the compatibility route. Compatibility routes remain live for rollback and the `api-hardening` PHP-file inspection test.
   Audit logs done: `get_audit_logs.php` is now aliased as `GET /api/admin/audit-logs` (same `LegacyAuditLogController::index`; a query-string read, so no path-id injection). `AuditLog.jsx` calls the native route. Compatibility route remains live for rollback and the `api-hardening` PHP-file inspection test.
   Notifications done: `get_notifications.php`/`get_pending_notifications.php` are aliased as `GET /api/notifications`/`GET /api/notifications/pending`, and `acknowledge_notification.php`/`mark_notification_read.php` as `POST /api/notifications/{id}/acknowledge`/`POST /api/notifications/{id}/read` (route `{id}` injected into the JSON payload as `notification_id`, same pattern as the native form-write/user aliases). These are per-user authenticated actions (`requireAuth`), and the POST routes stay CSRF-protected since the frontend already sends the token via `csrfHeaders`. `NotificationCenter.jsx` (list/mark-read) and `NotificationGate.jsx` (pending/acknowledge) call the native routes. Compatibility routes remain live for rollback and the `api-hardening` PHP-file inspection test.
   Banner done: `upload_banner.php` is aliased as `POST /api/banner` and `remove_banner.php` as `DELETE /api/banner` (same `LegacyBannerController::upload`/`remove`; the upload is multipart `banner`, forwarded unchanged, and both stay super-admin + CSRF-protected via `csrfHeaders`). The banner image itself is served from `public/uploads/banner.png` by Laravel's public directory -- it is a static asset, not a `.php` endpoint -- so `BannerSettings.jsx`/`FormDisplay.jsx` keep referencing `/uploads/banner.png` (routed through the vite `/api` proxy in dev, same origin in prod). `BannerSettings.jsx` upload/remove call the native routes. Compatibility routes remain live for rollback and the `api-hardening` PHP-file inspection test. This completes the admin/user/banner/notification migration step; only replacing the PHP-file-inspection tests and retiring the legacy `.php` files remain.

8. **Replace old PHP hardening tests**
   Convert tests that inspect root PHP files into Laravel feature tests or Laravel source assertions. This is required before removing root PHP files.

9. **Retire root PHP endpoints**
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
