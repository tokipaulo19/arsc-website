const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

test('marketing pages preload licensed first-party fonts without an external font stylesheet', () => {
  for (const name of ['index.html', ...['general-virtual-assistance', 'social-media-management', 'social-media-graphics'].map(slug => `services/${slug}/index.html`)]) {
    const html = read(name);
    assert(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html));
    assert.match(html, /rel="stylesheet" href="\/?fonts\.css\?v=/);
    if (name !== 'index.html') assert.match(html, /class="brand"[^\n]+src="\/assets\/arsc-logo\.webp" width="300" height="200"/);
    for (const font of ['inter-latin', 'space-grotesk-latin']) {
      assert(html.includes(`assets/fonts/${font}.woff2" as="font" type="font/woff2" crossorigin`));
      const bytes = fs.readFileSync(path.join(root, `assets/fonts/${font}.woff2`));
      assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    }
  }
  for (const name of ['Inter', 'Space-Grotesk']) assert.match(read(`assets/fonts/${name}-OFL.txt`), /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(read('fonts.css'), /font-weight: 400 600/);
  assert.match(read('fonts.css'), /font-weight: 500 700/);
  assert.equal((read('fonts.css').match(/font-display: swap/g) || []).length, 2);
});

test('capability choreography preserves full-strength text and sufficient foreground contrast', () => {
  const source = read('cinematic.js');
  assert.match(source, /card\.style\.opacity = '1'/);
  assert(!/card\.style\.opacity = lerp\(\.55/.test(source));
  assert.match(source, /card\.style\.transform = `translate/);
  const luminance = hex => hex.match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (luminance(a) + .05) / (luminance(b) + .05);
  assert(contrast('f36a21', '18191b') >= 4.5);
  assert(contrast('aaa8a3', '18191b') >= 4.5);
});

test('below-fold team portraits retain dimensions and defer loading', () => {
  for (const name of ['nico', 'caryl']) {
    assert.match(read('index.html'), new RegExp(`<img src="assets/${name}\\.webp" width="1080" height="1080"[^>]*loading="lazy"[^>]*decoding="async"`));
  }
});

test('small footer headings and legal text retain the readable grey palette', () => {
  const css = read('styles.css');
  for (const selector of ['\\.footer-heading', '\\.footer-bottom p']) {
    assert.match(css, new RegExp(`${selector} \\{[^}]*color: #aaa8a3;`));
  }
});
