const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..', 'samples', 'makeup-brands');
const brands = [
  ['veloura', 'veloura'],
  ['mizu', 'mizu'],
  ['poplash', 'poplash'],
  ['terra-tone', 'terra'],
  ['nocturne', 'nocturne'],
  ['sunday-studio', 'sunday'],
];

test('portfolio gallery links to all six brand sites', () => {
  const gallery = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const [slug] of brands) {
    assert.match(gallery, new RegExp(`href=["']${slug}/["']`));
  }
});

test('every makeup concept has a complete, wired landing page', () => {
  for (const [slug, theme] of brands) {
    const htmlPath = path.join(root, slug, 'index.html');
    assert.ok(fs.existsSync(htmlPath), `${slug} index is missing`);
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.match(html, new RegExp(`data-theme=["']${theme}["']`));
    assert.match(html, /..\/shared\/site\.css/);
    assert.match(html, /..\/shared\/site\.js/);
    assert.match(html, /class="hero"/);
    assert.match(html, /class="section products"/);
    assert.match(html, /class="story"/);
    assert.match(html, /class="section ritual"/);
    assert.match(html, /Fictional brand concept by AR Services Collective/);
    assert.ok((html.match(/class="product-card/g) || []).length === 3, `${slug} should contain three product cards`);
  }
});

test('all six original campaign images are present and substantial', () => {
  for (const [slug] of brands) {
    const file = path.join(root, 'assets', `${slug}-hero.png`);
    assert.ok(fs.existsSync(file), `${slug} hero image is missing`);
    assert.ok(fs.statSync(file).size > 500_000, `${slug} hero image appears incomplete`);
  }
});

test('shared experience includes responsive and reduced-motion treatment', () => {
  const css = fs.readFileSync(path.join(root, 'shared', 'site.css'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'shared', 'site.js'), 'utf8');
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /quick-add/);
  assert.match(js, /newsletter-form/);
});
