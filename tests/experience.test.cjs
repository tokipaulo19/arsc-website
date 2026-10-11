const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../experience.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

function fixture({ stored = '0', systemReduced = false, blocked = false } = {}) {
  const node = () => {
    const attrs = {}, events = {}, classes = new Set();
    return { attrs, events, open: false, textContent: '', offsetTop: 0,
      classList: { contains: key => classes.has(key), toggle(key, on) { on ? classes.add(key) : classes.delete(key); } },
      setAttribute(key, value) { attrs[key] = value; }, removeAttribute(key) { delete attrs[key]; },
      addEventListener(key, fn) { (events[key] ||= []).push(fn); },
      emit(key, event = {}) { (events[key] || []).forEach(fn => fn(event)); },
      focus() { this.focused = true; }, contains(target) { return target === this || this.children?.includes(target); }
    };
  };
  const button = node(), summary = node(), menu = node(), current = node(), choice = node(), note = node();
  const links = ['home', 'services', 'contact'].map(id => ({ ...node(), dataset: { chapter: id }, textContent: id }));
  links[0].setAttribute('aria-current', 'location');
  menu.children = [button, summary, ...links];
  menu.querySelector = selector => ({ 'summary': summary, '.chapter-current': current, '.motion-choice': choice, '.motion-toggle': button, '#motion-note': note })[selector];
  menu.querySelectorAll = () => links;
  const targets = Object.fromEntries(links.map((link, index) => [link.dataset.chapter, { ...node(), id: link.dataset.chapter, offsetTop: index * 1000 }]));
  const root = node(), body = node(), wrap = { offsetHeight: 88 }, frames = [], events = {}, writes = [], changes = [];
  const window = { scrollY: 0, innerHeight: 900,
    addEventListener(key, fn) { (events[key] ||= []).push(fn); },
    dispatchEvent(event) { if (event.type === 'arsc:motion-change') changes.push(event.detail); (events[event.type] || []).forEach(fn => fn(event)); }
  };
  const system = { matches: systemReduced, addEventListener(_, fn) { this.change = fn; } };
  const document = { documentElement: root, body,
    querySelector: selector => ({ '.chapter-menu': menu, '.nav-wrap': wrap })[selector],
    getElementById: id => targets[id], fonts: { ready: { then() {} } }
  };
  const storage = { getItem() { if (blocked) throw Error('denied'); return stored; }, setItem(key, value) { if (blocked) throw Error('denied'); stored = value; writes.push([key, value]); } };
  vm.runInNewContext(source, { window, document, localStorage: storage, matchMedia: () => system,
    requestAnimationFrame: fn => frames.push(fn), CustomEvent: function(type, init) { this.type = type; this.detail = init.detail; } });
  const flush = () => { while (frames.length) frames.shift()(); };
  flush();
  return { window, root, body, menu, summary, button, note, links, targets, writes, changes, system, flush,
    setStored(value) { stored = value; },
    emit(type, props = {}) { window.dispatchEvent({ type, ...props }); } };
}

test('cinematic is the default; the remembered choice works and captures the current reading position', () => {
  const f = fixture();
  assert.equal(f.window.ARSCExperience.reduced, false);
  const bookmark = { section: f.targets.services, fraction: .6 };
  f.window.ARSCExperience.capturePosition = () => bookmark;
  f.button.emit('click');
  assert.equal(f.window.ARSCExperience.reduced, true);
  assert(f.root.classList.contains('less-motion'));
  assert.equal(f.button.attrs['aria-pressed'], 'true');
  assert.equal(f.changes[0].position, bookmark);
  assert.equal(f.writes[0][1], '1');
  f.button.emit('click');
  assert.equal(f.window.ARSCExperience.reduced, false);
  assert.equal(f.writes[1][1], '0');
  assert.equal(fixture({ stored: '1' }).window.ARSCExperience.reduced, true);
});

test('device reduced motion cannot be overridden and responds to system changes', () => {
  const f = fixture({ systemReduced: true });
  assert.equal(f.button.disabled, true);
  f.button.emit('click');
  assert.equal(f.writes.length, 0);
  assert.equal(f.window.ARSCExperience.reduced, true);
  f.system.matches = false; f.system.change();
  assert.equal(f.window.ARSCExperience.reduced, false);
  assert.equal(f.button.disabled, false);
});

test('blocked storage leaves the controls usable and reports a visit-only choice', () => {
  const f = fixture({ blocked: true });
  f.button.emit('click');
  assert.equal(f.window.ARSCExperience.reduced, true);
  assert.match(f.note.textContent, /applies for this visit/);
  f.button.emit('click');
  assert.equal(f.window.ARSCExperience.reduced, false);
});

test('active chapter follows native reading and cinematic state without stale aria-current links', () => {
  const f = fixture();
  f.window.scrollY = 1100; f.emit('scroll'); f.flush();
  assert.equal(f.window.ARSCExperience.chapter, 'services');
  assert.equal(f.links.filter(link => link.attrs['aria-current']).length, 1);
  f.body.classList.toggle('film-enabled', true);
  f.window.ARSCExperience.setChapter('contact');
  f.emit('scroll'); f.flush();
  assert.equal(f.window.ARSCExperience.chapter, 'contact');
  f.window.ARSCExperience.setChapter('unknown');
  assert.equal(f.window.ARSCExperience.chapter, 'contact');
});

test('Escape restores summary focus; outside clicks and chapter selection close the menu', () => {
  const f = fixture();
  f.menu.open = true;
  let prevented = false;
  f.emit('keydown', { key: 'Escape', preventDefault() { prevented = true; } });
  assert(prevented); assert.equal(f.menu.open, false); assert(f.summary.focused);
  f.menu.open = true; f.emit('pointerdown', { target: f.button });
  assert.equal(f.menu.open, true);
  f.emit('pointerdown', { target: {} }); assert.equal(f.menu.open, false);
  f.menu.open = true; f.links[1].emit('click'); f.flush();
  assert.equal(f.menu.open, false); assert(f.targets.services.focused);
});

test('preferences sync across tabs without writing history or adding wheel handlers', () => {
  const f = fixture();
  f.button.emit('click');
  f.emit('storage', { key: 'arsc-less-motion' });
  assert.equal(f.window.ARSCExperience.reduced, true);
  f.setStored('0');
  f.emit('storage', { key: 'arsc-less-motion' });
  assert.equal(f.window.ARSCExperience.reduced, false);
  assert.equal(f.writes.length, 1);
  assert(!source.includes("addEventListener('wheel'"));
  assert(!source.includes('pushState'));
  assert(!source.includes('replaceState'));
});

test('six consolidated chapters use native links and motion controls stay hidden without JavaScript', () => {
  const chapters = [...html.matchAll(/href="#([^"]+)" data-chapter="([^"]+)"/g)];
  assert.equal(chapters.length, 6);
  for (const [, href, id] of chapters) {
    assert.equal(href, id);
    assert(html.includes(`id="${id}"`));
  }
  assert.match(html, /<details class="chapter-menu">/);
  assert.match(html, /<div class="motion-choice" hidden>/);
  assert(html.indexOf('src="experience.js') < html.indexOf('src="script.js'));
});
