# Form Builder App

React/Vite frontend for the Form Builder system. It pairs with the sibling PHP API in `../form-builder-api`.

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
  dist/               Production build output
```

The PHP backend lives beside this repository:

```text
../form-builder-api/
```

## Requirements

- Node.js and npm
- PHP runtime served through Apache/XAMPP or equivalent
- MariaDB/MySQL
- Chrome for Playwright E2E tests

## Local Development

1. Install frontend dependencies:

```powershell
npm install
```

2. Configure the PHP API database:

```powershell
Copy-Item ..\form-builder-api\db.local.example.php ..\form-builder-api\db.local.php
```

Edit `../form-builder-api/db.local.php` for your local database.

3. Import the database schema:

Use `src/form_builder.sql` for a fresh database, then apply any newer files in `../form-builder-api/migrations/` in numeric order.

4. Start the PHP backend.

The Vite dev server proxies `/api/*` to:

```text
http://localhost/form-builder-api/*
```

5. Start the frontend:

```powershell
npm run dev
```

Default local URL:

```text
http://127.0.0.1:5173
```

## Scripts

```powershell
npm run dev       # Start Vite dev server
npm run build     # Build production assets
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
- Build frontend assets with `npm run build`.
- Configure HTTPS.
- Configure backups and restore drills.
- Run `npm run lint`, `npm run test:api`, and E2E tests against a dedicated test database.

