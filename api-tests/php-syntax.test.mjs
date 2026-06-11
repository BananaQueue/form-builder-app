import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..', '..', 'form-builder-api');

test('all PHP API entrypoints pass syntax validation', () => {
  const phpFiles = readdirSync(apiRoot)
    .filter((fileName) => fileName.endsWith('.php'))
    .sort();

  assert.ok(phpFiles.length > 0, 'expected PHP files to lint');

  for (const fileName of phpFiles) {
    const fullPath = resolve(apiRoot, fileName);
    assert.doesNotThrow(
      () => execFileSync('php', ['-l', fullPath], { encoding: 'utf8' }),
      `${fileName} should pass php -l`,
    );
  }
});
