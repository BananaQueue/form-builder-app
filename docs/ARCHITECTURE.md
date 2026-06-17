# Architecture

## Overview

The system is a two-part application:

```text
React/Vite frontend  ->  PHP API  ->  MariaDB/MySQL
```

The frontend is in `form-builder-app`. The backend API is in the sibling `form-builder-api` folder.

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

The PHP API exposes one file per endpoint. Most endpoints:

- apply CORS headers
- include `auth_helper.php`
- include `db.php`
- enforce auth/CSRF where needed
- return JSON

Important helpers:

- `auth_helper.php` - sessions, CSRF, auth, super-admin checks, rate limiting.
- `audit_helpers.php` - audit log writes.
- `notification_helpers.php` - notification writes and mapping.
- `question_map_helpers.php` - question ID mapping during updates.
- `response_helpers.php` - response cleanup helpers.

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

The canonical schema dump is in `form-builder-app/src/form_builder.sql`.

Incremental migrations live in `form-builder-api/migrations/`.

## Authentication And Authorization

- Auth uses PHP sessions.
- Session cookies are HttpOnly and SameSite=Lax.
- CSRF tokens are issued by `check_session.php` and returned on login.
- Regular users can manage their own forms.
- Super Admins can access all forms, users, settings, and audit logs.

## Public Forms

Public forms are loaded by form code through `get_form_by_code.php`. Public responses are submitted through `submit_response.php`.

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

