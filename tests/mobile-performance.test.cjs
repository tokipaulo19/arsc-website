const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

test('film mode measures only the hero and never runs retired card parallax', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const functions = source.slice(source.indexOf('function updateScrollScenes()'), source.indexOf('function queueScrollSceneUpdate()'));
  let reads = 0;
  const style = { setProperty(key, value) { this[key] = value; } };
  const hero = { style, getBoundingClientRect() { reads++; return { height: 900 }; } };
  const context = { prefersReducedMotion: false, motionFrame: 1, previousScrollY: 0,
    heroScene: hero, sceneDockIndex: null, sceneDockLabel: null, activeSceneIndex: 0,
    clamp: (n, min = 0, max = 1) => Math.min(max, Math.max(min, n)),
    window: { innerHeight: 844, scrollY: 600 },
    document: { body: { classList: { contains: name => name === 'film-enabled' } }, documentElement: { scrollHeight: 5000, style } },
    measuredMotionNodes() { throw new Error('Retired scene measurements must not run in film mode'); } };
  vm.createContext(context); vm.runInContext(functions, context);
  for (let frame = 0; frame < 60; frame++) vm.runInContext('updateScrollScenes()', context);
  assert.equal(reads, 60);
  assert.equal(context.motionFrame, null);
  assert.equal(style['--hero-panel-shift'], '-22.67px');
  assert.equal(style['--hero-copy-opacity'], '0.7467');
  assert(style['--aura-y'], 'Shared ambient motion remains enabled');
});

test('compressed brand and portrait assets preserve sources and reduce their combined bytes', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  let before = 0, after = 0;
  for (const name of ['arsc-logo', 'arsc-mark', 'nico', 'caryl']) {
    const png = fs.readFileSync(path.join(root, 'assets', `${name}.png`));
    const webp = fs.readFileSync(path.join(root, 'assets', `${name}.webp`));
    before += png.length; after += webp.length;
    assert.equal(webp.toString('ascii', 0, 4), 'RIFF');
    assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
    assert(html.includes(`src="assets/${name}.webp" width="${png.readUInt32BE(16)}" height="${png.readUInt32BE(20)}"`));
  }
  assert(after < before * .15);
  const css = fs.readFileSync(path.join(root, 'cinematic.css'), 'utf8');
  assert.match(css, /\.brand img, \.footer-logo img, \.hero-mark, \.cinematic-object img \{ height: auto; \}/);
  assert.match(css, /\.team-portrait img \{ height: auto; \}/);
});

test('all nine graphic selectors have finger-sized targets and wrap on narrow screens', () => {
  const css = fs.readFileSync(path.join(root, 'showcase.css'), 'utf8');
  assert.match(css, /\.work-creative \.work-selectors \{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.work-creative \.work-selectors button \{[^}]*min-width: 44px; min-height: 44px/);
});
