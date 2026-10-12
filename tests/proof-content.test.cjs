const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const home = read('index.html');
const proof = home.match(/<section class="proof-section"[\s\S]*?<\/section>/)[0];
const story = read('work/the-giving-table/index.html');
const route = '/work/the-giving-table/';

test('the scoped work-story addition preserves the existing business totals without reusing them as case-study results', () => {
  const totals = [...proof.matchAll(/<strong>([\d,+]+)<\/strong>\s*<span>(.*?)<\/span>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(totals, [
    ['20+', 'Businesses supported'], ['10+', 'Long-term client relationships'],
    ['10,000+', 'Hours invested into client growth'], ['15,000+', 'Followers gained across supported accounts'],
    ['10+', 'Websites &amp; digital systems supported'], ['1,000+', 'Digital assets created']
  ]);
  assert.match(proof, /PROVEN SUPPORT/);
  assert.match(proof, /Explore the work story/);
  assert(!/20\+|10\+|10,000\+|15,000\+|1,000\+/.test(story));
  assert.match(proof, /About the wider partnerships/);
});

test('case study describes cleared artwork, not invented history, growth or endorsements', () => {
  assert.equal((story.match(/<h1\b/g) || []).length, 1);
  assert.match(story, /deliverable-focused case study/);
  assert.match(story, /No campaign reach, ticket-sales figures, conversion data or client testimonial is reported here/);
  assert.match(story, /not a current offer/);
  assert.match(story, /not a working booking form/);
  assert(!/\d+%|sold out|increased sales|client said|\bROI\b|aggregateRating|"Review"|datePublished|<form|<iframe/i.test(story));
  const graph = JSON.parse(story.match(/application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(graph['@type'], 'WebPage');
  assert.equal(graph.url, 'https://arservicescollective.com' + route);
  assert(!graph.review && !graph.aggregateRating);
});

test('work story is discoverable, responsive and static with original full-size artwork', () => {
  assert(home.includes(`href="${route}"`));
  assert(read('services/social-media-graphics/index.html').includes(`href="${route}"`));
  assert(read('sitemap.xml').includes(`<loc>https://arservicescollective.com${route}</loc>`));
  assert.match(story, /class="skip-link" href="#main-content"/);
  assert.match(story, /<main id="main-content" tabindex="-1">/);
  assert.match(story, /source media="\(max-width: 640px\)" srcset="\/assets\/work\/the-giving-table-mobile.webp"/);
  assert.match(story, /img src="\/assets\/work\/the-giving-table.webp" width="1080" height="1350"/);
  assert.match(story, /href="\/assets\/work\/the-giving-table.webp" target="_blank" rel="noopener"/);
  assert.equal((story.match(/<script\b/g) || []).length, 1, 'Only static structured data; no additional runtime');
  const ids = [...story.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of story.matchAll(/(?:href|src|srcset)="(\/[^"?]*|#[^"]+)(?:\?[^" ]*)?"/g)) {
    const [pathname, fragment] = target.split('#');
    if (pathname) {
      const filename = path.join(root, pathname.endsWith('/') ? pathname + 'index.html' : pathname);
      assert(fs.existsSync(filename), `Missing ${target}`);
      if (fragment) assert(home.includes(`id="${fragment}"`));
    } else assert(ids.includes(fragment), `Missing ${fragment}`);
  }
});
