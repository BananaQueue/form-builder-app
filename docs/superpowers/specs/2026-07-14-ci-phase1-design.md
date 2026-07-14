# CI Phase 1 — Fast per-repo GitHub Actions

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan
**Scope:** Continuous Integration only. Deploy (CD) is explicitly deferred.

## Context

FormBuilder has no CI/CD of any kind — no `.github/`, Dockerfile, or pipeline
anywhere. The codebase is split across two independent GitHub repos:

- `form-builder-api` (`github.com/BananaQueue/form-builder-api`) — Laravel/PHP
  backend. The Laravel app lives in the `laravel/` subfolder of the repo.
- `form-builder-app` (`github.com/BananaQueue/form-builder-app`) — React + Vite
  frontend, Playwright e2e tests, and node:test API-hardening tests.

`D:\FormBuilder` (the local parent folder) is **not** a git repository; each
subfolder is its own repo with its own remote.

Production hosting is decided (on-prem Windows Server inside the emb.gov.ph
network), but deploy is a separate, later effort. A cloud GitHub-hosted runner
cannot reach the firewalled gov server, so future deploy will be a PowerShell
runbook run on the server — out of scope here.

## Goal

Add automated test runs on every push and pull request in both repos, starting
with the checks that need no database or running server. This delivers working
green/red status checks quickly and with near-zero flakiness risk, before
tackling the harder full-stack end-to-end job.

## Test topology (verified 2026-07-14)

| Check | Command | Dependencies | Included in Phase 1 |
|-------|---------|--------------|---------------------|
| Lint | `npm run lint` (eslint) | Node only | Yes |
| API hardening | `npm run test:api` (`node --test api-tests/*.mjs`) | Node only, BUT white-box: it `readFileSync`s Laravel source in a SIBLING `form-builder-api/` checkout, so CI must check out both repos as siblings. No server/DB. | Yes |
| Laravel feature | `php artisan test` (phpunit) | PHP 8.4 (the committed `composer.lock` pins symfony 8.1 requiring php >=8.4.1 — `composer.json`'s `^8.3` understates it) + `pdo_sqlite`; `phpunit.xml` sets `APP_ENV=testing`, `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:` | Yes |
| E2E | `npm run test:e2e` (Playwright, 14 tests) | MySQL + `form_builder_test` DB + Laravel on :8000 + Vite on :5173 + a Chrome binary + cross-repo checkout of the api repo | **No — Phase 2** |

Verified facts:
- `form-builder-app/package-lock.json` exists → `npm ci` is reproducible.
- `form-builder-api/laravel/composer.json` requires `php: ^8.3`;
  `composer.lock` exists → `composer install` is reproducible.
- No `engines` field in `package.json` → pin Node 20 LTS in CI.

## Design

### Workflow 1 — `form-builder-app/.github/workflows/ci.yml`

- **Triggers:** `push` and `pull_request`, all branches.
- **Runner:** `ubuntu-latest`.
- **Steps:**
  1. `actions/checkout@v4` into `form-builder-app/` (subfolder)
  2. `actions/checkout@v4` of `BananaQueue/form-builder-api` into
     `form-builder-api/` (public, no token) — sibling layout so `test:api`'s
     `../../form-builder-api` reads resolve
  3. `actions/setup-node@v4` — `node-version: 20`, `cache: npm`,
     `cache-dependency-path: form-builder-app/package-lock.json`
  4. `npm ci`, `npm run lint`, `npm run test:api` — all
     `working-directory: form-builder-app`
- **Services/secrets:** none. Expected runtime ~1 min.

### Workflow 2 — `form-builder-api/.github/workflows/ci.yml`

- **Triggers:** `push` and `pull_request`, all branches.
- **Runner:** `ubuntu-latest`.
- **Working directory:** `laravel/` for build/test steps (the Laravel app is a
  subfolder of the repo).
- **Steps:**
  1. `actions/checkout@v4`
  2. `shivammathur/setup-php@v2` — `php-version: 8.4` (composer.lock needs
     >=8.4.1), extensions include
     `pdo_sqlite`
  3. `composer install --no-interaction --prefer-dist` (in `laravel/`)
  4. Copy `.env.example` → `.env`; `php artisan key:generate`
  5. `php artisan test`
- **Services/secrets:** none (tests use in-memory SQLite). Expected runtime
  ~1–2 min.

### Out of scope (Phase 2, named so nothing silently drops)

- Playwright e2e job: stand up MySQL service + apply the raw SQL migrations to
  `form_builder_test`, start Laravel with `--env=testing` on :8000, start Vite
  on :5173, provide Chrome via `PLAYWRIGHT_CHROME_PATH` (the config already
  reads this env var, defaulting to a local Windows path), and clone the api
  repo into the app-repo job so the backend is present.
- Any deploy/CD automation.

## Testing / acceptance

- Both workflow files are valid YAML and parse as GitHub Actions workflows.
- On a test branch push, each workflow runs to completion and reports a green
  check when the tree is clean.
- Introducing a deliberate lint error (app) or a failing assertion turns the
  relevant check red — confirming the gate actually gates.

## Risks / notes

- Node/PHP toolchain versions are pinned; if the project later adopts a
  different runtime, the workflows must be updated in lockstep.
- The api workflow assumes `php artisan test` needs no MySQL. This holds today
  because `phpunit.xml` forces in-memory SQLite and feature tests mock `DB::`.
  If real DB-backed tests are added later, Phase 1 must gain a MySQL service or
  those tests must stay SQLite-compatible.
