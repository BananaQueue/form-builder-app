# Architecture

## Overview

The system is a Laravel-hosted React application:

```text
Browser  ->  Laravel routes/controllers  ->  MariaDB/MySQL
             |
             +-- serves compiled React app from public/app
```

The frontend source is in `form-builder-app`. The primary backend runtime is the sibling Laravel app in `form-builder-api/laravel`.

## Frontend

Key files:

- `src/App.jsx` - top-level auth/session check and route selection.
- `src/AdminLayout.jsx` - admin navigation and authenticated route shell.
- `src/FormBuilder.jsx` - form creation/editing workflow.
- `src/FormDisplay.jsx` - public respondent form renderer.
- `src/AdminFormList.jsx` - Super Admin all-form list.
- `src/UserManagement.jsx` - Super Admin user management.
- `src/AuditLog.jsx` - Super Admin audit log viewer.
- `src/apiBase.js` - frontend API base path and CSRF header helper.

The app uses React state for some admin detail navigation. For example, viewing/editing forms and responses depends on IDs stored in `AdminLayout`. This is simple, but refresh/direct-link behavior is limited. Long term, prefer URL params such as `/forms/:id`, `/forms/:id/edit`, and `/responses/:id`.

## Backend

Laravel exposes the current production routes in `form-builder-api/laravel/routes/web.php`. It serves two kinds of requests:

- React shell routes such as `/` and `/form/{code}` from `public/app/index.html`
- API routes handled by Laravel controllers, including both Laravel-native `/api/...` aliases and compatibility routes with the old `.php` names

The compatibility route names keep older frontend calls and rollback tests low-risk while the conversion continues.

Important Laravel components:

- `routes/web.php` - React shell routing, health route, compatibility routes, and native `/api/...` aliases.
- `app/Http/Controllers/LegacyAuthController.php` - session and auth endpoints.
- `app/Http/Controllers/LegacyLookupController.php` - forms, public forms, responses, exports, and lookups.
- `app/Http/Controllers/LegacyFormWriteController.php` - form create/update/delete.
- `app/Http/Controllers/LegacyUserController.php` - Super Admin user management.
- `app/Http/Controllers/LegacyAuditLogController.php` - audit log reads.
- `app/Http/Controllers/LegacyNotificationController.php` - notification reads and updates.
- `app/Http/Controllers/LegacyBannerController.php` - banner upload/removal.

The older root PHP files in `form-builder-api/` still exist for reference, hardening tests, and rollback while the Laravel conversion is completed. New backend behavior should prefer Laravel routes/controllers.

## Database

Main tables:

- `users`
- `forms`
- `questions`
- `question_options`
- `responses`
- `answers`
- `notifications`
- `audit_logs`
- `categories`

The canonical schema dump is currently in `form-builder-app/src/form_builder.sql`.

Incremental migrations live in `form-builder-api/migrations/`.

Laravel PHPUnit tests use an in-memory SQLite database by default through `phpunit.xml`. Local app runs use the MySQL/MariaDB settings in `form-builder-api/laravel/.env`.

## Authentication And Authorization

- Auth uses Laravel sessions through compatibility controllers.
- Session cookies are HttpOnly and SameSite=Lax.
- CSRF tokens are issued by `check_session.php` and returned on login.
- Regular users can manage their own forms.
- Super Admins can access all forms, users, settings, and audit logs.

## Public Forms

Public forms are loaded by form code through `/api/public/forms/{code}` in migrated frontend reads. Compatibility route `/get_form_by_code.php` remains active. Public responses are still submitted through the compatibility `/submit_response.php` route.

Public form theme follows browser/OS color scheme, not the admin theme toggle.

## Audit Logging

Audit logs are stored in `audit_logs`. Sensitive and privileged events are logged, including:

- login/logout
- user create/delete/password change
- form create/update/delete
- response export
- banner upload/remove

Super Admins can view logs through the frontend `Audit Logs` page.

## Known Architectural Limitations

- CORS/header logic is duplicated in many PHP endpoints.
- No formal migration runner exists.
- Large frontend modules, especially `FormBuilder.jsx`, should be split.
- Direct admin deep links are limited by state-based routing.
- No central structured logging or monitoring integration.
- Some write/admin frontend calls still use compatibility `.php` route names pending the next Laravel-native route migration.
