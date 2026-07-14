# CI Phase 2 — Playwright e2e job

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation
**Depends on:** CI Phase 1 (`2026-07-14-ci-phase1-design.md`)

## Goal

Run the 14-test Playwright e2e suite (`form-builder-app/tests/*.spec.js`) in CI
on every push and PR, standing up the full runtime stack the suite needs:
MySQL + schema, the Laravel backend, and Vite, driven through a real browser.

## Context (verified 2026-07-14)

- Both GitHub repos are **public** → cross-repo checkout needs no token/secret.
- The e2e specs live in `form-builder-app`; they hit `/api/*`, which Vite's dev
  proxy forwards to Laravel on `127.0.0.1:8000` (stripping `/api`).
- Data setup is self-serve: each spec calls `POST /api/test_reset_database.php`
  with header `X-E2E-Reset-Token`. The server
  (`LegacyTestController::resetDatabase`) accepts the token from
  `env('FB_TEST_RESET_TOKEN') ?: 'local-e2e-reset'`; the test helper sends
  `process.env.E2E_RESET_TOKEN ?? 'local-e2e-reset'`. With both left at their
  defaults the tokens match — **no secret required.**
- The guarded test endpoints are enabled only when Laravel runs in the
  `testing` environment (`app()->environment('testing')`), and reset only
  touches a DB whose name looks like a test DB (`form_builder_test`).
- `form-builder-api/laravel/.env.testing` already targets
  `DB_DATABASE=form_builder_test`, root / empty password, `127.0.0.1:3306`.
- The reset endpoint assumes the base schema already exists (it `CREATE TABLE IF
  NOT EXISTS`es only `audit_logs` and otherwise seeds rows into existing
  tables), so the schema must be loaded before the suite runs.
- `form-builder-app/src/form_builder.sql` (413 lines) is the committed
  full-schema dump, kept current with the numbered `migrations/*.sql` per the
  repo's migration convention.
- `playwright.config.js` reads `PLAYWRIGHT_CHROME_PATH` (falling back to a local
  Windows Chrome path) and sets it as `executablePath`; the single project is
  `Desktop Chrome`. Its `webServer` starts Vite (`npm run dev`) on :5173 and
  reuses an existing one; it does **not** start Laravel.

## Design

New workflow **`form-builder-app/.github/workflows/e2e.yml`**, one job on
`ubuntu-latest`, triggered on `push` and `pull_request`.

### Decisions (approved)
- **Schema source:** load the committed `src/form_builder.sql` dump (single
  shot). Not replaying the numbered `ALTER` migrations. If the dump has drifted
  from the migrations the suite goes red — an acceptable, useful drift signal;
  the fix is refreshing the dump.
- **Browser:** install real Google Chrome on the runner and point
  `PLAYWRIGHT_CHROME_PATH` at it (no config change; matches the `Desktop Chrome`
  project and local dev), rather than Playwright's bundled Chromium.

### Steps
1. **MariaDB service:** `mariadb:10.4` container (matches the phpMyAdmin dump's
   origin — MariaDB 10.4.32 — and local dev, avoiding MariaDB→MySQL dump
   incompatibilities), `MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=yes`,
   `MARIADB_DATABASE=form_builder_test`, port 3306, with a health check. Bump the
   pin once the production DB version is decided.
2. **Checkout app repo** (default working dir).
3. **Checkout api repo:** `actions/checkout` with
   `repository: BananaQueue/form-builder-api`, `path: form-builder-api`.
4. **Load schema:** `mysql -h127.0.0.1 -uroot form_builder_test <
   src/form_builder.sql`.
5. **Start Laravel backend:** in `form-builder-api/laravel`: PHP 8.4 (composer.lock
   needs >=8.4.1) + `pdo_mysql`, `composer install`, copy `.env.testing`, `php artisan
   key:generate` if needed (`.env.testing` already has APP_KEY), then
   `php artisan serve --env=testing --host=127.0.0.1 --port=8000 &`; wait for
   :8000 to answer.
6. **Frontend deps + browser:** in the app repo: `npm ci`; install Google
   Chrome (e.g. `browser-actions/setup-chrome`) and export
   `PLAYWRIGHT_CHROME_PATH`; `npx playwright install-deps` for system libs if
   needed.
7. **Run e2e:** `npm run test:e2e` (Playwright starts Vite on :5173 itself).
8. **Artifacts:** upload the Playwright HTML report and traces
   (`playwright-report/`, `test-results/`) with `if: always()`.

## Testing / acceptance

- `e2e.yml` is valid GitHub Actions YAML.
- Locally de-risk the highest-risk step: `src/form_builder.sql` loads into a
  fresh MySQL database without error and produces the expected tables.
- On a branch push, the job completes and reports green when the tree is clean;
  a deliberately broken assertion turns it red.

## Risks / notes

- **`artisan serve` is effectively single-threaded**, so under the e2e load the
  suite can occasionally exceed Playwright's timeouts even on unrelated paths.
  Phase 2 may be slightly flakier than Phase 1 on first runs; mitigate with
  generous readiness waits and, if needed, a follow-up timeout bump. Treat a
  lone timeout on an unrelated path as environment noise (isolated rerun),
  consistent with the local-dev observation.
- **Schema drift:** if `form_builder.sql` lags the numbered migrations, e2e
  fails; the remedy is refreshing the dump (also resolves backlog item #1's
  single-source-of-truth concern over time).
- **Runtime:** ~5–8 min per run vs ~1–2 min for Phase 1.
