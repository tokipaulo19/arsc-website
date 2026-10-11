const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../cinematic.js'), 'utf8');

function fixture(width, height, reduced = false) {
  let reads = 0;
  const frames = [], events = {}, media = [];
  const window = { innerHeight: height, scrollY: 0, addEventListener(name, fn) { events[name] = fn; } };
  function node(top = 0, size = 160) {
    const classes = new Set();
    return {
      classList: { toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains(c) { return classes.has(c); }, add(c) { classes.add(c); }, remove(c) { classes.delete(c); } },
      style: { setProperty(k, v) { this[k] = v; } }, children: [], offsetWidth: width <= 640 ? 154 : 340,
      append(child) { this.children.push(child); }, setAttribute() {}, removeAttribute() { this.style = {}; },
      getBoundingClientRect() { reads++; return { top: top - window.scrollY, left: width / 2 - size / 2, width: size, height: size }; }
    };
  }
  const object = node(), word = node(), step = node(), hint = node();
  const chapters = Array.from({ length: 3 }, () => node());
  const cards = Array.from({ length: 4 }, () => node());
  const stage = node();
  stage.offsetHeight = height - (width <= 640 ? 76 : 88); stage.clientWidth = width;
  const story = node(height); story.offsetHeight = height * (width <= 640 ? 1.8 : 1.85);
  story.querySelector = selector => ({ '.cinematic-stage': stage, '.cinematic-object': object, '.cinematic-word': word, '.cinematic-step': step, '.cinematic-scroll-hint': hint })[selector];
  story.querySelectorAll = selector => selector === '.cinematic-chapter' ? chapters : cards;
  const hero = node(); hero.querySelector = () => node(height * .5, 100);
  const sections = Array.from({ length: 9 }, (_, i) => node(height + story.offsetHeight + i * 1000));
  let created = 0;
  const document = {
    body: node(), documentElement: { clientWidth: width, scrollHeight: height + story.offsetHeight + 10000 },
    fonts: { ready: { then() {} } },
    createElement(tag) { return tag === 'span' ? node() : node(height + story.offsetHeight + created++ * 1000 + (width <= 640 ? 26 : 34), width <= 640 ? 88 : 160); },
    querySelector(selector) { return selector === '.cinematic-story' ? story : selector === '.hero' ? hero : node(); },
    querySelectorAll() { return [hero, story, ...sections]; }
  };
  const matchMedia = query => {
    const m = { matches: query.includes('reduced') ? reduced : height <= 500, addEventListener(_, fn) { this.change = fn; } };
    media.push(m); return m;
  };
  vm.runInNewContext(source, { window, document, matchMedia, getComputedStyle: () => ({ top: width <= 640 ? '76px' : '88px' }), requestAnimationFrame: fn => { frames.push(fn); return frames.length; } });
  const flush = () => { while (frames.length) frames.shift()(); };
  flush();
  return { object, document, media, chapters, frames, events, flush, get reads() { return reads; }, scroll(y) { window.scrollY = y; events.scroll(); flush(); } };
}

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [360, 640]]) {
  test(`continuous reversible route at ${width}x${height}, with no scroll-time geometry reads`, () => {
    const f = fixture(width, height);
    assert(f.document.body.classList.contains('journey-enabled'));
    const before = f.reads;
    for (let y = 0; y <= 11000; y += 50) {
      f.scroll(y);
      assert.match(f.object.style.transform, /^translate3d/);
      assert(!/NaN|Infinity/.test(f.object.style.transform));
    }
    f.scroll(4000); const forward = f.object.style.transform;
    f.scroll(9000); f.scroll(4000);
    assert.equal(f.object.style.transform, forward);
    assert.equal(f.reads, before);
    f.media[0].matches = true; f.media[0].change();
    assert(!f.document.body.classList.contains('journey-enabled'));
    assert(f.chapters.every(chapter => chapter.inert === false));
  });
}
for (const [height, reduced] of [[844, true], [390, false]]) {
  test(`static fallback: height=${height}, reduced=${reduced}`, () => {
    const f = fixture(390, height, reduced);
    assert(!f.document.body.classList.contains('journey-enabled'));
    assert(!f.object.classList.contains('journey-object'));
    assert(f.chapters.every(chapter => chapter.inert === false));
    assert.equal(f.frames.length, 0);
  });
}
