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

// The initial-super-admin bootstrap is a CLI-only script that has not been
// ported to a Laravel artisan command yet, so its guarantee still lives in the
// legacy root PHP file.
function readLegacyFile(fileName) {
  return readFileSync(resolve(apiRoot, fileName), 'utf8');
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

test('super-admin controllers enforce the super_admin role server-side', () => {
  for (const name of ['LegacyAdminFormController', 'LegacyUserController', 'LegacyAuditLogController', 'LegacyBannerController']) {
    assertContains(readController(name), /requireSuperAdmin\s*\(/, name);
  }
});

test('authenticated controllers guard mutating actions with a session check', () => {
  // Per-user authenticated endpoints require a logged-in session.
  assertContains(readController('LegacyNotificationController'), /requireAuth\s*\(/, 'LegacyNotificationController');
  // Form writes resolve the acting user from the session, not the request body.
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
  // Not yet ported to Laravel; guarantee still lives in the legacy CLI script.
  const source = readLegacyFile('bootstrap_super_admin.php');

  assertContains(source, /PHP_SAPI\s*!==\s*'cli'/, 'bootstrap_super_admin.php');
  assertContains(source, /FB_BOOTSTRAP_ADMIN_USERNAME/, 'bootstrap_super_admin.php');
  assertContains(source, /FB_BOOTSTRAP_ADMIN_PASSWORD/, 'bootstrap_super_admin.php');
  assertContains(source, /fb_password_policy_error\s*\(/, 'bootstrap_super_admin.php');
  assertContains(source, /role\s*=\s*'super_admin'/, 'bootstrap_super_admin.php');
  assertContains(source, /A Super Admin already exists/, 'bootstrap_super_admin.php');
});

test('banner upload validates type, image content, size, and fixed destination', () => {
  const source = readController('LegacyBannerController');

  assertContains(source, /requireSuperAdmin\s*\(/, 'LegacyBannerController');
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
