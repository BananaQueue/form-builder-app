import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolve(__dirname, '..', 'src');

function readSrc(relativePath) {
  return readFileSync(resolve(srcRoot, relativePath), 'utf8');
}

test('admin nav overlap watcher listens to the real app scroll container', () => {
  const source = readSrc('AdminLayout.jsx');

  assert.match(source, /closest\(["']\.theme-scope["']\)/);
  assert.match(source, /addEventListener\(["']scroll["'],\s*onScrollOrResize/);
  assert.match(source, /ResizeObserver/);
  assert.match(source, /MutationObserver/);
  assert.doesNotMatch(source, /window\.addEventListener\(["']scroll["'],\s*onScrollOrResize/);
});

test('form action migration keeps a stable placeholder in the original action bar', () => {
  const jsx = readSrc('FormViewer.jsx');
  const css = readSrc('styles/form-viewer.css');

  assert.match(jsx, /fv-action-bar--placeholder/);
  assert.match(jsx, /aria-hidden=\{actionsInNavbar \? ["']true["'] : undefined\}/);
  assert.match(jsx, /window\.getComputedStyle\(nav\)\.position === ["']sticky["']/);
  assert.match(css, /\.fv-action-bar--placeholder\s*\{[^}]*visibility:\s*hidden;/s);
  assert.match(css, /\.fv-action-bar--placeholder\s*\{[^}]*pointer-events:\s*none;/s);
});

test('migrated nav actions shrink before sticky nav is disabled', () => {
  const css = readSrc('styles/navigation.css');
  const iconBreakpoint = css.match(/@media\s*\(max-width:\s*(\d+)px\)\s*\{[^@]*?\.glass-nav\.glass-nav--actions-migrated \.nav-actions \.glass-button/s);
  const staticBreakpoint = css.match(/@media\s*\(max-width:\s*(\d+)px\)\s*\{\s*\.glass-nav\s*\{\s*position:\s*static;/s);

  assert.ok(iconBreakpoint, 'expected icon-only breakpoint for migrated actions');
  assert.ok(staticBreakpoint, 'expected non-sticky breakpoint for nav');
  assert.ok(
    Number(iconBreakpoint[1]) > Number(staticBreakpoint[1]),
    'action icons should appear before sticky nav is disabled',
  );
});

test('three-dot menu closes on theme-scope scroll instead of sticking to the viewport', () => {
  const source = readSrc('AdminFormList.jsx');

  assert.match(source, /createPortal/);
  assert.match(source, /closest\(["']\.theme-scope["']\)/);
  assert.match(source, /scrollContainer\.addEventListener\(["']scroll["'],\s*handleScroll/);
  assert.match(source, /window\.addEventListener\(["']resize["'],\s*handleScroll/);
  assert.match(source, /top:\s*menuPosition\.top/);
  assert.doesNotMatch(source, /top:\s*menuPosition\.top\s*-\s*window\.scrollY/);
});

test('action buttons keep accessible names when labels are hidden responsively', () => {
  const source = readSrc('ActionButtons.jsx');
  const navigationCss = readSrc('styles/navigation.css');
  const responsiveCss = readSrc('styles/responsive.css');

  assert.match(source, /aria-label=["']Fill out form["']/);
  assert.match(source, /aria-label=["']Copy form link["']/);
  assert.match(source, /aria-label=["']Show QR code["']/);
  assert.match(source, /aria-label=["']Duplicate form["']/);
  assert.match(source, /className=["']action-button-icon["']/);
  assert.match(source, /className=["']action-button-label["']/);
  assert.match(navigationCss, /\.action-button-label/);
  assert.match(responsiveCss, /\.action-button-label/);
  assert.doesNotMatch(navigationCss, /\.glass-button span\s*\{/);
  assert.doesNotMatch(responsiveCss, /\.glass-button--(?:fill|share|qr|duplicate)\s+span/);
});

test('form viewer duplicates through create flow and opens the copy', () => {
  const viewer = readSrc('FormViewer.jsx');
  const layout = readSrc('AdminLayout.jsx');
  const css = readSrc('styles/form-viewer.css');

  assert.match(viewer, /apiUrl\(["']\/save_form\.php["']\)/);
  assert.match(viewer, /buildDuplicatePayload/);
  assert.match(viewer, /onDuplicateComplete\?\.\(result\.form_id\)/);
  assert.match(layout, /onDuplicateComplete=\{handleViewForm\}/);
  assert.match(css, /\.glass-button--duplicate/);
});

test('public form route forces light theme on mobile screens', () => {
  const source = readSrc('App.jsx');

  assert.match(source, /function PublicFormRoute/);
  assert.match(source, /const isMobile = useIsMobile\(\)/);
  assert.match(source, /const publicTheme = isMobile \? ['"]light['"] : systemTheme/);
  assert.match(source, /data-theme=\{publicTheme\}/);
});

test('audit log details summarize and expand multiple changes', () => {
  const source = readSrc('AuditLog.jsx');
  const css = readSrc('styles/audit-log.css');

  assert.match(source, /function AuditMetadataDetails/);
  assert.match(source, /expandedLogIds/);
  assert.match(source, /Show details/);
  assert.match(source, /\$\{changes\.length\} changes/);
  assert.doesNotMatch(source, /hiddenChangeCount|al-change-preview/);
  assert.match(css, /\.al-change-list/);
  assert.match(css, /\.al-detail-toggle/);
  assert.doesNotMatch(css, /\.al-change-preview/);
});

test('user management permits deleting other super admins but hides self-delete', () => {
  const source = readSrc('UserManagement.jsx');
  const layout = readSrc('AdminLayout.jsx');

  assert.match(source, /currentUser = ''/);
  assert.match(source, /user\.username === currentUser/);
  assert.match(source, /user\.username !== currentUser/);
  assert.doesNotMatch(source, /Super Admin accounts cannot be deleted through the UI/);
  assert.match(layout, /currentUser=\{currentUser\}/);
});

test('public number inputs allow decimal submission while spinner steps by one', () => {
  const source = readSrc('FormDisplay.jsx');

  assert.match(source, /type=["']number["']\s+step=["']1["']/);
  assert.match(source, /<form onSubmit=\{handleSubmit\} noValidate>/);
});

test('response list numbers newest-first rows chronologically', () => {
  const source = readSrc('ResponseList.jsx');

  assert.match(source, /Response #\{responses\.length - index\}/);
  assert.doesNotMatch(source, /Response #\{index \+ 1\}/);
});

test('light mode disables box shadows on mobile', () => {
  const css = readSrc('styles/theme.css');

  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*\[data-theme="light"\]\.theme-scope[\s\S]*--shadow-soft:\s*none;/);
  assert.match(css, /@media\s*\(max-width:\s*768px\)[\s\S]*\[data-theme="light"\]\.theme-scope \*[\s\S]*box-shadow:\s*none\s*!important;/);
});

test('audit log dates prefer server epoch timestamps', () => {
  const source = readSrc('AuditLog.jsx');

  assert.match(source, /function formatDate\(value, unixSeconds\)/);
  assert.match(source, /new Date\(timestamp \* 1000\)\.toLocaleString\(\)/);
  assert.match(source, /formatDate\(log\.created_at, log\.created_at_unix\)/);
});
