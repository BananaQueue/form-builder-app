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

test('frontend read calls use Laravel-native lookup routes', () => {
  const sources = [
    readSrc('AdminFormList.jsx'),
    readSrc('FormBuilder.jsx'),
    readSrc('FormDisplay.jsx'),
    readSrc('FormList.jsx'),
    readSrc('FormViewer.jsx'),
  ].join('\n');

  assert.match(sources, /apiUrl\([`"']\/api\/categories/);
  assert.match(sources, /apiUrl\([`"']\/api\/forms/);
  assert.match(sources, /apiUrl\([`"']\/api\/public\/forms/);
  assert.doesNotMatch(sources, /get_categories\.php|get_forms\.php|get_form_details\.php|get_form_by_code\.php/);
});
test('frontend response reads use Laravel-native response routes', () => {
  const sources = [
    readSrc('ResponseList.jsx'),
    readSrc('ResponseViewer.jsx'),
  ].join('\n');

  assert.match(sources, /\/api\/forms\/\$\{formId\}\/responses/);
  assert.match(sources, /\/api\/forms\/\$\{formId\}\/responses\/export/);
  assert.match(sources, /\/api\/responses\/\$\{responseId\}/);
  assert.doesNotMatch(sources, /get_responses\.php|get_response_details\.php|export_responses\.php/);
});
test('frontend form write calls use Laravel-native routes', () => {
  const sources = [
    readSrc('AdminFormList.jsx'),
    readSrc('FormBuilder.jsx'),
    readSrc('FormList.jsx'),
    readSrc('FormViewer.jsx'),
  ].join('\n');

  assert.match(sources, /apiUrl\(["']\/api\/forms["']\)/);
  assert.match(sources, /apiUrl\(`\/api\/forms\/\$\{editFormId\}`\)/);
  assert.match(sources, /apiUrl\(`\/api\/forms\/\$\{formPendingDelete\.id\}`\)/);
  assert.match(sources, /apiUrl\(`\/api\/forms\/\$\{formId\}`\)/);
  assert.doesNotMatch(sources, /save_form\.php|update_form\.php|delete_form\.php/);
});
test('public form submission uses the Laravel-native submission route', () => {
  const source = readSrc('FormDisplay.jsx');

  assert.match(source, /apiUrl\(`\/api\/public\/forms\/\$\{form\.id\}\/responses`\)/);
  assert.doesNotMatch(source, /submit_response\.php/);
});
test('frontend auth calls use Laravel-native session routes', () => {
  const app = readSrc('App.jsx');
  const login = readSrc('LoginPage.jsx');

  assert.match(app, /apiUrl\(['"]\/api\/session['"]\)/);
  assert.match(app, /apiUrl\(['"]\/api\/logout['"]\)/);
  assert.match(login, /apiUrl\(['"]\/api\/login['"]\)/);
  assert.doesNotMatch(app + login, /check_session\.php|login\.php|logout\.php/);
});
test('admin forms list uses the Laravel-native admin route', () => {
  const source = readSrc('AdminFormList.jsx');

  assert.match(source, /apiUrl\(`\/api\/admin\/forms\?\$\{params\}`\)/);
  assert.doesNotMatch(source, /get_all_forms\.php/);
});
test('user management uses Laravel-native user routes', () => {
  const users = readSrc('UserManagement.jsx');
  const adminForms = readSrc('AdminFormList.jsx');

  assert.match(users, /apiUrl\(['"]\/api\/users['"]\)/);
  assert.match(users, /apiUrl\(`\/api\/users\/\$\{user\.id\}`\)/);
  assert.match(users, /apiUrl\(`\/api\/users\/\$\{pwModal\.id\}\/password`\)/);
  assert.match(adminForms, /apiUrl\(["']\/api\/users["']\)/);
  assert.doesNotMatch(users + adminForms, /get_users\.php|create_user_api\.php|delete_user\.php|change_password\.php/);
});
test('form viewer duplicates through create flow and opens the copy', () => {
  const viewer = readSrc('FormViewer.jsx');
  const layout = readSrc('AdminLayout.jsx');
  const css = readSrc('styles/form-viewer.css');

  assert.match(viewer, /apiUrl\(["']\/api\/forms["']\)/);
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
  assert.match(source, /Show more/);
  assert.match(source, /Show less/);
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

test('form viewer action buttons switch to icons at very narrow mobile widths', () => {
  const css = readSrc('styles/responsive.css');

  assert.match(css, /@media\s*\(max-width:\s*400px\)[\s\S]*\.fv-action-bar \.action-button-icon\s*\{[\s\S]*display:\s*inline;/);
  assert.match(css, /@media\s*\(max-width:\s*400px\)[\s\S]*\.fv-action-bar \.action-button-label\s*\{[\s\S]*display:\s*none;/);
});

test('audit pagination text is smaller at very narrow mobile widths', () => {
  const css = readSrc('styles/audit-log.css');

  assert.match(css, /@media\s*\(max-width:\s*400px\)[\s\S]*\.al-page-btn,[\s\S]*\.al-results-count\s*\{[\s\S]*font-size:\s*var\(--text-xs\);/);
  assert.match(css, /@media\s*\(max-width:\s*400px\)[\s\S]*\.al-page-btn\s*\{[\s\S]*padding:\s*var\(--space-1\) var\(--space-3\);/);
});

test('public date/time inputs keep the native picker affordance', () => {
  const source = readSrc('FormDisplay.jsx');
  const css = readSrc('styles/form-display.css');

  assert.match(source, /question\.question_type === ["']datetime["']/);
  assert.match(source, /type=\{question\.datetime_type \|\| ["']date["']\}/);
  assert.match(css, /\.fd-input\[type="date"\],[\s\S]*\.fd-input\[type="datetime-local"\],[\s\S]*\.fd-input\[type="time"\]\s*\{[\s\S]*-webkit-appearance:\s*auto;/);
  assert.match(css, /\.fd-input\[type="date"\]::-webkit-calendar-picker-indicator,[\s\S]*\.fd-input\[type="datetime-local"\]::-webkit-calendar-picker-indicator,[\s\S]*\.fd-input\[type="time"\]::-webkit-calendar-picker-indicator\s*\{[\s\S]*opacity:\s*1;/);
  assert.match(css, /\.fd-input\[type="date"\],[\s\S]*color-scheme:\s*light;/);
});
test('public form renders section descriptions in continuous and step mode', () => {
  const source = readSrc('FormDisplay.jsx');
  const css = readSrc('styles/form-display.css');

  assert.match(source, /description: question\.description \|\| ''/);
  assert.match(source, /fd-current-step-heading/);
  assert.match(source, /fd-step-note/);
  assert.doesNotMatch(source, /className="fd-step-title"/);
  assert.match(source, /fd-step-description/);
  assert.match(source, /fd-section-description/);
  assert.match(css, /\.fd-step-note[\s\S]*display:\s*inline-flex/);
  assert.match(css, /\.fd-step-note[\s\S]*padding:\s*var\(--space-1\) var\(--space-3\)/);
  assert.match(css, /\.fd-step-note[\s\S]*text-align:\s*left/);
  assert.doesNotMatch(css, /\.fd-step-note[\s\S]*border-left/);
  assert.match(css, /\.fd-step-description[\s\S]*font-style:\s*italic/);
  assert.match(css, /\.fd-section-divider[\s\S]*text-align:\s*left/);
  assert.match(css, /\.fd-section-description[\s\S]*font-style:\s*italic/);
});

test('response viewer renders section descriptions', () => {
  const source = readSrc('ResponseViewer.jsx');
  const css = readSrc('styles/responses.css');

  assert.match(source, /answer\.description/);
  assert.match(source, /formatQuestionType/);
  assert.match(source, /rv-answer-value--empty/);
  assert.match(source, /rv-section-block__desc/);
  assert.match(css, /\.rv-section-block__desc[\s\S]*font-style:\s*italic/);
  assert.match(css, /\.rv-answer-card__text[\s\S]*text-align:\s*left/);
  assert.match(css, /\.rv-answer-card__type[\s\S]*margin-left:\s*auto/);
  assert.match(css, /\.rv-answer-card__type[\s\S]*border-radius:\s*var\(--radius-pill\)/);
  assert.match(css, /\.rv-answer-value--empty[\s\S]*background:\s*rgba\(255, 255, 255, 0\.12\)/);
});

test('public form loading state uses dark text on light surface', () => {
  const source = readSrc('FormDisplay.jsx');
  const css = readSrc('styles/form-display.css');

  assert.match(source, /fd-state-screen fd-state-screen--loading/);
  assert.match(source, /Loading form\.\.\./);
  assert.match(css, /\.fd-state-screen\s*\{[\s\S]*color:\s*var\(--text-primary\);/);
  assert.match(css, /\.fd-state-screen--loading \.form-list-loading,[\s\S]*\.fd-state-screen--loading \.afl-td-loading\s*\{[\s\S]*color:\s*var\(--text-primary\);/);
});
test('mobile toast is offset below iPhone browser chrome', () => {
  const css = readSrc('styles/notifications.css');

  assert.ok(css.includes('@media (max-width: 768px)'));
  assert.ok(css.includes('top: calc(env(safe-area-inset-top, 0px) + 88px);'));
  assert.ok(css.includes('width: calc(100% - 24px);'));
});

test('public form success state resets app scroll containers', () => {
  const source = readSrc('FormDisplay.jsx');

  assert.ok(source.includes('function scrollPublicFormToTop'));
  assert.ok(source.includes('document.querySelector(".public-form-page")'));
  assert.ok(source.includes('document.querySelector(".theme-scope")'));
  assert.ok(source.includes('document.scrollingElement'));
  assert.ok(source.includes('requestAnimationFrame(() => {'));
  assert.ok(source.includes('scrollPublicFormToTop("auto");'));
});

test('public form mobile layout prevents horizontal overflow and page zoom skew', () => {
  const formCss = readSrc('styles/form-display.css');
  const listCss = readSrc('styles/form-list.css');
  const responsiveCss = readSrc('styles/responsive.css');

  assert.ok(formCss.includes('inline-size: 100%;'));
  assert.ok(formCss.includes('max-inline-size: 100%;'));
  assert.ok(formCss.includes('min-inline-size: 0;'));
  assert.ok(formCss.includes('.fd-question-card'));
  assert.ok(listCss.includes('.public-form-page__content'));
  assert.ok(listCss.includes('overflow-x: clip;'));
  assert.ok(responsiveCss.includes('touch-action: pan-y;'));
});
