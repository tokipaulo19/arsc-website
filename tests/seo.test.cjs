const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const origin = 'https://arservicescollective.com';
const slugs = ['general-virtual-assistance', 'social-media-management', 'social-media-graphics'];
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pages = slugs.map(slug => ({ route: `/services/${slug}/`, html: fs.readFileSync(path.join(root, 'services', slug, 'index.html'), 'utf8') }));
const graphs = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));

test('each service has useful distinct static content, consistent canonical metadata and one main heading', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const { route, html } of pages) {
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    const description = html.match(/name="description" content="([^"]+)"/)[1];
    titles.add(title); descriptions.add(description);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<html lang="en-AU">/);
    assert(html.includes(`rel="canonical" href="${origin}${route}"`));
    assert(html.includes(`property="og:url" content="${origin}${route}"`));
    assert(html.includes(`property="og:description" content="${description}"`));
    assert(html.includes(`name="twitter:description" content="${description}"`));
    assert.equal((html.match(/<details>/g) || []).length, 3);
    const body = html.split('<body>')[1].replace(/<[^>]*>/g, ' ').trim();
    assert(body.split(/\s+/).length > 300, 'Service content must be substantive, not a thin keyword page');
    assert.match(html, /This opens your email app\. No enquiry is sent until you send the email\./);
    const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
    assert(!/<form\b/i.test(html), 'No unconfigured service-page form');
    assert(scripts.every(tag => tag.includes('type="application/ld+json"') || tag.includes('type="module" src="/analytics-client.js?v=20261012"')), 'Only structured data and the consent-gated first-party tracker are permitted');
  }
  assert.equal(titles.size, 3); assert.equal(descriptions.size, 3);
});

test('structured data uses verified business facts and fictional previews never become review or result claims', () => {
  for (const { route, html } of [{ route: '/', html: home }, ...pages]) {
    const graph = graphs(html)[0];
    assert.equal(graph['@context'], 'https://schema.org');
    const org = graph['@graph'].find(item => item['@type'] === 'Organization');
    assert.equal(org.name, 'AR Services Collective');
    assert.equal(org.email, 'admin@arservicescollective.com');
    assert.equal(org.url, origin + '/');
    assert(!org.address && !org.review && !org.aggregateRating);
    if (route !== '/') {
      const service = graph['@graph'].find(item => item['@type'] === 'Service');
      assert.equal(service.url, origin + route);
      assert.equal(service.provider['@id'], org['@id']);
      assert.equal(service.areaServed.name, 'Australia');
      assert(!service.offers && !service.review && !service.aggregateRating);
    }
  }
});

test('new pages are discoverable from homepage cards and footer and local routes/assets resolve', () => {
  assert.match(home, /class="skip-link" href="#main-content"/);
  assert.match(home, /<main id="main-content" tabindex="-1">/);
  for (const page of pages) {
    assert.equal(home.split(`href="${page.route}"`).length - 1, 2);
    const ids = [...page.html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size);
    assert.match(page.html, /class="skip-link" href="#main-content"/);
    for (const [, target] of page.html.matchAll(/(?:href|src)="(\/[^"?]*|#[^"]+)(?:\?[^" ]*)?"/g)) {
      const [pathname, fragment] = target.split('#');
      if (pathname) {
        const filename = path.join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
        assert(fs.existsSync(filename), `Missing local target ${target}`);
        if (fragment) assert(home.includes(`id="${fragment}"`));
      } else assert(ids.includes(fragment), `Missing fragment ${fragment}`);
    }
    for (const other of pages.filter(other => other !== page)) assert(page.html.includes(`href="${other.route}"`));
  }
});

test('sitemap lists only public marketing pages and robots does not expose client route inventory', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, [origin + '/', ...pages.map(page => origin + page.route), origin + '/work/the-giving-table/']);
  assert.equal(new Set(urls).size, 5);
  assert(!/\/db\/|\/api\/|\/samples\//.test(sitemap));
  const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
  assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
  for (const prefix of ['/db/', '/api/', '/samples/']) assert(robots.includes(`Disallow: ${prefix}`));
  assert(!/password|token|kajabi|liliana/i.test(robots));
});

test('small team labels and new service-page text use readable palette pairs', () => {
  const luminance = hex => hex.match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  const css = fs.readFileSync(path.join(root, 'experience.css'), 'utf8');
  for (const selector of ['team-founder-label', 'team-role']) {
    const colour = css.match(new RegExp(`\\.team-lineup \\.${selector} \\{ color: #([a-f0-9]+);`))[1];
    assert(contrast(colour, 'd5d2cc') >= 4.5, `${selector} must remain readable on the team panel`);
  }
  for (const [foreground, background] of [['ff955b', '0b0b0c'], ['bbb9b4', '0b0b0c'], ['0b0b0c', 'f36a21']]) {
    assert(contrast(foreground, background) >= 4.5);
  }
});
