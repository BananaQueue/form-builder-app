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
- [ ] Create or verify the first Super Admin account.
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

Each PHP endpoint currently has an allowlist of origins. Before deployment, update the allowed origins to include the production frontend URL and remove unused local origins.

Recommended improvement: centralize CORS into one helper so production origin changes happen in one place.

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

