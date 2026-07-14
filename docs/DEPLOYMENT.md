# Deployment Guide

Production runs **Laravel** as the single host: it serves the compiled React app,
the `/api/*` routes, and the legacy `*.php` compatibility routes, backed by
MySQL/MariaDB.

Target environment: a **Windows PC running XAMPP** (Apache + MariaDB + PHP) on
the internal network.

---

## ⚠️ Read this first

**1. PHP 8.4.1 or newer is required — this is a hard blocker.**
`composer.lock` pins Symfony 8.1, which requires `php >= 8.4.1`. XAMPP commonly
ships PHP 8.2. If the server has PHP 8.2, **the app cannot run** and `composer
install` will refuse. Upgrade XAMPP to a PHP 8.4 build (or install PHP 8.4
alongside and point Apache at it) *before* attempting a deploy.

**2. Four things are NOT in the repo.** They are gitignored on purpose, so
copying the source files alone will never produce a working site:

| Missing from the repo | How it is produced |
|---|---|
| `laravel/vendor/` | `composer install` |
| `laravel/.env` (incl. `APP_KEY`) | copy `.env.production.example`, then `php artisan key:generate` |
| `laravel/public/app/` (built React) | `npm run build` in `form-builder-app` |
| `laravel/.env.testing` | test-only; not needed in production |

**Without an `APP_KEY`, every single request returns HTTP 500.** This is the most
common way this deployment fails.

**3. The web root must be `laravel/public`** — never the project root. Pointing
Apache at the project root makes `.env` (database and mail passwords) and all
source code downloadable over the web.

**4. There is live data.** Back up the database before every deploy. The scripts
below refuse to proceed if the backup fails.

---

## Scripted deployment (recommended)

Two PowerShell scripts live in `form-builder-api/deploy/`.

### Step 1 — Inspect the server (read-only, safe)

Run this on the server first. It changes nothing; it reports what is installed,
the PHP version, where Apache and `htdocs` are, the `form_builder` tables with
real row counts, and whether the schema is up to date.

```powershell
powershell -ExecutionPolicy Bypass -File inspect-server.ps1
```

The PHP version it prints decides whether a deploy is possible at all.

### Step 2 — Deploy

```powershell
powershell -ExecutionPolicy Bypass -File deploy.ps1 `
    -ApiSource C:\src\form-builder-api `
    -AppSource C:\src\form-builder-app
```

What it does, in order:

1. **Preflight** — aborts if PHP < 8.4.1, or if composer/npm/mysqldump are missing.
2. **Backs up the database** to `C:\formbuilder\backups\`. Aborts if the backup fails.
3. **Checks schema state.** If tables the app needs (`audit_logs`,
   `notifications`, `password_reset_codes`) are missing, it stops and tells you to
   re-run with `-ApplyMigrations`, which applies `form-builder-api/migrations/*.sql`
   in numeric order.
4. **Builds a new release** in `C:\formbuilder\releases\<timestamp>` — the existing
   live app is never overwritten.
5. **Configures** `.env` (shared across releases so `APP_KEY` stays stable) and
   caches config + views.
6. **Smoke-tests** the release on a temporary port before any traffic is switched.
7. **Activates** it by repointing the `C:\formbuilder\current` link.

Because Apache points at the fixed `current` link, **later deploys need no Apache
changes at all** — and rollback is just repointing that link.

### Step 3 — Point Apache at the app (first deploy only)

In `C:\xampp\apache\conf\extra\httpd-vhosts.conf`:

```apache
<VirtualHost *:80>
    DocumentRoot "C:\formbuilder\current\laravel\public"
    <Directory "C:\formbuilder\current\laravel\public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Restart Apache from the XAMPP Control Panel.

### Step 4 — Create the first super admin

The schema intentionally seeds no users. On a database with no super admin:

```powershell
cd C:\formbuilder\current\laravel
$env:FB_BOOTSTRAP_ADMIN_USERNAME="admin"
$env:FB_BOOTSTRAP_ADMIN_PASSWORD="<a strong unique password>"
php artisan fb:bootstrap-super-admin
```

The command enforces the password policy and refuses to run once any super admin
exists. Do not put these credentials in committed files.

---

## Configuration

Copy **`laravel/.env.production.example`** (not `.env.example`) to `.env`.

`.env.example` is a *development* template: it sets `APP_ENV=local` and
`APP_DEBUG=true`, which in production would render stack traces, file paths and
credentials into the browser on any error.

The production template already sets the safe values:

```text
APP_ENV=production
APP_DEBUG=false
LOG_LEVEL=warning
SESSION_SECURE_COOKIE=true      # cookie only sent over HTTPS
SESSION_HTTP_ONLY=true
```

Fill in `APP_URL`, the database credentials, and the Microsoft 365 mail
credentials (used for super-admin password-reset codes).

`SESSION_SECURE_COOKIE=true` requires HTTPS. If the site is still plain HTTP,
sessions can be stolen on the network — get TLS in place.

---

## Database

The live database is the source of truth. **Back it up before every deploy**
(the deploy script does this automatically).

For a brand-new database only:

1. Create the database, e.g. `form_builder`.
2. Import `form-builder-app/src/form_builder.sql`.
3. Apply `form-builder-api/migrations/*.sql` in numeric order.

> **Known weakness.** The schema currently lives in three places: the numbered
> `migrations/*.sql`, the `form_builder.sql` dump, and hardcoded DDL inside
> `LegacyTestController`. There is no migration-tracking table, so nothing records
> which migrations a given database has already had applied. Re-running a migration
> can error. Consolidating this into a single source of truth is outstanding
> technical debt and should be done before the schema changes much further.

Backups: daily; always before migrations; stored off the app server; restore
tested periodically. Include uploaded assets such as `form-builder-api/uploads/`.

---

## Rollback

The release layout makes this cheap:

```powershell
rmdir  C:\formbuilder\current
mklink /J C:\formbuilder\current C:\formbuilder\releases\<previous-timestamp>
# then restart Apache
```

To restore the database:

```powershell
C:\xampp\mysql\bin\mysql.exe -uroot < C:\formbuilder\backups\form_builder-<timestamp>.sql
```

Keep the previous release folder and its backup until the new one is proven.

---

## Test endpoints

`test_reset_database.php`, `test_audit_logs.php`, `test_database_guard.php` and
`test_last_reset_code.php` exist for the E2E suite.

They are **triple-guarded**: they require `APP_ENV=testing`, a database whose name
looks like a test database, *and* a matching reset token. With
`APP_ENV=production` they are inert. Never set `FB_ALLOW_TEST_GUARD=1` in
production. Blocking `test_*.php` at Apache as well is belt-and-braces.

---

## Notes

- **`php artisan route:cache` will fail** and must not be used. `routes/web.php`
  uses a closure for the React catch-all route, and Laravel cannot serialize
  closure routes. The deploy script caches config and views only.
- Same-origin deployment needs no CORS configuration. Only set
  `FB_ALLOWED_ORIGINS` if the frontend is ever served from a different origin.
- The frontend build writes to `laravel/public/app` and Laravel serves
  `public/app/index.html` for React routes. Leave `VITE_API_BASE` empty for
  same-origin production builds.
