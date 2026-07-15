# Schema Consolidation (Native Laravel Migrations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-way schema definition with a single, tracked Laravel migration baseline, proven byte-equivalent to the current schema by a CI diff.

**Architecture:** Add one baseline migration that recreates all 10 tables in Laravel's schema builder. A transitional CI job builds a database two ways — from the legacy `form_builder.sql` dump and from `php artisan migrate` — and diffs their schemas; any difference fails CI. Once green, switch CI and deploy to `migrate` and delete the dump, the numbered SQL files, and the scaffold migrations. The app queries with raw SQL (no Eloquent models), so only schema *definition* changes — no query changes.

**Tech Stack:** Laravel 13, PHP 8.4, MariaDB 10.4 (CI service + XAMPP target), GitHub Actions.

## Global Constraints

- Target/CI runtime is **PHP 8.4** and **MariaDB 10.4**; the baseline must match MariaDB's reported types (e.g. `int(11)` display width, `tinyint(1)`).
- All tables: `ENGINE=InnoDB`, `DEFAULT CHARSET=utf8mb4`, `COLLATE=utf8mb4_general_ci` — pinned explicitly (Laravel's default collation is `utf8mb4_unicode_ci`, which would mismatch).
- Primary-key and FK columns are **signed** `int(11)` (use `->integer(...)`, never `->id()`/`->increments()` which are unsigned bigint/int).
- Preserve exact index and foreign-key **names** from the dump (e.g. `fk_forms_created_by`, `forms_ibfk_1`, `idx_audit_actor_created`) so the diff matches.
- Column **order** within each table must follow the dump (the schema diff is order-sensitive).
- Backend feature tests mock the DB and must remain untouched. Verification is via CI (the only place with MariaDB); there is no local DB.
- The `categories` reference rows (1 General, 2 External, 3 Internal) are seeded by the baseline — the app defaults `forms.category_id` to 1 with an FK to `categories`, so a fresh DB without them breaks form creation.

## File Structure

- **Create** `form-builder-api/laravel/database/migrations/2026_07_14_000000_create_form_builder_schema.php` — the entire domain schema + category seed.
- **Create** `form-builder-app/.github/workflows/schema-diff.yml` — transitional CI job proving `migrate` == dump. Deleted in Task 5.
- **Delete (Task 2)** `form-builder-api/laravel/database/migrations/0001_01_01_000000_create_users_table.php`, `0001_01_01_000001_create_cache_table.php`, `0001_01_01_000002_create_jobs_table.php` — unused scaffold; the `users` one conflicts.
- **Modify (Task 3)** `form-builder-app/.github/workflows/e2e.yml` — load schema via `migrate` instead of the dump.
- **Modify (Task 4)** `form-builder-api/laravel/app/Http/Controllers/LegacyTestController.php` — drop the hardcoded `audit_logs` DDL.
- **Delete (Task 5)** `form-builder-app/src/form_builder.sql`, `form-builder-api/migrations/*.sql` (15 files), `form-builder-app/.github/workflows/schema-diff.yml`.
- **Modify (Task 5)** `form-builder-api/deploy/deploy.ps1`, `form-builder-app/docs/DEPLOYMENT.md`.

---

### Task 1: Transitional schema-diff CI job (the oracle)

Write the check first, so it can prove the baseline in Task 2. It builds two databases and fails if their schemas differ.

**Files:**
- Create: `form-builder-app/.github/workflows/schema-diff.yml`

**Interfaces:**
- Produces: a CI workflow named `Schema Diff` that runs on push/PR and exits non-zero when `migrate` output differs from `src/form_builder.sql`.
- Consumes: `form-builder-app/src/form_builder.sql`; the api repo checked out at `form-builder-api/` (built in Task 2 via `php artisan migrate`).

- [ ] **Step 1: Write the workflow**

Create `form-builder-app/.github/workflows/schema-diff.yml`:

```yaml
name: Schema Diff

on:
  push:
  pull_request:

jobs:
  schema-diff:
    name: migrate == dump
    runs-on: ubuntu-latest
    services:
      mariadb:
        image: mariadb:10.4
        env:
          MARIADB_ALLOW_EMPTY_ROOT_PASSWORD: 'yes'
        ports:
          - 3306:3306
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s --health-timeout=5s --health-retries=10
    steps:
      - name: Checkout frontend
        uses: actions/checkout@v4
        with:
          path: form-builder-app
      - name: Checkout backend
        uses: actions/checkout@v4
        with:
          repository: BananaQueue/form-builder-api
          path: form-builder-api
      - name: Set up PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: pdo_mysql, mysqli
          coverage: none
      - name: Install backend dependencies
        working-directory: form-builder-api/laravel
        run: composer install --no-interaction --prefer-dist --no-progress
      - name: Create both databases
        run: |
          mysql -h127.0.0.1 -uroot -e "CREATE DATABASE fb_from_dump  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
          mysql -h127.0.0.1 -uroot -e "CREATE DATABASE fb_from_migrate CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
      - name: Build fb_from_dump from the committed dump
        run: mysql -h127.0.0.1 -uroot fb_from_dump < form-builder-app/src/form_builder.sql
      - name: Build fb_from_migrate via artisan migrate
        working-directory: form-builder-api/laravel
        env:
          DB_CONNECTION: mysql
          DB_HOST: 127.0.0.1
          DB_PORT: 3306
          DB_DATABASE: fb_from_migrate
          DB_USERNAME: root
          DB_PASSWORD: ''
          APP_KEY: base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
        run: php artisan migrate --force
      - name: Diff the two schemas
        run: |
          norm() {
            mysqldump -h127.0.0.1 -uroot --no-data --skip-comments --skip-dump-date "$1" \
              | sed -E 's/ AUTO_INCREMENT=[0-9]+//g' \
              | grep -vE '^/\*|^--|^$'
          }
          norm fb_from_dump    > /tmp/dump.sql
          norm fb_from_migrate > /tmp/migrate.sql
          echo "=== differences (none expected) ==="
          if diff -u /tmp/dump.sql /tmp/migrate.sql; then
            echo "Schemas are identical."
          else
            echo "::error::migrate-built schema differs from form_builder.sql"
            exit 1
          fi
```

- [ ] **Step 2: Commit**

```bash
cd form-builder-app
git add .github/workflows/schema-diff.yml
git commit -m "ci: add transitional schema-diff (migrate must equal dump)"
```

- [ ] **Step 3: Push on a branch and confirm it FAILS**

```bash
git checkout -b schema/native-migrations
git push -u origin schema/native-migrations
gh run watch "$(gh run list --workflow=schema-diff.yml --branch=schema/native-migrations --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

Expected: **FAIL.** `fb_from_migrate` currently gets only the scaffold tables (users/cache/jobs), so the diff is huge. This confirms the oracle detects a wrong schema.

---

### Task 2: Baseline migration + iterate to a clean diff

**Files:**
- Create: `form-builder-api/laravel/database/migrations/2026_07_14_000000_create_form_builder_schema.php`
- Delete: `form-builder-api/laravel/database/migrations/0001_01_01_000000_create_users_table.php`
- Delete: `form-builder-api/laravel/database/migrations/0001_01_01_000001_create_cache_table.php`
- Delete: `form-builder-api/laravel/database/migrations/0001_01_01_000002_create_jobs_table.php`

**Interfaces:**
- Consumes: the `Schema Diff` job from Task 1 as its pass/fail oracle.
- Produces: a fresh `php artisan migrate` that creates the 10 domain tables identical to `form_builder.sql`, plus the 3 seeded categories.

- [ ] **Step 1: Delete the scaffold migrations**

```bash
cd form-builder-api
git rm laravel/database/migrations/0001_01_01_000000_create_users_table.php \
       laravel/database/migrations/0001_01_01_000001_create_cache_table.php \
       laravel/database/migrations/0001_01_01_000002_create_jobs_table.php
```

- [ ] **Step 2: Write the baseline migration (first cut)**

Create `form-builder-api/laravel/database/migrations/2026_07_14_000000_create_form_builder_schema.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Recreates the legacy MariaDB schema exactly: signed int(11) ids,
// utf8mb4 / utf8mb4_general_ci, current_timestamp() defaults, original
// index and foreign-key names. Verified byte-for-byte by the schema-diff
// CI job against src/form_builder.sql.
return new class extends Migration
{
    public function up(): void
    {
        $tune = function (Blueprint $t): void {
            $t->engine = 'InnoDB';
            $t->charset = 'utf8mb4';
            $t->collation = 'utf8mb4_general_ci';
        };

        Schema::create('users', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->string('username', 100);
            $t->string('email', 191)->nullable();
            $t->enum('role', ['user', 'super_admin'])->default('user');
            $t->string('password_hash', 255);
            $t->timestamp('created_at')->useCurrent();
            $t->unique('username', 'username');
            $t->unique('email', 'email');
        });

        Schema::create('categories', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->string('name', 50);
            $t->timestamp('created_at')->useCurrent();
            $t->unique('name', 'name');
        });

        Schema::create('audit_logs', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('actor_user_id')->nullable();
            $t->string('actor_username', 100)->nullable();
            $t->string('actor_role', 50)->nullable();
            $t->string('action', 80);
            $t->string('entity_type', 80)->nullable();
            $t->integer('entity_id')->nullable();
            $t->string('entity_label', 255)->nullable();
            $t->longText('metadata')->nullable();
            $t->string('ip_address', 45)->nullable();
            $t->string('user_agent', 255)->nullable();
            $t->timestamp('created_at')->useCurrent();
            $t->index(['actor_user_id', 'created_at'], 'idx_audit_actor_created');
            $t->index(['action', 'created_at'], 'idx_audit_action_created');
            $t->index(['entity_type', 'entity_id'], 'idx_audit_entity');
        });

        Schema::create('password_reset_codes', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('user_id');
            $t->integer('requested_by_user_id')->nullable();
            $t->string('code_hash', 255);
            $t->string('token', 64);
            $t->timestamp('verified_at')->nullable();
            $t->timestamp('used_at')->nullable();
            $t->timestamp('expires_at')->useCurrent();
            $t->timestamp('created_at')->useCurrent();
            $t->timestamp('updated_at')->useCurrent();
            $t->unique('token', 'password_reset_codes_token_unique');
            $t->index(['user_id', 'token'], 'idx_password_reset_codes_user_token');
        });

        Schema::create('forms', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('created_by')->nullable()->comment('FK to users.id — which user created this form');
            $t->string('form_code', 20)->nullable();
            $t->string('title', 255);
            $t->text('description')->nullable();
            $t->boolean('privacy_notice')->default(0)->comment('0 = no privacy notice modal, 1 = show standard privacy notice on submit');
            $t->boolean('step_mode')->default(0)->comment('0 = continuous form, 1 = multi-step form driven by section blocks');
            $t->timestamp('created_at')->useCurrent();
            $t->integer('category_id')->nullable()->default(1);
            $t->unique('form_code', 'form_code');
            $t->index('category_id', 'category_id');
            $t->index('form_code', 'idx_form_code');
            $t->index('created_by', 'fk_forms_created_by');
        });

        Schema::create('questions', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('form_id');
            $t->text('question_text');
            $t->text('description')->nullable();
            $t->string('question_type', 50);
            $t->string('rating_scale', 50)->nullable();
            $t->decimal('number_min', 10, 2)->nullable();
            $t->decimal('number_max', 10, 2)->nullable();
            $t->string('number_step', 10)->nullable();
            $t->string('datetime_type', 20)->nullable();
            $t->integer('position')->default(0);
            $t->boolean('is_active')->default(1);
            $t->boolean('is_required')->default(1)->nullable();
            $t->integer('condition_question_id')->nullable();
            $t->string('condition_type', 50)->default('equals')->nullable();
            $t->text('condition_value')->nullable();
            $t->index('form_id', 'form_id');
            $t->index('condition_question_id', 'fk_condition_question');
        });

        Schema::create('question_options', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('question_id');
            $t->string('option_text', 255);
            $t->integer('position')->default(0);
            $t->index('question_id', 'question_id');
        });

        Schema::create('responses', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('form_id');
            $t->timestamp('submitted_at')->useCurrent();
            $t->index('form_id', 'form_id');
        });

        Schema::create('answers', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('response_id');
            $t->integer('question_id');
            $t->text('question_text')->nullable();
            $t->string('question_type', 50)->nullable();
            $t->text('answer_text')->nullable();
            $t->index('response_id', 'response_id');
            $t->index('question_id', 'question_id');
        });

        Schema::create('notifications', function (Blueprint $t) use ($tune) {
            $tune($t);
            $t->integer('id')->autoIncrement();
            $t->integer('recipient_user_id');
            $t->enum('type', ['FORM_EDITED', 'FORM_DELETED']);
            $t->integer('form_id')->nullable();
            $t->string('form_title', 255);
            $t->text('message');
            $t->text('deletion_reason')->nullable();
            $t->integer('admin_id')->nullable();
            $t->string('admin_name', 100)->nullable();
            $t->boolean('is_read')->default(0);
            $t->boolean('acknowledged')->default(0);
            $t->timestamp('created_at')->useCurrent();
            $t->index(['recipient_user_id', 'acknowledged', 'created_at'], 'idx_recipient_pending');
            $t->index(['recipient_user_id', 'created_at'], 'idx_recipient_created');
        });

        // Foreign keys added after all tables exist (incl. the self-reference).
        Schema::table('forms', function (Blueprint $t) {
            $t->foreign('created_by', 'fk_forms_created_by')->references('id')->on('users')->nullOnDelete();
            $t->foreign('category_id', 'forms_ibfk_1')->references('id')->on('categories');
        });
        Schema::table('questions', function (Blueprint $t) {
            $t->foreign('form_id', 'questions_ibfk_1')->references('id')->on('forms')->cascadeOnDelete();
            $t->foreign('condition_question_id', 'fk_condition_question')->references('id')->on('questions')->nullOnDelete();
        });
        Schema::table('question_options', function (Blueprint $t) {
            $t->foreign('question_id', 'question_options_ibfk_1')->references('id')->on('questions')->cascadeOnDelete();
        });
        Schema::table('responses', function (Blueprint $t) {
            $t->foreign('form_id', 'responses_ibfk_1')->references('id')->on('forms')->cascadeOnDelete();
        });
        Schema::table('answers', function (Blueprint $t) {
            $t->foreign('response_id', 'answers_ibfk_1')->references('id')->on('responses')->cascadeOnDelete();
            $t->foreign('question_id', 'answers_ibfk_2')->references('id')->on('questions')->cascadeOnDelete();
        });
        Schema::table('notifications', function (Blueprint $t) {
            $t->foreign('recipient_user_id', 'fk_notifications_recipient')->references('id')->on('users')->cascadeOnDelete();
        });

        // Essential reference data: the app defaults forms.category_id to 1.
        DB::table('categories')->insert([
            ['id' => 1, 'name' => 'General',  'created_at' => now()],
            ['id' => 2, 'name' => 'External', 'created_at' => now()],
            ['id' => 3, 'name' => 'Internal', 'created_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        foreach (['notifications', 'answers', 'responses', 'question_options',
                  'questions', 'forms', 'password_reset_codes', 'audit_logs',
                  'categories', 'users'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::enableForeignKeyConstraints();
    }
};
```

- [ ] **Step 3: Commit and push**

```bash
cd form-builder-api
git add laravel/database/migrations/
git commit -m "feat: single baseline migration for the form_builder schema"
git push -u origin schema/native-migrations   # create the api branch too
```

- [ ] **Step 4: Run the schema-diff and read the differences**

The `Schema Diff` job runs in the **app** repo but checks out api `main`, so first make the app job checkout the api branch. Temporarily set the api checkout `ref: schema/native-migrations` in `schema-diff.yml`, push the app branch, then:

```bash
gh run watch "$(gh run list --workflow=schema-diff.yml --branch=schema/native-migrations --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status || true
gh run view <id> --log | sed -n '/differences (none expected)/,/error/p'
```

Expected on first run: a short diff (likely collation, `tinyint` width, or a default). **This output is the oracle.**

- [ ] **Step 5: Fix the migration until the diff is empty**

Read each `-`/`+` line and adjust the migration (types, defaults, collation, index/FK names, column order). Re-push and re-run Step 4. Repeat until:

```
=== differences (none expected) ===
Schemas are identical.
```

Common fixes: `->collation('utf8mb4_general_ci')` per column if a text/varchar column differs; ensure `boolean()` (→ `tinyint(1)`) not `tinyInteger()`; ensure `integer()` (→ signed `int(11)`).

- [ ] **Step 6: Commit the final green migration**

```bash
git add laravel/database/migrations/2026_07_14_000000_create_form_builder_schema.php
git commit -m "fix: baseline migration now byte-matches form_builder.sql (schema-diff green)"
git push
```

---

### Task 3: Point e2e at `artisan migrate`

**Files:**
- Modify: `form-builder-app/.github/workflows/e2e.yml` (the "Load schema into form_builder_test" step)

**Interfaces:**
- Consumes: the baseline migration (Task 2).
- Produces: an e2e run whose backend DB is built by `migrate`, with all 14 specs passing.

- [ ] **Step 1: Replace the dump-load step**

In `form-builder-app/.github/workflows/e2e.yml`, delete the step:

```yaml
      - name: Load schema into form_builder_test
        run: mysql -h127.0.0.1 -P3306 -uroot form_builder_test < src/form_builder.sql
```

and, after "Prepare testing env file", add:

```yaml
      - name: Migrate schema into form_builder_test
        working-directory: form-builder-api/laravel
        run: php artisan migrate --force --env=testing
```

(`.env.testing` already targets `DB_DATABASE=form_builder_test`.)

- [ ] **Step 2: Commit, push, verify all 14 e2e pass**

```bash
cd form-builder-app
git add .github/workflows/e2e.yml
git commit -m "ci(e2e): build the test schema with artisan migrate"
git push
gh run watch "$(gh run list --workflow=e2e.yml --branch=schema/native-migrations --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

Expected: `14 passed`.

---

### Task 4: Remove the hardcoded DDL from the reset endpoint

**Files:**
- Modify: `form-builder-api/laravel/app/Http/Controllers/LegacyTestController.php`

**Interfaces:**
- Consumes: the migrated schema (the `audit_logs` table now always exists).
- Produces: a `resetDatabase` that only truncates + reseeds data.

- [ ] **Step 1: Delete the `CREATE TABLE IF NOT EXISTS audit_logs (...)` block**

In `resetDatabase`, remove the entire `DB::statement(<<<'SQL' CREATE TABLE IF NOT EXISTS audit_logs ... SQL);` statement (the first statement inside the `try`). Leave the `SET FOREIGN_KEY_CHECKS`, `DELETE FROM`, `ALTER TABLE ... AUTO_INCREMENT`, and reseed blocks intact.

- [ ] **Step 2: Commit, push, verify e2e still green**

```bash
cd form-builder-api
git add laravel/app/Http/Controllers/LegacyTestController.php
git commit -m "refactor: reset endpoint no longer defines schema (audit_logs comes from migration)"
git push
```

Then re-run the app-repo e2e job (Task 3 Step 2 command). Expected: `14 passed` — confirms reset still works without the inline DDL.

---

### Task 5: Retire the old artifacts and switch deploy

Do this only after Tasks 2–4 are green.

**Files:**
- Delete: `form-builder-app/src/form_builder.sql`, `form-builder-app/.github/workflows/schema-diff.yml`
- Delete: `form-builder-api/migrations/*.sql` (15 files) — and, if now empty, the `migrations/` dir
- Modify: `form-builder-api/deploy/deploy.ps1`, `form-builder-app/docs/DEPLOYMENT.md`

**Interfaces:**
- Consumes: green e2e on the migrated schema (Tasks 2–4).
- Produces: a repo whose only schema source is Laravel migrations.

- [ ] **Step 1: Delete the dump, the numbered SQL, and the transitional diff job**

```bash
cd form-builder-app && git rm src/form_builder.sql .github/workflows/schema-diff.yml
cd ../form-builder-api && git rm migrations/*.sql
```

- [ ] **Step 2: Switch `deploy.ps1` to `artisan migrate`**

In `form-builder-api/deploy/deploy.ps1`, replace the Step 3 migration block (the `Get-ChildItem (Join-Path $ApiSource 'migrations') -Filter '*.sql' ...` loop, and the `-ApplyMigrations` gate) with, inside the release after composer install:

```powershell
      Info "Applying database migrations..."
      Push-Location $relLaravel
      & $php artisan migrate --force
      if ($LASTEXITCODE -ne 0) { Pop-Location; Die "artisan migrate failed. Restore from $backupFile." }
      Pop-Location
      Ok "Migrations applied (tracked in the migrations table)"
```

Remove the now-unused `-ApplyMigrations` param and the numbered-SQL schema-state check.

- [ ] **Step 3: Update `DEPLOYMENT.md`**

In `form-builder-app/docs/DEPLOYMENT.md`, replace the "Database" section's "import `form_builder.sql` then apply `migrations/*.sql`" instructions with: "Run `php artisan migrate` — it creates the schema and records applied state in the `migrations` table." Remove the "schema lives in three places" known-weakness note (now resolved).

- [ ] **Step 4: Commit and push**

```bash
cd form-builder-app && git add -A && git commit -m "chore: retire form_builder.sql + schema-diff; migrations are the source of truth"
cd ../form-builder-api && git add -A && git commit -m "chore: retire numbered SQL migrations; deploy uses artisan migrate"
git push   # in each repo
```

- [ ] **Step 5: Final verification — full green on the branch**

```bash
gh run watch "$(gh run list --workflow=e2e.yml --branch=schema/native-migrations --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
gh run watch "$(gh run list --workflow=ci.yml  --branch=schema/native-migrations --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

Expected: e2e `14 passed`, CI green. Then merge both branches to `main` (fast-forward) and delete the branches.

---

## Notes for the executor

- **You cannot run MariaDB or `artisan migrate` locally** — every verification is a CI push + `gh run watch`. Budget for several diff-fix cycles in Task 2.
- The diff in Task 1 uses `mysqldump --no-data` and strips `AUTO_INCREMENT=` counters; it compares structure only. Seed data (categories) is not part of the diff.
- If the diff shows a persistent `COMMENT` mismatch you cannot resolve, add `--skip-comments` is already set — but column comments live in the column definition, not table comments; reproduce them via `->comment(...)` (already done for the two `forms` columns) rather than weakening the diff.
