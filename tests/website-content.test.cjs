const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const text = value => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const section = name => html.match(new RegExp(`<section class="${name}"[^>]*>([\\s\\S]*?)</section>`))[1];

test('the hero preserves the tagline and explains the priority services and market', () => {
  const hero = section('hero');
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal(text(hero.match(/<h1>([\s\S]*?)<\/h1>/)[1]), 'More gets done. Less sits with you.');
  const description = text(hero.match(/<p class="hero-text">([\s\S]*?)<\/p>/)[1]);
  for (const phrase of ['Australian businesses', 'general virtual assistance', 'social media management', 'social media graphics']) {
    assert(description.includes(phrase));
  }
  assert.match(hero, /<a href="#services" class="text-link">\s*Explore our services/);
  assert.match(hero, /<a href="#contact" class="button">/);
});

test('service cards and footer use matching specific capability names', () => {
  const services = section('services-section');
  const names = [...services.matchAll(/<h3>(.*?)<\/h3>/g)].map(match => text(match[1]));
  assert.deepEqual(names, ['General Virtual Assistance', 'Social Media Management', 'Social Media Graphics', 'Website &amp; Systems']);
  const support = html.match(/<p class="footer-heading">SUPPORT<\/p>([\s\S]*?)<\/nav>/)[1];
  const routes = ['/services/general-virtual-assistance/', '/services/social-media-management/', '/services/social-media-graphics/', '#services'];
  names.forEach((name, i) => assert(support.includes(`href="${routes[i]}">${name}</a>`)));
});

test('search and social descriptions consistently explain the visible services', () => {
  const descriptions = [...html.matchAll(/<meta\s+(?:name="description"|property="og:description"|name="twitter:description")\s+content="([^"]+)"/g)].map(match => match[1]);
  assert.equal(descriptions.length, 3);
  assert.equal(new Set(descriptions).size, 1);
  for (const phrase of ['virtual assistance', 'social media management', 'social media graphics', 'Australian businesses']) {
    assert(descriptions[0].includes(phrase));
  }
  assert.match(html, /<title>Virtual Assistance &amp; Social Media Support \| ARSC<\/title>/);
  assert.match(html, /rel="canonical"\s+href="https:\/\/arservicescollective\.com\/"/);
});

test('local fragment links resolve and approved partnerships and contact stay intact', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'IDs must be unique');
  for (const [, id] of html.matchAll(/href="#([^"\s]+)"/g)) assert(ids.includes(id), `Missing target ${id}`);
  assert(html.includes('The Giving Table'));
  assert(!/Donna|Tan out of Tan|The Posing Locker/i.test(html));
  assert(html.includes('mailto:admin@arservicescollective.com?subject=ARSC%20Enquiry'));
});
