const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../cinematic.js'), 'utf8');
const styles = fs.readFileSync(require('node:path').join(__dirname, '../cinematic.css'), 'utf8');

test('journey layers protect content without reducing the travelling mark', () => {
  assert.match(styles, /\.journey-enabled main\s*\{\s*z-index:\s*auto;/);
  assert.match(styles, /\.journey-enabled \.hero, \.journey-enabled \.scroll-scene\s*\{\s*isolation:\s*auto;\s*z-index:\s*auto;/);
  assert.match(styles, /\.journey-enabled \.hero\.scroll-scene > \.hero-grid\s*\{\s*z-index:\s*auto;/);
  assert.match(styles, /\.journey-enabled \.hero-copy\s*\{[^}]*z-index:\s*20;/);
  assert.match(styles, /\.cinematic-object\.journey-object\s*\{[^}]*z-index:\s*10;/);
  assert.match(styles, /\.journey-enabled \.journey-section > \.container\s*\{[^}]*z-index:\s*20;[^}]*opacity:\s*1;/);
  assert.match(styles, /\.journey-enabled \.cinematic-stage\s*\{\s*z-index:\s*20;\s*background:\s*transparent;/);
  assert.match(styles, /\.journey-enabled \.journey-section > \.container::before\s*\{[^}]*--journey-surface/);
  assert.match(styles, /\.motion-ready \.journey-enabled \.journey-section > \.container,/);
  assert.match(styles, /\.journey-enabled \.journey-section > \.container\s*\{[^}]*perspective\(1800px\)/);
  assert.match(styles, /\.journey-section:focus-within > \.container\s*\{\s*transform: none;/);
  assert.match(styles, /\.journey-enabled \.movie-bridge\s*\{[^}]*z-index:\s*4;[^}]*linear-gradient/);
  assert(!styles.includes('--movie-copy-shift'));
  assert(!styles.includes('--movie-wipe'));
});

function fixture(width, height, reduced = false) {
  let reads = 0;
  const frames = [], events = {}, media = [];
  const window = { innerHeight: height, scrollY: 0, addEventListener(name, fn) { events[name] = fn; } };
  function node(top = 0, size = 160) {
    const classes = new Set();
    return {
      classList: { toggle(c, on) { on ? classes.add(c) : classes.delete(c); }, contains(c) { return classes.has(c); }, add(c) { classes.add(c); }, remove(c) { classes.delete(c); } },
      style: { setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; } }, children: [], offsetWidth: width <= 640 ? 154 : 340,
      get offsetTop() { reads++; return top; }, offsetParent: null, offsetHeight: size,
      append(child) { this.children.push(child); }, setAttribute() {}, removeAttribute() { this.style = {}; },
      getBoundingClientRect() { reads++; return { top: top - window.scrollY, left: width / 2 - size / 2, width: size, height: size }; }
    };
  }
  const object = node(), word = node(), step = node(), hint = node(), main = node();
  const chapters = Array.from({ length: 3 }, () => node());
  const cards = Array.from({ length: 4 }, () => node());
  const stage = node();
  stage.offsetHeight = height - (width <= 640 ? 76 : 88); stage.clientWidth = width;
  const story = node(height); story.offsetHeight = height * (width <= 640 ? 1.8 : 1.85);
  story.querySelector = selector => ({ '.cinematic-stage': stage, '.cinematic-object': object, '.cinematic-word': word, '.cinematic-step': step, '.cinematic-scroll-hint': hint })[selector];
  story.querySelectorAll = selector => selector === '.cinematic-chapter' ? chapters : cards;
  const hero = node(); hero.querySelector = () => node(height * .5, 100);
  const sections = Array.from({ length: 9 }, (_, i) => {
    const sectionTop = height + story.offsetHeight + i * 1000;
    const section = node(sectionTop); section.offsetHeight = 1000;
    const panel = node(sectionTop + 340), heading = node(sectionTop + 340);
    section.pieces = Array.from({ length: 3 }, (_, j) => node(sectionTop + 440 + j * 200));
    section.querySelector = selector => selector === '.container' ? panel : heading;
    section.querySelectorAll = () => section.pieces;
    return section;
  });
  let created = 0;
  const document = {
    body: node(), documentElement: { clientWidth: width, scrollHeight: height + story.offsetHeight + 10000 },
    fonts: { ready: { then() {} } },
    createElement(tag) { return tag === 'span' ? node() : node(height + story.offsetHeight + created++ * 1000 + (width <= 640 ? 26 : 34), width <= 640 ? 88 : 160); },
    querySelector(selector) { return selector === '.cinematic-story' ? story : selector === '.hero' ? hero : main; },
    querySelectorAll() { return [hero, story, ...sections]; }
  };
  const matchMedia = query => {
    const m = { matches: query.includes('reduced') ? reduced : height <= 500, addEventListener(_, fn) { this.change = fn; } };
    media.push(m); return m;
  };
  vm.runInNewContext(source, { window, document, matchMedia, getComputedStyle: () => ({ top: width <= 640 ? '76px' : '88px' }), requestAnimationFrame: fn => { frames.push(fn); return frames.length; } });
  const flush = () => { while (frames.length) frames.shift()(); };
  flush();
  return { object, document, main, story, sections, media, chapters, frames, events, flush, get reads() { return reads; }, scroll(y) { window.scrollY = y; events.scroll(); flush(); } };
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
      if (y > height * 3.5) {
        const size = Number(f.object.style.transform.match(/scale\(([\d.]+)\)/)[1]) * (width <= 640 ? 154 : 340);
        assert(size >= (width <= 640 ? 145 : Math.min(309, width * .32 - 1)), 'The logo must not shrink back into a tiny side badge');
      }
    }
    f.scroll(4000); const forward = f.object.style.transform, opacity = f.object.style.opacity;
    f.scroll(9000); f.scroll(4000);
    assert.equal(f.object.style.transform, forward);
    assert.equal(f.object.style.opacity, opacity);
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

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`section cameras and staggered content settle for reading at ${width}x${height}`, () => {
    const f = fixture(width, height), section = f.sections[1];
    const sectionTop = height + height * (width <= 640 ? 1.8 : 1.85) + 1000;
    const mid = (sectionTop - height * .92 + sectionTop + 340 - Math.max((width <= 640 ? 76 : 88) + 60, height * .42)) / 2;
    const reads = f.reads;
    f.scroll(mid);
    assert.equal(section.style.getPropertyValue('--movie-entry'), '0.5000');
    assert(Number(section.pieces[0].style.getPropertyValue('--piece-entry')) > 0, 'Cards enter separately from the section camera');
    const pose = section.style.getPropertyValue('--movie-entry');
    f.scroll(sectionTop + 100);
    assert.equal(section.style.getPropertyValue('--movie-entry'), '0.0000');
    assert.equal(section.style.getPropertyValue('--movie-exit'), '0.0000');
    assert.equal(f.main.children[1].style.getPropertyValue('--bridge-center'), '44.0000');
    assert.equal(section.pieces[0].style.getPropertyValue('--piece-entry'), '0.0000');
    f.scroll(mid);
    assert.equal(section.style.getPropertyValue('--movie-entry'), pose);
    assert.equal(f.reads, reads, 'Section choreography must not measure layout while scrolling');
    if (width <= 640) {
      assert.equal(section.style.getPropertyValue('--camera-x'), '0px');
      assert.equal(section.style.getPropertyValue('--camera-roll'), '0deg');
      assert.equal(section.style.getPropertyValue('--camera-pitch'), '0deg');
    }
  });
  test(`backgrounds and both content cameras share each handoff at ${width}x${height}`, () => {
    const f = fixture(width, height), mobile = width <= 640;
    assert.equal(f.main.children.length, 9);
    const reads = f.reads, band = Math.min(height * (mobile ? .24 : .3), mobile ? 210 : 330);
    f.sections.forEach((section, i) => {
      const boundary = height + height * (mobile ? 1.8 : 1.85) + i * 1000;
      const bridge = f.main.children[i];
      assert.equal(bridge.className, 'movie-bridge');
      assert(Math.abs(parseFloat(bridge.style.top) + band - boundary) < .001);
      assert.equal(parseFloat(bridge.style.height), band * 2);
      const start = boundary - height * .92;
      const end = boundary + 340 - Math.max((mobile ? 76 : 88) + 60, height * .42);
      for (const fraction of [.25, .5, .75]) {
        const position = start + (end - start) * fraction;
        f.scroll(position);
        const incoming = Number(section.style.getPropertyValue('--movie-entry'));
        const outgoing = Number((i ? f.sections[i - 1] : f.story).style.getPropertyValue('--movie-exit'));
        assert(Math.abs(incoming + outgoing - 1) < .0001, `Shared clock at boundary ${i + 1}`);
        assert(Math.abs(Number(bridge.style.getPropertyValue('--bridge-center')) - (56 - outgoing * 12)) < .001);
        const pose = incoming;
        f.scroll(position + 1000); f.scroll(position);
        assert.equal(Number(section.style.getPropertyValue('--movie-entry')), pose);
      }
    });
    assert.equal(f.reads, reads);
  });
  test(`distinct camera beats remain continuous at ${width}x${height}`, () => {
    const f = fixture(width, height), mobile = width <= 640;
    const storyH = height * (mobile ? 1.8 : 1.85), end = storyH;
    const top = mobile ? 76 : 88, portSize = mobile ? 88 : 160;
    const poses = [], centered = [];
    const values = () => f.object.style.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
    for (let i = 0; i < 9; i++) {
      const worldY = height + storyH + i * 1000 + (mobile ? 26 : 34) + portSize / 2;
      const dock = worldY - height * .5;
      const entrance = dock - Math.min(height * .3, (dock - (i ? dock - 1000 : end)) * .34);
      const peak = entrance + (dock - entrance) * .52;
      const hold = Math.max(dock + 1, worldY - Math.max(top + (mobile ? 96 : 160), height * .28));
      const nextDock = i < 8 ? dock + 1000 : storyH + 10000;
      const exit = hold + Math.min(height * .13, Math.max(1, nextDock - hold) * .25);
      f.scroll(peak);
      poses.push(f.object.style.transform);
      if ([2, 6, 8].includes(i)) centered.push(Number(f.object.style.transform.match(/translate3d\(([\d.-]+)px/)[1]));
      for (const point of [entrance, peak, dock, hold, exit]) {
        f.scroll(point - .001); const before = values();
        f.scroll(point + .001); const after = values();
        assert(after.every((value, j) => Math.abs(value - before[j]) < .2), `No snapping at chapter ${i + 1}`);
      }
    }
    assert.equal(new Set(poses).size, 9, 'Each chapter must have a distinct camera pose');
    assert(centered.every(x => Math.abs(x - width / 2) < .02), 'Zoom chapters must not sweep sideways');
    assert.equal(Number(poses[5].match(/rotate\(([\d.-]+)deg\)/)[1]), mobile ? 13.2 : 110);
  });
}
