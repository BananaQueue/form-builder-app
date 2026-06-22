# Deployment Guide

This guide assumes a traditional PHP + MySQL/MariaDB hosting environment and a static frontend build.

## Deployment Checklist

- [ ] Use HTTPS.
- [ ] Configure database credentials with environment variables or server-local config.
- [ ] Disable test guard endpoints.
- [ ] Import schema and apply migrations.
- [ ] Build frontend assets.
- [ ] Configure API path.
- [ ] Verify CORS allowed origins.
- [ ] Create or verify the first Super Admin account using the CLI-only bootstrap script.
- [ ] Run smoke tests.
- [ ] Configure backups.
- [ ] Configure log collection/monitoring.

## Backend Configuration

The API reads database config from environment variables in `form-builder-api/db.php`:

```text
FB_DB_HOST
FB_DB_NAME
FB_DB_USER
FB_DB_PASS
FB_ALLOW_TEST_GUARD
```

For production:

```text
FB_ALLOW_TEST_GUARD=0
```

Do not use the local fallback values for production. The defaults are intended for local development only.

## Local Override File

`form-builder-api/db.local.php` can override database settings. This file should never be committed when it contains real credentials.

Use `form-builder-api/db.local.example.php` as a template for local or E2E test setup.

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
form-builder-app/dist/
```

Deploy the contents of `dist/` to your web server's static site location.

## API Base Path

The frontend API base defaults to:

```text
/api
```

Override with:

```text
VITE_API_BASE=/form-builder-api
```

Set this before running `npm run build` when production API routing differs from local dev.

## Web Server Routing

For the React app, route all non-file requests to `index.html`.

For the PHP API, make sure endpoint files in `form-builder-api` are reachable by the configured API base path.

## CORS

CORS is centralized in `form-builder-api/cors_helper.php`. For production, set the allowed frontend origins with a comma-separated environment variable:

```text
FB_ALLOWED_ORIGINS=https://your-production-frontend.example
```

If `FB_ALLOWED_ORIGINS` is not set, the API falls back to local development origins only.

## Test Endpoints

These endpoints exist for E2E tests:

- `test_database_guard.php`
- `test_reset_database.php`
- `test_audit_logs.php`

They are guarded by `allow_test_guard`, but production should still block or remove access to them at the web server level.

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
- Verify rollback in staging before relying on it in production.

