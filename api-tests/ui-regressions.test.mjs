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

  assert.match(source, /aria-label=["']Fill out form["']/);
  assert.match(source, /aria-label=["']Copy form link["']/);
  assert.match(source, /aria-label=["']Show QR code["']/);
});
