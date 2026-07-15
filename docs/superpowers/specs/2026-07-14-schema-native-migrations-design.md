# Schema consolidation — native Laravel migrations

**Date:** 2026-07-14
**Status:** Approved (design), pending implementation plan
**Repos affected:** form-builder-api (primary), form-builder-app (CI + docs)

## Problem

The database schema has no single source of truth and no applied-state tracking.
It is currently defined across three-and-a-half places:

1. **15 numbered raw-SQL files** (`form-builder-api/migrations/001…015`) —
   incremental `ALTER`/`CREATE` statements applied by hand, which assume a base
   schema already exists.
2. **A committed full dump** (`form-builder-app/src/form_builder.sql`, 10 tables)
   — the current schema in one shot; what CI and local e2e load.
3. **Laravel's `database/migrations/`** — only the unused framework scaffold
   (`users`/`cache`/`jobs`); its `users` table conflicts with the real one.
4. Hardcoded `audit_logs` DDL inside `LegacyTestController::resetDatabase`.

Crucially, **no migration-tracking table is used**, so nothing records which
migrations a given database has had applied. This is the root of the
"we cannot tell what state a database is in" risk that makes the eventual data
cutover hazardous, and it is why the deploy script must currently stop and ask
before applying migrations.

Verification note: keyword-searching the dump against migration *file names* is
unreliable — several columns are named differently from their migration (form
ownership is `created_by`, not "owner"; the answer snapshot is
`question_text`/`question_type`, not "snapshot"). Any claim that the baseline
matches the current schema must therefore be proven by machine, not by eye.

## Goal

One authoritative, tracked definition of the schema, built on Laravel's native
migration system, on a **fresh** production database (data is copied in as a
separate step, out of scope here — decided with the user).

Non-goals: changing column names, changing how the app queries (it uses raw SQL,
not Eloquent models — untouched), or migrating an existing live database in place.

## Decision

**Approach A — native Laravel migrations with a single validated baseline.**
Chosen over (B) wrapping the raw SQL in `DB::unprepared`, and (C) a custom
SQL runner + tracking table. The app is already Laravel; A is the only option
that delivers single-source-of-truth *and* real tracking *and* standard tooling
(`migrate`, `rollback`, `migrate:fresh`) with no custom plumbing. Its one risk —
the re-expressed baseline not matching the current schema — is fully mitigated by
the machine diff in §2.

## Design

### 1. The baseline migration
A new migration `database/migrations/<ts>_create_form_builder_schema.php` that
creates all 10 tables at their current shape via Laravel's schema builder:
`users`, `categories`, `forms`, `questions`, `question_options`, `answers`,
`responses`, `notifications`, `audit_logs`, `password_reset_codes`. Tables use
`InnoDB`, `utf8mb4`, `utf8mb4_general_ci` to match today exactly. This becomes
the single source of truth; future changes are new, small migrations on top.

The baseline is derived from `form_builder.sql` (the current tested schema) and
must reproduce it exactly, as verified in §2.

### 2. Fidelity check (the crux)
Ground truth is the current `form_builder.sql` — it is what CI and the app are
already tested against. A CI step builds a database **two ways** and diffs them:

- (a) load `form_builder.sql` into a fresh database;
- (b) run `php artisan migrate` into another fresh database;
- compare `information_schema` for both — every table, column, data type,
  default, nullability, key/index, and charset/collation.

**Any difference fails CI.** The baseline is only trusted once this diff is clean
*and* the 14 Playwright e2e tests pass against the migrated schema. This check
lives in CI so the guarantee cannot silently rot while the two artifacts coexist
during the transition.

### 3. Retirement (after the diff proves equivalence)
- Delete the 3 unused Laravel scaffold migrations (`0001_01_01_*`).
- Delete `form-builder-app/src/form_builder.sql` and the 15
  `form-builder-api/migrations/*.sql` files (git history retains them).
- Remove the hardcoded `CREATE TABLE audit_logs` from
  `LegacyTestController::resetDatabase`; the table now always exists from the
  migration, so the reset endpoint only truncates and reseeds data — never
  defines schema. This also resolves the "third copy of the DDL" finding.

### 4. CI and deploy wiring
- **e2e workflow** (`form-builder-app/.github/workflows/e2e.yml`): replace the
  `mysql … < src/form_builder.sql` step with `php artisan migrate --force`
  (against the mariadb service, testing env).
- **deploy.ps1**: replace the `-ApplyMigrations` numbered-SQL loop with
  `php artisan migrate --force`; a fresh install simply migrates.
- **DEPLOYMENT.md**: update the "Database" section to describe `artisan migrate`
  and drop the dump/numbered-file instructions.
- Migration tracking now comes free via Laravel's `migrations` table.

### 5. Testing
- The `information_schema` diff (§2) proves the baseline is a faithful
  reproduction of the current schema.
- The existing 14 e2e tests, now run against the migrated schema, prove the app
  works end-to-end on it.
- Backend feature tests are unaffected — they mock the database — so no churn.

## Sequencing (safety)
The diff check (§2) is added and made green **before** anything is retired (§3),
so the baseline is proven equivalent while both artifacts still exist. Retirement
and the CI/deploy switch (§4) happen only after that gate is green.

## Risks / notes
- **Re-expression drift** — the baseline omits or mis-types a column. Mitigated
  by §2; it is a hard CI failure, not a silent one.
- **MariaDB vs Laravel DDL nuances** (e.g. `utf8mb4_general_ci` vs Laravel's
  default `utf8mb4_unicode_ci`) — the baseline pins collation explicitly and the
  diff catches any mismatch.
- **Out of scope:** the `created_by`/`owner_id`/`owner_user_id` naming question,
  data import to production, and un-mocking the backend feature tests.
