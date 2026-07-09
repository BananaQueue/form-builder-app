# Deployment Guide

This guide assumes Laravel is the production host for both the compiled React app and the Form Builder API, backed by MySQL/MariaDB.

## Deployment Checklist

- [ ] Use HTTPS.
- [ ] Configure Laravel `.env` with production database credentials and app settings.
- [ ] Disable test guard endpoints.
- [ ] Import the schema and apply any pending migrations.
- [ ] Install Laravel Composer dependencies.
- [ ] Build frontend assets into Laravel `public/app`.
- [ ] Verify same-origin API routing and allowed origins.
- [ ] Create or verify the first Super Admin account using the CLI-only bootstrap script.
- [ ] Run smoke tests.
- [ ] Configure backups.
- [ ] Configure log collection/monitoring.

## Backend Configuration

Configure Laravel in:

```text
form-builder-api/laravel/.env
```

Important production values:

```text
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-production-host.example
APP_TIMEZONE=Asia/Singapore
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=form_builder
DB_USERNAME=<production-user>
DB_PASSWORD=<production-password>
DB_TIMEZONE=+08:00
SESSION_DRIVER=file
```

Do not commit production secrets. Generate and keep a stable Laravel `APP_KEY` for the deployed environment.

## Legacy PHP Configuration

The older root PHP API still has `form-builder-api/db.php` and optional `db.local.php` support. Treat that path as legacy compatibility. Production deployments should run through Laravel unless you are intentionally rolling back to the older PHP file server.

## Database Setup

For a fresh database:

1. Create a database, for example `form_builder`.
2. Import:

```text
form-builder-app/src/form_builder.sql
```

3. Apply migrations in numeric order from:

```text
form-builder-api/migrations/
```

If the schema dump already includes the latest changes, migrations may be no-ops or fail if repeated. Treat the dump and migrations as deployment artifacts that need a formal migration strategy before large-scale production use.

## Initial Super Admin Bootstrap

The committed schema intentionally does not seed users or password hashes. On a clean database, run the backend bootstrap script from the server command line after database credentials are configured:

```powershell
cd form-builder-api
$env:FB_BOOTSTRAP_ADMIN_USERNAME="admin"
$env:FB_BOOTSTRAP_ADMIN_PASSWORD="Use-A-Strong-Unique-Password-123"
php bootstrap_super_admin.php
```

The script is CLI-only, enforces the backend password policy, and aborts once any Super Admin exists. Do not place bootstrap credentials in committed files or shell history on shared systems.

## Frontend Build

Install dependencies and build:

```powershell
cd form-builder-app
npm install
npm run build
```

Build output:

```text
form-builder-api/laravel/public/app/
```

Deploy or keep this directory with the Laravel application. Laravel serves `public/app/index.html` for normal React routes.

## API Base Path

For production builds served by Laravel, the frontend defaults to same-origin root API calls:

```text
VITE_API_BASE=
```

Only set `VITE_API_BASE` before `npm run build` if the production API is intentionally mounted somewhere other than the Laravel origin root. During local Vite development, `/api/*` proxies to the Laravel server configured by `VITE_API_TARGET`.

## Web Server Routing

Point the web server document root at:

```text
form-builder-api/laravel/public
```

Laravel handles the React shell, compatibility `.php` endpoint names, native `/api/...` routes, and static files under `public/app`.

## CORS

Same-origin Laravel deployments should not need broad CORS allowances. If a separate frontend origin is introduced, configure the allowed production origins explicitly in Laravel or the compatibility layer:

```text
FB_ALLOWED_ORIGINS=https://your-production-frontend.example
```

Avoid relying on local-development defaults in production.

## Test Endpoints

These endpoints exist for E2E tests:

- `test_database_guard.php`
- `test_reset_database.php`
- `test_audit_logs.php`

They are for local and E2E workflows only. Production should block or remove access to `test_*.php` at the web server level, and test guard configuration must remain disabled.

## Backup And Restore

Minimum production backup plan:

- Daily database backup.
- Backup before migrations.
- Store backups outside the application server.
- Test restore monthly.
- Include uploaded assets such as `form-builder-api/uploads/banner.png`.

## Rollback Plan

- Keep the previous frontend build artifact.
- Keep a pre-deployment database backup.
- Record which migrations were applied.
- Keep a copy of the previous Laravel release directory or deployment artifact.
- Verify rollback in staging before relying on it in production.
