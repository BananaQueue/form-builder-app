import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..', '..', 'form-builder-api');
const appRoot = resolve(__dirname, '..');

function readApiFile(fileName) {
  return readFileSync(resolve(apiRoot, fileName), 'utf8');
}

function readAppFile(fileName) {
  return readFileSync(resolve(appRoot, fileName), 'utf8');
}

function assertContains(source, expected, fileName) {
  assert.match(
    source,
    expected instanceof RegExp ? expected : new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `${fileName} should contain ${expected.toString()}`,
  );
}

const mutatingAuthenticatedEndpoints = [
  'acknowledge_notification.php',
  'change_password.php',
  'create_user_api.php',
  'delete_form.php',
  'delete_user.php',
  'logout.php',
  'mark_notification_read.php',
  'remove_banner.php',
  'save_form.php',
  'update_form.php',
  'upload_banner.php',
];

test('authenticated mutating endpoints require CSRF protection', () => {
  for (const fileName of mutatingAuthenticatedEndpoints) {
    const source = readApiFile(fileName);

    assertContains(source, /require_once ['"]auth_helper\.php['"]/, fileName);
    assertContains(source, /fb_require_csrf\s*\(/, fileName);

    if (fileName === 'logout.php') {
      assertContains(source, /fb_start_session\s*\(/, fileName);
    } else {
      assert.match(
        source,
        /fb_require_auth\s*\(|fb_require_super_admin\s*\(/,
        `${fileName} should require an authenticated session`,
      );
    }
  }
});

const superAdminEndpoints = [
  'change_password.php',
  'create_user_api.php',
  'delete_user.php',
  'get_all_forms.php',
  'get_audit_logs.php',
  'get_users.php',
];

test('super-admin endpoints enforce the super_admin role server-side', () => {
  for (const fileName of superAdminEndpoints) {
    assertContains(readApiFile(fileName), /fb_require_super_admin\s*\(/, fileName);
  }
});

test('login uses password verification, session regeneration, and rate limiting', () => {
  const source = readApiFile('login.php');

  assertContains(source, /password_verify\s*\(/, 'login.php');
  assertContains(source, /session_regenerate_id\s*\(\s*true\s*\)/, 'login.php');
  assertContains(source, /fb_is_login_rate_limited\s*\(/, 'login.php');
  assertContains(source, /fb_record_login_failure\s*\(/, 'login.php');
  assertContains(source, /fb_clear_login_failures\s*\(/, 'login.php');
});

test('user password writes hash passwords instead of storing plaintext', () => {
  for (const fileName of ['create_user_api.php', 'change_password.php']) {
    const source = readApiFile(fileName);

    assertContains(source, /password_hash\s*\(/, fileName);
    assert.doesNotMatch(
      source,
      /SET\s+password_hash\s*=\s*\$newPassword|VALUES\s*\([^)]*\$password[^)]*\)/,
      `${fileName} should not write raw password variables into password_hash`,
    );
  }
});

test('banner upload validates type, image content, size, and fixed destination', () => {
  const source = readApiFile('upload_banner.php');

  assertContains(source, /fb_require_auth\s*\(/, 'upload_banner.php');
  assertContains(source, /fb_require_csrf\s*\(/, 'upload_banner.php');
  assertContains(source, /2\s*\*\s*1024\s*\*\s*1024/, 'upload_banner.php');
  assertContains(source, /finfo_open\s*\(\s*FILEINFO_MIME_TYPE\s*\)/, 'upload_banner.php');
  assertContains(source, /getimagesize\s*\(/, 'upload_banner.php');
  assertContains(source, /IMAGETYPE_PNG/, 'upload_banner.php');
  assertContains(source, /move_uploaded_file\s*\(/, 'upload_banner.php');
  assertContains(source, /banner\.png/, 'upload_banner.php');
});

test('public response submission validates server-owned form questions', () => {
  const source = readApiFile('submit_response.php');

  assertContains(source, /SELECT\s+id\s+FROM\s+forms\s+WHERE\s+id\s+=\s+\?/i, 'submit_response.php');
  assertContains(source, /WHERE\s+form_id\s+=\s+\?/i, 'submit_response.php');
  assertContains(source, /isset\s*\(\s*\$questionsById\[\$questionId\]\s*\)/, 'submit_response.php');
  assertContains(source, /fb_is_question_visible\s*\(/, 'submit_response.php');
  assertContains(source, /fb_validate_answer\s*\(/, 'submit_response.php');
  assertContains(source, /FROM\s+question_options/i, 'submit_response.php');
  assertContains(source, /beginTransaction\s*\(/, 'submit_response.php');
  assertContains(source, /commit\s*\(/, 'submit_response.php');
  assertContains(source, /rollBack\s*\(/, 'submit_response.php');
});

test('form ownership checks exist on sensitive form and response endpoints', () => {
  const ownershipEndpoints = [
    'delete_form.php',
    'export_responses.php',
    'get_form_details.php',
    'get_responses.php',
    'get_response_details.php',
    'update_form.php',
  ];

  for (const fileName of ownershipEndpoints) {
    const source = readApiFile(fileName);

    assert.match(source, /created_by|formOwnerId|owner/i, `${fileName} should inspect form ownership`);
    assert.match(source, /permission|own|Super admin|super_admin/i, `${fileName} should reject unauthorized access`);
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
  const auditedEndpoints = {
    'login.php': 'USER_LOGIN',
    'logout.php': 'USER_LOGOUT',
    'create_user_api.php': 'USER_CREATED',
    'change_password.php': 'USER_PASSWORD_CHANGED',
    'delete_user.php': 'USER_DELETED',
    'save_form.php': 'FORM_CREATED',
    'update_form.php': 'FORM_UPDATED',
    'delete_form.php': 'FORM_DELETED',
    'export_responses.php': 'RESPONSES_EXPORTED',
    'upload_banner.php': 'BANNER_UPLOADED',
    'remove_banner.php': 'BANNER_REMOVED',
  };

  for (const [fileName, action] of Object.entries(auditedEndpoints)) {
    const source = readApiFile(fileName);

    assertContains(source, /require_once ['"]audit_helpers\.php['"]/, fileName);
    assertContains(source, /fb_audit_log\s*\(/, fileName);
    assertContains(source, new RegExp(action), fileName);
  }
});

test('audit log reads bootstrap the audit table before querying', () => {
  const source = readApiFile('get_audit_logs.php');

  assertContains(source, /require_once ['"]audit_helpers\.php['"]/, 'get_audit_logs.php');
  assertContains(source, /fb_ensure_audit_logs_table\s*\(/, 'get_audit_logs.php');
  assertContains(source, /fb_normalize_audit_log_metadata\s*\(/, 'get_audit_logs.php');
});

test('form update audit metadata uses readable owner and change details', () => {
  const source = readApiFile('update_form.php');

  assertContains(source, /owner_username/, 'update_form.php');
  assertContains(source, /form_owner/, 'update_form.php');
  assertContains(source, /fb_update_audit_describe_changes\s*\(/, 'update_form.php');
  assertContains(source, /Question\s+\{\$questionNumber\}/, 'update_form.php');
  assert.doesNotMatch(source, /owner_user_id|super_admin_action|question_count/);
});

test('form creation audit metadata uses simple new form detail', () => {
  const source = readApiFile('save_form.php');

  assertContains(source, /'changes'\s*=>\s*\[\s*'New form'\s*\]/, 'save_form.php');
});

test('dev proxy forwards client IP headers for audit logging', () => {
  const source = readAppFile('vite.config.js');

  assertContains(source, /xfwd:\s*true/, 'vite.config.js');
});

test('user deletion protects super admin availability and owned forms', () => {
  const source = readApiFile('delete_user.php');

  assertContains(source, /You cannot delete your own account/, 'delete_user.php');
  assertContains(source, /role\s*=\s*'super_admin'[\s\S]*FOR UPDATE/, 'delete_user.php');
  assertContains(source, /Cannot delete the last Super Admin account/, 'delete_user.php');
  assertContains(source, /UPDATE forms SET created_by = NULL WHERE created_by = \?/, 'delete_user.php');
  assertContains(source, /forms_unassigned/, 'delete_user.php');
});
