import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..', '..', 'form-builder-api');
const laravelRoot = resolve(apiRoot, 'laravel');
const appRoot = resolve(__dirname, '..');

const CONTROLLERS = 'app/Http/Controllers';

// The security guarantees below used to be grepped out of the legacy root
// PHP endpoint files. Those endpoints have been ported to the Laravel app, so
// these assertions now inspect the Laravel source (controllers, middleware
// config, framework config) where each guarantee lives today. Runtime
// behaviour is additionally covered by the phpunit feature tests
// (SecurityHardeningTest, BannerEndpointTest, UserEndpointTest, ...).
function readLaravelFile(relPath) {
  return readFileSync(resolve(laravelRoot, relPath), 'utf8');
}

function readController(name) {
  return readLaravelFile(`${CONTROLLERS}/${name}.php`);
}

function readMiddleware(name) {
  return readLaravelFile(`app/Http/Middleware/${name}.php`);
}

// Extract the body of a `Route::middleware('<alias>')->group(...)` block so we
// can assert which endpoints live behind a given guard. The block runs until
// the next middleware group or the SPA catch-all route, whichever comes first.
function routeGroup(web, alias) {
  const start = web.indexOf(`Route::middleware('${alias}')`);
  assert.notEqual(start, -1, `routes/web.php should define a ${alias} route group`);
  const rest = web.slice(start + `Route::middleware('${alias}')`.length);
  const nextGroup = rest.indexOf('Route::middleware(');
  const fallback = rest.indexOf("Route::get('/{path}'");
  const candidates = [nextGroup, fallback].filter((i) => i !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) : rest.length;
  return rest.slice(0, end);
}

function readAppFile(fileName) {
  return readFileSync(resolve(appRoot, fileName), 'utf8');
}

function assertContains(source, expected, label) {
  assert.match(
    source,
    expected instanceof RegExp ? expected : new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${label} should contain ${expected.toString()}`,
  );
}

test('CSRF protection is centralized with a limited exemption allowlist', () => {
  const bootstrap = readLaravelFile('bootstrap/app.php');

  assertContains(bootstrap, /validateCsrfTokens\s*\(\s*except:/, 'bootstrap/app.php');

  // Only pre-session / public endpoints may be exempt from CSRF.
  for (const exempt of ['login.php', 'submit_response.php', 'test_reset_database.php', 'api/public/forms/*/responses', 'api/login']) {
    assertContains(bootstrap, exempt, 'bootstrap/app.php');
  }

  // Authenticated mutating routes must stay CSRF-protected (never exempt).
  assert.doesNotMatch(bootstrap, /api\/users|api\/banner|api\/notifications/, 'authenticated routes must not be CSRF-exempt');
  assert.doesNotMatch(bootstrap, /['"]api\/forms/, 'form-write routes must not be CSRF-exempt');
});

test('super-admin routes enforce the super_admin role server-side via middleware', () => {
  // Enforcement moved from per-controller requireSuperAdmin() helpers to a
  // single middleware applied to the super-admin route group. The guarantee is
  // unchanged: no session -> 401, non-super-admin -> 403, server-side.
  const mw = readMiddleware('RequireLegacySuperAdmin');
  assertContains(mw, /session\(\)->get\('logged_in'\)\s*!==\s*true/, 'RequireLegacySuperAdmin');
  assertContains(mw, /\],\s*401\)/, 'RequireLegacySuperAdmin');
  assertContains(mw, /session\(\)->get\('role'\)\s*!==\s*'super_admin'/, 'RequireLegacySuperAdmin');
  assertContains(mw, /\],\s*403\)/, 'RequireLegacySuperAdmin');

  // Alias registered so the group reference resolves to that middleware.
  assertContains(readLaravelFile('bootstrap/app.php'), /'legacy\.superadmin'\s*=>.*RequireLegacySuperAdmin::class/, 'bootstrap/app.php');

  // Every super-admin endpoint lives inside that guarded group.
  const group = routeGroup(readLaravelFile('routes/web.php'), 'legacy.superadmin');
  for (const uri of [
    'get_users.php', 'create_user_api.php', 'delete_user.php', 'change_password.php',
    'get_all_forms.php', 'get_audit_logs.php', 'upload_banner.php', 'remove_banner.php',
    'api/users', 'api/banner', 'api/admin/forms', 'api/admin/audit-logs',
    'password-reset-code',
  ]) {
    assertContains(group, uri, 'legacy.superadmin group');
  }
});

test('authenticated routes require a logged-in session via middleware', () => {
  // Per-user endpoints require a session; enforcement is the shared auth
  // middleware applied to the authenticated route group (no session -> 401).
  const mw = readMiddleware('RequireLegacyAuth');
  assertContains(mw, /session\(\)->get\('logged_in'\)\s*!==\s*true/, 'RequireLegacyAuth');
  assertContains(mw, /\],\s*401\)/, 'RequireLegacyAuth');

  assertContains(readLaravelFile('bootstrap/app.php'), /'legacy\.auth'\s*=>.*RequireLegacyAuth::class/, 'bootstrap/app.php');

  const group = routeGroup(readLaravelFile('routes/web.php'), 'legacy.auth');
  for (const uri of [
    'get_notifications.php', 'get_forms.php', 'get_form_details.php',
    'get_responses.php', 'export_responses.php',
    'save_form.php', 'update_form.php', 'delete_form.php',
  ]) {
    assertContains(group, uri, 'legacy.auth group');
  }

  // Form writes still resolve the acting user from the session, not the request body.
  assertContains(readController('LegacyFormWriteController'), /session\(\)->get\('user_id'\)/, 'LegacyFormWriteController');
});

test('login uses password verification, session regeneration, and rate limiting', () => {
  const source = readController('LegacyAuthController');

  assertContains(source, /password_verify\s*\(/, 'LegacyAuthController');
  assertContains(source, /session\(\)->regenerate\s*\(/, 'LegacyAuthController');
  assertContains(source, /isLoginRateLimited\s*\(/, 'LegacyAuthController');
  assertContains(source, /recordLoginFailure\s*\(/, 'LegacyAuthController');
  assertContains(source, /clearLoginFailures\s*\(/, 'LegacyAuthController');
});

test('user password writes hash passwords instead of storing plaintext', () => {
  const source = readController('LegacyUserController');

  assertContains(source, /password_hash\s*\(/, 'LegacyUserController');
  assert.doesNotMatch(
    source,
    /SET\s+password_hash\s*=\s*\$newPassword|VALUES\s*\([^)]*\$password[^)]*\)/,
    'LegacyUserController should not write raw password variables into password_hash',
  );
});

test('user password endpoints enforce the shared stronger password policy', () => {
  const source = readController('LegacyUserController');

  assertContains(source, /function\s+passwordPolicyError\s*\(/, 'LegacyUserController');
  assertContains(source, /max\(12,/, 'LegacyUserController');
  assertContains(source, /passwordPolicyError\s*\(\s*\$password\s*\)/, 'LegacyUserController');
  assertContains(source, /passwordPolicyError\s*\(\s*\$newPassword\s*\)/, 'LegacyUserController');
  assert.doesNotMatch(source, /strlen\s*\(\s*\$(?:password|newPassword)\s*\)\s*<\s*6\b/, 'LegacyUserController should not keep the old 6-character policy');
});

test('public response submissions are rate limited by form and client IP', () => {
  const source = readController('LegacySubmissionController');

  assertContains(source, /isRateLimited\s*\(/, 'LegacySubmissionController');
  assertContains(source, /recordRateLimitAttempt\s*\(/, 'LegacySubmissionController');
  assertContains(source, /'public_submission:'/, 'LegacySubmissionController');
  assertContains(source, /Too many submissions/, 'LegacySubmissionController');
  assertContains(source, /\],\s*429\)/, 'LegacySubmissionController');
});

test('initial super admin bootstrap is CLI-only and password-policy protected', () => {
  // Ported from the legacy CLI script to an artisan command, which is
  // inherently CLI-only (never routed over HTTP).
  const source = readLaravelFile('app/Console/Commands/BootstrapSuperAdmin.php');

  assertContains(source, /extends\s+Command/, 'BootstrapSuperAdmin.php');
  assertContains(source, /fb:bootstrap-super-admin/, 'BootstrapSuperAdmin.php');
  assertContains(source, /FB_BOOTSTRAP_ADMIN_USERNAME/, 'BootstrapSuperAdmin.php');
  assertContains(source, /FB_BOOTSTRAP_ADMIN_PASSWORD/, 'BootstrapSuperAdmin.php');
  assertContains(source, /function\s+passwordPolicyError\s*\(/, 'BootstrapSuperAdmin.php');
  assertContains(source, /max\(12,/, 'BootstrapSuperAdmin.php');
  assertContains(source, /role = 'super_admin'/, 'BootstrapSuperAdmin.php');
  assertContains(source, /A Super Admin already exists/, 'BootstrapSuperAdmin.php');
});

test('banner upload validates type, image content, size, and fixed destination', () => {
  const source = readController('LegacyBannerController');

  // Super-admin gating is enforced by the legacy.superadmin route group
  // (covered above); this test focuses on the file/image validation.
  assertContains(source, /2\s*\*\s*1024\s*\*\s*1024/, 'LegacyBannerController');
  assertContains(source, /getMimeType\s*\(\s*\)/, 'LegacyBannerController');
  assertContains(source, /'image\/png'/, 'LegacyBannerController');
  assertContains(source, /getimagesize\s*\(/, 'LegacyBannerController');
  assertContains(source, /IMAGETYPE_PNG/, 'LegacyBannerController');
  assertContains(source, /->move\s*\(/, 'LegacyBannerController');
  assertContains(source, /banner\.png/, 'LegacyBannerController');
});

test('public response submission validates server-owned form questions', () => {
  const source = readController('LegacySubmissionController');

  assertContains(source, /SELECT\s+id\s+FROM\s+forms\s+WHERE\s+id\s+=\s+\?/i, 'LegacySubmissionController');
  assertContains(source, /WHERE\s+form_id\s+=\s+\?/i, 'LegacySubmissionController');
  assertContains(source, /isset\s*\(\s*\$questionsById\[\$questionId\]\s*\)/, 'LegacySubmissionController');
  assertContains(source, /isQuestionVisible\s*\(/, 'LegacySubmissionController');
  assertContains(source, /validateAnswer\s*\(/, 'LegacySubmissionController');
  assertContains(source, /FROM\s+question_options/i, 'LegacySubmissionController');
  assertContains(source, /DB::transaction\s*\(/, 'LegacySubmissionController');
});

test('form ownership checks exist on sensitive form and response endpoints', () => {
  for (const name of ['LegacyLookupController', 'LegacyFormWriteController']) {
    const source = readController(name);

    assert.match(source, /created_by|formOwnerId|form_owner/i, `${name} should inspect form ownership`);
    assert.match(source, /super_admin/i, `${name} should special-case super admins`);
    assert.match(source, /permission|only view your own|only .* your own/i, `${name} should reject unauthorized access`);
  }
});

test('committed schema dump excludes production-like data and password hashes', () => {
  const source = readAppFile('src/form_builder.sql');

  assert.match(source, /CREATE TABLE `audit_logs`/);
  assert.doesNotMatch(source, /INSERT INTO `users`/);
  assert.doesNotMatch(source, /INSERT INTO `answers`/);
  assert.doesNotMatch(source, /INSERT INTO `responses`/);
  assert.doesNotMatch(source, /\$2y\$/);
  assert.doesNotMatch(source, /admin_ORD|admin_FAD|Darwin|gmail\.com|tester|john/i);
});

test('privileged and sensitive actions write audit log entries', () => {
  const auditedActions = {
    LegacyAuthController: ['USER_LOGIN', 'USER_LOGOUT'],
    LegacyUserController: ['USER_CREATED', 'USER_PASSWORD_CHANGED', 'USER_DELETED'],
    LegacyFormWriteController: ['FORM_CREATED', 'FORM_UPDATED', 'FORM_DELETED'],
    LegacyLookupController: ['RESPONSES_EXPORTED'],
    LegacyBannerController: ['BANNER_UPLOADED', 'BANNER_REMOVED'],
  };

  for (const [name, actions] of Object.entries(auditedActions)) {
    const source = readController(name);

    assertContains(source, /DB::table\('audit_logs'\)->insert\(/, name);
    for (const action of actions) {
      assertContains(source, new RegExp(action), name);
    }
  }
});

test('audit log reads bootstrap the audit table before querying', () => {
  const source = readController('LegacyAuditLogController');

  assertContains(source, /hasTable\s*\(\s*'audit_logs'\s*\)|notificationsTableExists|audit_logs/, 'LegacyAuditLogController');
  assertContains(source, /normalizeMetadata\s*\(/, 'LegacyAuditLogController');
  assertContains(source, /ORDER BY id DESC, created_at DESC/, 'LegacyAuditLogController');
  assertContains(source, /UNIX_TIMESTAMP\(created_at\) AS created_at_unix/, 'LegacyAuditLogController');
});

test('form update audit metadata records readable change details', () => {
  const source = readController('LegacyFormWriteController');

  assertContains(source, /describeFormAuditChanges\s*\(/, 'LegacyFormWriteController');
  assertContains(source, /Edited form title/, 'LegacyFormWriteController');
  assertContains(source, /Edited form description/, 'LegacyFormWriteController');
  assertContains(source, /Added section/, 'LegacyFormWriteController');
  assertContains(source, /Deleted section/, 'LegacyFormWriteController');
  assertContains(source, /Edited section/, 'LegacyFormWriteController');
});

test('audit log reads resolve the form owner into a readable name', () => {
  // The readable-owner enrichment moved to the audit-log read path: stored
  // metadata carries owner_user_id, which is resolved to form_owner on read.
  const source = readController('LegacyAuditLogController');

  assertContains(source, /owner_user_id/, 'LegacyAuditLogController');
  assertContains(source, /\$metadata\['form_owner'\]/, 'LegacyAuditLogController');
});

test('form creation audit metadata uses simple new form detail', () => {
  const source = readController('LegacyFormWriteController');

  assertContains(source, /'changes'\s*=>\s*\[\s*'New form'\s*\]/, 'LegacyFormWriteController');
});

test('user deletion protects super admin availability and owned forms', () => {
  const source = readController('LegacyUserController');

  assertContains(source, /You cannot delete your own account/, 'LegacyUserController');
  assertContains(source, /role = 'super_admin'[\s\S]*FOR UPDATE/, 'LegacyUserController');
  assertContains(source, /Cannot delete the last Super Admin account/, 'LegacyUserController');
  assertContains(source, /UPDATE forms SET created_by = NULL WHERE created_by = \?/, 'LegacyUserController');
  assertContains(source, /forms_unassigned/, 'LegacyUserController');
});

test('application timezone is fixed for generated timestamps', () => {
  const source = readLaravelFile('config/app.php');

  assertContains(source, /'timezone'\s*=>\s*env\('APP_TIMEZONE', 'Asia\/Singapore'\)/, 'config/app.php');
});

test('dev proxy forwards client IP headers for audit logging', () => {
  const source = readAppFile('vite.config.js');

  assertContains(source, /xfwd:\s*true/, 'vite.config.js');
  assertContains(source, "loadEnv(mode, '.', '')", 'vite.config.js');
  assertContains(source, /VITE_API_TARGET/, 'vite.config.js');
  assertContains(source, /http:\/\/127\.0\.0\.1:8000/, 'vite.config.js');
});

test('production build calls Laravel same-origin endpoints', () => {
  const source = readAppFile('src/apiBase.js');

  assertContains(source, /import\.meta\.env\.PROD \? '' : '\/api'/, 'src/apiBase.js');
  assertContains(source, /VITE_API_BASE/, 'src/apiBase.js');
});

test('vite production build targets Laravel public app assets', () => {
  const source = readAppFile('vite.config.js');

  assertContains(source, /base:\s*mode === 'production' \? '\/app\/' : '\/'/, 'vite.config.js');
  assertContains(source, /outDir:\s*'\.\.\/form-builder-api\/laravel\/public\/app'/, 'vite.config.js');
  assertContains(source, /emptyOutDir:\s*true/, 'vite.config.js');
});

test('login banner uses Vite base URL for Laravel-hosted builds', () => {
  const source = readAppFile('src/LoginPage.jsx');

  assertContains(source, /import\.meta\.env\.BASE_URL/, 'src/LoginPage.jsx');
  assertContains(source, /src=\{agencyLogoUrl\}/, 'src/LoginPage.jsx');
  assert.doesNotMatch(source, /src="\/EMB1-LOGO-WITH-NAME-BAGONG-PILIPINAS\.png"/);
});
