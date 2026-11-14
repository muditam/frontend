const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fixAutolinkerSourceMaps } = require('./fix-autolinker-sourcemaps.cjs');

test('removes only broken references, preserves code and valid maps, and is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autolinker-maps-'));
  try {
    fs.mkdirSync(path.join(root, 'dist'));
    for (const [name, content] of [['broken', null], ['embedded', 'export const value = 1;']]) {
      fs.writeFileSync(path.join(root, 'dist', `${name}.js`), `export const value = 1;\n//# sourceMappingURL=${name}.js.map`);
      fs.writeFileSync(path.join(root, 'dist', `${name}.js.map`), JSON.stringify({ sources: ['missing.ts'], sourcesContent: [content] }));
    }
    assert.equal(fixAutolinkerSourceMaps(root), 1);
    assert.equal(fs.readFileSync(path.join(root, 'dist/broken.js'), 'utf8'), 'export const value = 1;\n');
    assert.match(fs.readFileSync(path.join(root, 'dist/embedded.js'), 'utf8'), /sourceMappingURL/);
    assert.equal(fixAutolinkerSourceMaps(root), 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
