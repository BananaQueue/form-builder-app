# Form Builder App

React/Vite frontend for the Form Builder system. Laravel in `../form-builder-api/laravel` is the primary runtime: it serves the compiled React app from `public/app` and hosts the current PHP-compatible API routes.

## What This Application Does

- Lets authenticated users create, edit, share, and manage forms.
- Provides public form URLs for unauthenticated respondents.
- Stores and displays submitted responses.
- Supports Super Admin workflows:
  - all-form management
  - user management
  - banner settings
  - notifications for admin edits/deletes
  - audit log review
- Supports light/dark admin themes and browser-setting based public form theme.

## Repository Layout

```text
form-builder-app/
  api-tests/          Static/API hardening and PHP syntax tests
  public/             Static public assets
  src/                React application source
  src/styles/         Page and component CSS
  tests/              Playwright end-to-end tests
```

The Laravel backend lives beside this repository:

```text
../form-builder-api/laravel/
```

## Requirements

- Node.js and npm
- PHP 8.4+ for local Laravel development
- Composer dependencies installed in `../form-builder-api/laravel`
- MariaDB/MySQL
- Chrome for Playwright E2E tests

## Local Development

1. Install frontend dependencies:

```powershell
npm install
```

2. Configure the Laravel database:

```powershell
Edit ..\form-builder-api\laravel\.env
```

Set `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `APP_TIMEZONE`, and `DB_TIMEZONE` in `../form-builder-api/laravel/.env` for your local database.

3. Import the database schema:

Use `src/form_builder.sql` for a fresh database, then apply any newer files in `../form-builder-api/migrations/` in numeric order until Laravel migrations fully replace the legacy SQL path.

4. Start Laravel:

```powershell
cd ..\form-builder-api\laravel
php artisan serve --host=0.0.0.0 --port=8000
```

Laravel-hosted app URL:

```text
http://127.0.0.1:8000
```

For mobile testing on the same network, use the PC LAN IP with port `8000`.

5. For frontend development only, start Vite:

```powershell
npm run dev
```

Default Vite development URL:

```text
http://127.0.0.1:5173
```

By default, Vite proxies `/api/*` to Laravel on `http://127.0.0.1:8000`. To point frontend development at the test database server instead, copy `.env.example` to `.env.local` and set:

```text
VITE_API_TARGET=http://127.0.0.1:8001
```

Production builds use same-origin API calls because Laravel serves both the React shell and the backend routes.

## Scripts

```powershell
npm run dev       # Start Vite dev server
npm run build     # Build production assets into ../form-builder-api/laravel/public/app
npm run lint      # Run ESLint
npm run test:api  # Run API/static/PHP syntax checks
npm run test:e2e  # Run Playwright browser tests
npm run test      # Run lint, API tests, and E2E tests
```

## Important Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing](docs/TESTING.md)
- [Security](docs/SECURITY.md)
- [Operations](docs/OPERATIONS.md)

## Production Readiness Notes

Before deploying to real users:

- Replace local database defaults with environment variables.
- Disable test guard endpoints in production.
- Run database migrations.
- Build frontend assets with `npm run build`; Laravel serves the output from `public/app`.
- Configure HTTPS.
- Configure backups and restore drills.
- Run `npm run lint`, `npm run test:api`, and E2E tests against a dedicated test database.
