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
  const context = { prefersReducedMotion: false, motionFrame: 1, filmHeroHeight: null, previousScrollY: 0,
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

test('mobile film skips document-wide ambient writes but keeps hero motion', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const functions = source.slice(source.indexOf('function updateScrollScenes()'), source.indexOf('function queueScrollSceneUpdate()'));
  const rootWrites = [];
  const heroStyle = { setProperty(key, value) { this[key] = value; } };
  let reads = 0;
  const context = { prefersReducedMotion: false, motionFrame: 1, filmHeroHeight: null, previousScrollY: 0,
    heroScene: { style: heroStyle, getBoundingClientRect() { reads++; return { height: 900 }; } },
    sceneDockIndex: null, sceneDockLabel: null, activeSceneIndex: 0,
    clamp: (n, min = 0, max = 1) => Math.min(max, Math.max(min, n)),
    window: { innerWidth: 390, innerHeight: 844, scrollY: 600 },
    document: { body: { classList: { contains: name => name === 'film-enabled' } },
      documentElement: { get scrollHeight() { throw new Error('Phone film must not read document height each frame'); }, style: { setProperty(key) { rootWrites.push(key); } } } },
    measuredMotionNodes() { throw new Error('Retired scene measurements must not run'); } };
  vm.createContext(context); vm.runInContext(functions, context);
  for (let frame = 0; frame < 60; frame++) vm.runInContext('updateScrollScenes()', context);
  assert.equal(reads, 1, 'Hero height is cached between layout changes');
  context.filmHeroHeight = null;
  vm.runInContext('updateScrollScenes()', context);
  assert.equal(reads, 2, 'An invalidated layout is measured again');
  assert.deepEqual(rootWrites, []);
  assert.equal(heroStyle['--hero-copy-opacity'], '0.7467');
});

test('phone decoration is static while film content and logo remain animated', () => {
  const css = fs.readFileSync(path.join(root, 'cinematic.css'), 'utf8');
  const mobile = css.slice(css.indexOf('/* Keep the phone'));
  assert.match(mobile, /@media \(max-width: 640px\)/);
  assert.match(mobile, /\.journey-enabled \.experience-fx,[\s\S]*?display: none/);
  assert.match(mobile, /backdrop-filter: none/);
  assert.match(mobile, /ellipse at 50% 60%/);
  assert(!mobile.includes('var(--film-glow-x'));
  assert(!mobile.includes('transform: none'));
  assert.match(css, /translate3d\(var\(--film-x/);
});

test('phone film retains only visible scene layers and crossfades prepared backgrounds', () => {
  const css = fs.readFileSync(path.join(root, 'cinematic.css'), 'utf8');
  const mobile = css.slice(css.indexOf('/* Keep the phone'));
  assert.match(mobile, /\.film-enabled \.film-screen-next \{[^}]*position: absolute;[^}]*inset: 0;[^}]*will-change: opacity/);
  assert.match(mobile, /\.motion-ready \.journey-enabled\.film-enabled \.journey-section > \.container\[style\*="visibility: visible"\] \{\s*will-change: transform, opacity;/);
  assert.match(css, /\.film-screen-next \{ display: none; \}/);
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

test('film and gallery pose properties do not inherit into content descendants', () => {
  for (const [file, names] of [['cinematic.css', ['x', 'y', 'read-y', 'roll', 'scale', 'alpha']],
    ['showcase.css', ['x', 'roll', 'scale', 'opacity', 'depth']]]) {
    const css = fs.readFileSync(path.join(root, file), 'utf8');
    const prefix = file === 'cinematic.css' ? 'film' : 'work';
    for (const name of names) assert.match(css, new RegExp('@property --' + prefix + '-' + name + ' \\{[^}]*inherits: false;[^}]*initial-value:'));
  }
});

test('phone progress indicator performs no layout reads or style writes', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const functions = source.slice(source.indexOf('function updatePageSignal()'), source.indexOf('function queuePageSignalUpdate()'));
  const context = { window: { innerWidth: 390 }, signalFrame: 1, lastSignalPercentage: 50,
    document: { get documentElement() { throw new Error('Hidden indicator must not read page layout'); } } };
  vm.createContext(context); vm.runInContext(functions, context);
  vm.runInContext('updatePageSignal()', context);
  assert.equal(context.signalFrame, null);
  assert.equal(context.lastSignalPercentage, null);
});

test('all nine graphic selectors fit one phone row with tall tap targets', () => {
  const css = fs.readFileSync(path.join(root, 'showcase.css'), 'utf8');
  assert.match(css, /\.work-creative \.work-selectors \{[^}]*flex-wrap: wrap/);
  assert.match(css, /\.work-creative \.work-selectors button \{[^}]*min-width: 44px; min-height: 44px/);
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.work-creative \.work-selectors \{ flex-wrap: nowrap; width: 100%; \}/);
  assert.match(css, /\.work-creative \.work-selectors button \{ flex: 1 1 0; width: auto; min-width: 24px; min-height: 44px;/);
});

test('phone gallery previews retain full-size links and reduce transfer and decoded dimensions', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const names = ['fitfocus', 'the-giving-table', 'saltsand', 'ampt-coaching', 'ont', 'melgreen', 'personalised-posing', 'koko-stagewear', 'posing-locker'];
  let original = 0, mobile = 0;
  for (const name of names) {
    const bytes = fs.readFileSync(path.join(root, 'assets/work', `${name}-mobile.webp`));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    mobile += bytes.length;
    original += fs.statSync(path.join(root, 'assets/work', `${name}.webp`)).size;
    assert(html.includes(`media="(max-width: 640px)" srcset="assets/work/${name}-mobile.webp"`));
    assert(html.includes(`href="assets/work/${name}.webp" target="_blank"`));
    assert(html.includes(`<img src="assets/work/${name}.webp" width="1080"`));
  }
  assert(mobile < original * .55, 'Phone preview payload is approximately half of the originals');
  const build = fs.readFileSync(path.join(root, 'tests/helpers/prepare-gallery-previews.cjs'), 'utf8');
  assert.match(build, /width: 720, withoutEnlargement: true/);
});

test('film timeline values stay local to their animated element rather than invalidating the page', () => {
  const css = fs.readFileSync(path.join(root, 'cinematic.css'), 'utf8');
  for (const name of ['span', 'arrival', 'departure', 'footer-phase']) {
    assert.match(css, new RegExp('@property --film-' + name + ' \\{[^}]*inherits: false;'));
  }
  const source = fs.readFileSync(path.join(root, 'page-film.js'), 'utf8');
  assert.match(source, /number\(footer, '--film-footer-phase', closing\)/);
  assert(!source.includes("number(document.body, '--film-footer-phase'"));
});

test('initial legacy geometry is queued until the film has selected its layout path', () => {
  const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8').replaceAll('\r\n', '\n');
  const setup = source.slice(source.indexOf('{\n  window.addEventListener("scroll", queueScrollSceneUpdate'), source.indexOf("window.addEventListener('arsc:motion-change'"));
  assert.match(setup, /queueScrollSceneUpdate\(\);\s*\}/);
  assert(!/\n  updateScrollScenes\(\);/.test(setup));
  assert.match(fs.readFileSync(path.join(root, 'cinematic.js'), 'utf8'), /if \(film\?\.enabled\) \{\s*lastProgress = -1;\s*queue\(\);\s*return;/);
});
