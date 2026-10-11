const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../page-film.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../cinematic.css'), 'utf8');

function fixture(w, h) {
  let reads = 0, pose, clock = 0, frameId = 0;
  const frames = new Map(), events = {};
  const node = () => {
    const classes = new Set();
    return { style: {
    setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; },
    removeProperty(k) { delete this[k]; }
  }, classList: {
    toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
    contains(name) { return classes.has(name); }
  }, append() {}, setAttribute() {}, focus() { this.focused = true; } };
  };
  const panels = [320, 1250, 620].map(height => {
    const panel = node();
    Object.defineProperty(panel, 'offsetHeight', { get() { reads++; return height; } });
    return panel;
  });
  const sections = panels.map(panel => ({ ...node(), querySelector: () => panel }));
  const footer = node();
  const story = node(), document = { body: node(), documentElement: node(), createElement: node }, window = {
    scrollY: 0, location: { hash: '' }, scrollTo(value) { this.target = value.top; this.scrollY = value.top; },
    addEventListener(name, fn) { events[name] = fn; }
  };
  vm.runInNewContext(source, { window, document, performance: { now: () => clock },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); }, getComputedStyle: target => ({ overflowY: target.overflowY || 'visible' }) });
  const mobile = w <= 640, top = mobile ? 76 : 88;
  const metrics = { w, h, top, mobile, start: 1000, end: 1200 };
  const layoutY = section => {
    reads++;
    return 2000 + sections.slice(0, sections.indexOf(section)).reduce((sum, item) => sum + parseFloat(item.style['--film-span']), 0);
  };
  sections.forEach((section, i) => { section.id = `chapter-${i}`; });
  const main = { ...node(), querySelector: () => footer };
  const film = window.ARSCFilm.create({ sections, panels, story, main,
    surfaces: ['#f4f1ec', '#0b0b0c', '#f4f1ec'],
    beats: [{ peak: { x: 0, y: 0 } }, { peak: { x: -.12, y: -.06, rotate: -28 } }, { peak: { x: 0, y: 0 } }],
    place(...values) { pose = values; }, layoutY });
  film.configure(true); film.measure(metrics);
  return { film, sections, panels, story, footer, window, document, metrics, layoutY, get reads() { return reads; }, get pose() { return pose; },
    get frames() { return frames.size; },
    tick(ms) {
      const end = clock + ms;
      while (clock < end) {
        clock = Math.min(clock + 16, end);
        const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(clock));
        film.render(window.scrollY, metrics);
      }
    },
    event(name, props = {}) {
      const event = { cancelable: true, target: null, deltaX: 0, deltaY: 60, ...props,
        prevented: false, preventDefault() { this.prevented = true; } };
      events[name](event); return event;
    },
    render(scroll) { film.render(scroll, metrics); } };
}

test('stage keeps original anchors and viewport-fixed content with gesture playback', () => {
  assert.match(styles, /film-enabled \.journey-section > \.container\s*\{[^}]*position: fixed/);
  assert.match(styles, /scroll-margin-top: var\(--film-header/);
  assert.match(source, /addEventListener\?\.\('wheel'/);
  assert.match(source, /passive: false/);
});

test('film uses symmetric mobile gutters and retires inner reveal/glow layers', () => {
  assert.match(styles, /left: 20px; translate: none; width: calc\(100% - 40px\)/);
  assert.match(styles, /\.motion-ready \.journey-enabled\.film-enabled \.journey-section \.reveal,[\s\S]*?opacity: 1;[\s\S]*?transform: none;/);
  assert.match(styles, /\.service-card::before,[\s\S]*?\.process-step::after\s*\{\s*display: none;/);
  assert.match(styles, /\.film-playing .*will-change: transform, opacity;/s);
});

test('mobile viewport changes preserve a running scene cut and release compositor hints', () => {
  const f = fixture(390, 844);
  f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
  f.event('wheel'); f.tick(300);
  assert(f.document.body.classList.contains('film-playing'));
  f.metrics.h = 780; f.film.measure(f.metrics);
  assert(f.document.body.classList.contains('film-playing'));
  f.tick(900);
  assert.equal(f.window.scrollY, f.layoutY(f.sections[1]) - f.metrics.top);
  assert.equal(f.panels[1].inert, false);
  assert(!f.document.body.classList.contains('film-playing'));
  f.event('wheel'); f.tick(250);
  f.film.configure(false);
  assert(!f.document.body.classList.contains('film-playing'));
  assert.equal(f.frames, 0);
});

test('mobile remeasure preserves the reading fraction of a tall scene', () => {
  const f = fixture(390, 844);
  f.window.scrollY = f.layoutY(f.sections[1]) - f.metrics.top;
  f.event('wheel'); f.tick(300);
  f.metrics.h = 800; f.film.measure(f.metrics); f.tick(900);
  const read = 1250 - (800 - f.metrics.top - 48 - 32);
  assert.equal(parseFloat(f.panels[1].style['--film-read-y']), -read / 2);
  assert.equal(f.sections[1].style['--film-departure'], '0.0000');
});

test('one wheel gesture plays one complete transition without inertia skipping scenes', () => {
  const f = fixture(1440, 900);
  f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
  const target = f.layoutY(f.sections[1]) - f.metrics.top;
  const before = f.reads;
  assert(f.event('wheel').prevented);
  // One continuous wheel burst emits many events, not one event followed by
  // half a second of silence (which would be a deliberate new gesture).
  for (let event = 0; event < 30; event++) { f.tick(16); assert(f.event('wheel').prevented); }
  assert(f.window.scrollY < target);
  assert.equal(f.panels[0].style.visibility, 'visible');
  assert.equal(f.panels[1].style.visibility, 'visible');
  f.tick(320);
  assert.equal(f.window.scrollY, target);
  assert.equal(f.reads, before);
  assert.equal(f.panels[1].inert, false);
  assert(f.event('wheel').prevented);
  f.tick(1100);
  assert(f.window.scrollY > target, 'A fresh gesture after settling may read the next part');
});

for (const [w, h] of [[1440, 900], [390, 844]]) {
  test(`a fresh wheel gesture retargets unfinished playback immediately at ${w}x${h}`, () => {
    const f = fixture(w, h);
    const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
    const next = f.layoutY(f.sections[1]) - f.metrics.top;
    f.window.scrollY = anchor;
    f.event('wheel'); f.tick(180);
    const current = f.window.scrollY;
    assert(current < next);
    assert(f.event('wheel').prevented);
    assert.equal(f.window.scrollY, current, 'Retargeting must not teleport the camera');
    assert.equal(f.frames, 1, 'Replace the current animation; do not queue another');
    f.tick(w <= 640 ? 620 : 800);
    assert(f.window.scrollY > next, 'The new gesture must move beyond the original destination');
    assert.equal(f.sections[1].style['--film-departure'], '0.0000');
    assert.equal(f.panels[1].inert, false);
    assert(!f.document.body.classList.contains('film-playing'));
  });
}

test('a fresh mobile swipe advances during playback; a single swipe still advances only once', () => {
  const f = fixture(390, 844);
  f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
  const next = f.layoutY(f.sections[1]) - f.metrics.top;
  const swipe = () => {
    f.event('pointerdown', { pointerType: 'touch' });
    f.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }] });
    assert(f.event('touchmove', { touches: [{ clientX: 102, clientY: 540 }] }).prevented);
    assert(f.event('touchmove', { touches: [{ clientX: 102, clientY: 350 }] }).prevented);
    f.event('touchend');
  };
  swipe(); f.tick(100);
  assert(f.window.scrollY < next);
  swipe(); f.tick(620);
  assert(f.window.scrollY > next);
  assert.equal(f.sections[1].style['--film-departure'], '0.0000');
});

test('a touch tap or mouse click still cancels an unfinished cut', () => {
  for (const pointerType of ['touch', 'mouse']) {
    const f = fixture(390, 844);
    f.event('wheel'); f.tick(160);
    f.event('pointerdown', { pointerType });
    if (pointerType === 'touch') {
      f.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }] });
      f.event('touchend');
    }
    const current = f.window.scrollY;
    f.tick(620);
    assert.equal(f.window.scrollY, current);
    assert.equal(f.frames, 0);
  }
});

test('pinch/multi-touch gestures cancel playback and remain native', () => {
  const f = fixture(390, 844);
  f.event('wheel'); f.tick(160);
  const current = f.window.scrollY;
  f.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }, { clientX: 200, clientY: 600 }] });
  assert(!f.event('touchmove', { touches: [{ clientX: 90, clientY: 550 }, { clientX: 210, clientY: 550 }] }).prevented);
  f.tick(620);
  assert.equal(f.window.scrollY, current);
  assert.equal(f.frames, 0);
});

test('reverse wheel input reverses a running cut, and keyboard input cancels playback', () => {
  const f = fixture(1440, 900);
  const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
  f.window.scrollY = anchor;
  f.event('wheel'); f.tick(400);
  f.event('wheel', { deltaY: -60 }); f.tick(1100);
  assert.equal(f.window.scrollY, anchor);
  f.tick(250); f.event('wheel'); f.tick(200);
  const interrupted = f.window.scrollY;
  f.event('keydown'); f.tick(1100);
  assert.equal(f.window.scrollY, interrupted);
  assert.equal(f.frames, 0);
});

test('touch swipe advances once and multi-touch/controls/nested scrolling stay native', () => {
  const f = fixture(390, 844);
  const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
  const next = f.layoutY(f.sections[1]) - f.metrics.top;
  f.window.scrollY = anchor;
  f.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }] });
  assert(f.event('touchmove', { touches: [{ clientX: 102, clientY: 540 }] }).prevented);
  assert(f.event('touchmove', { touches: [{ clientX: 102, clientY: 300 }] }).prevented);
  f.tick(1100);
  assert.equal(f.window.scrollY, next);
  f.event('touchend');
  const nested = { scrollHeight: 900, clientHeight: 300, scrollTop: 10, overflowY: 'auto' };
  assert(!f.event('wheel', { target: nested }).prevented);
  assert(!f.event('wheel', { ctrlKey: true }).prevented);
  assert(!f.event('wheel', { deltaX: 80 }).prevented);
  assert(!f.event('wheel', { target: { closest: () => ({}) } }).prevented);
  f.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }, { clientX: 200, clientY: 600 }] });
  assert(!f.event('touchmove', { touches: [{ clientX: 100, clientY: 400 }] }).prevented);
  f.film.configure(false);
  assert(!f.event('wheel').prevented);
});

test('long scenes expose every reading page before advancing to the next scene', () => {
  const f = fixture(390, 844);
  const anchor = f.layoutY(f.sections[1]) - f.metrics.top;
  f.window.scrollY = anchor;
  f.event('wheel'); f.tick(1100);
  const available = f.metrics.h - f.metrics.top - 48 - 32;
  const read = 1250 - available;
  assert.equal(parseFloat(f.panels[1].style['--film-read-y']), -read / 2);
  f.tick(250); f.event('wheel'); f.tick(1100);
  assert.equal(parseFloat(f.panels[1].style['--film-read-y']), -read);
  assert.equal(f.sections[1].style['--film-departure'], '0.0000');
  f.tick(250); f.event('wheel'); f.tick(1100);
  assert.equal(f.window.scrollY, f.layoutY(f.sections[2]) - f.metrics.top);
});

test('hash navigation and disabling cinematic mode stop an in-flight playback', () => {
  const f = fixture(1440, 900);
  f.event('wheel'); f.tick(200);
  f.window.location.hash = '#chapter-1'; f.film.alignHash();
  const target = f.window.scrollY;
  f.tick(1100); assert.equal(f.window.scrollY, target);
  f.tick(250); f.event('wheel'); f.tick(200);
  f.film.configure(false);
  const disabled = f.window.scrollY;
  f.tick(1100); assert.equal(f.window.scrollY, disabled);
});

test('opening the home page does not auto-advance to an unnamed chapter', () => {
  const f = fixture(1440, 900);
  f.sections[0].id = '';
  f.film.alignHash();
  assert.equal(f.window.target, undefined);
  f.render(2500); f.render(0);
  assert.equal(f.story.style['--film-intro-exit'], '0.0000', 'Returning above the stage must restore the opening story');
});

for (const [w, h] of [[1440, 900], [768, 1024], [390, 844], [360, 640]]) {
  test(`gesture playback finishes at the faster device-specific timing at ${w}x${h}`, () => {
    const f = fixture(w, h);
    const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
    const target = f.layoutY(f.sections[1]) - f.metrics.top;
    const duration = w <= 640 ? 620 : 800;
    f.window.scrollY = anchor;
    f.event('wheel'); f.tick(duration - 16);
    assert(f.document.body.classList.contains('film-playing'));
    assert(f.window.scrollY < target);
    f.tick(16);
    assert.equal(f.window.scrollY, target);
    assert(!f.document.body.classList.contains('film-playing'));
    assert.equal(f.panels[1].inert, false);
    assert.equal(f.frames, 0);
    f.event('wheel', { deltaY: -60 }); f.tick(duration);
    assert.equal(f.window.scrollY, anchor);
  });
  test(`short scenes centre below the navigation, including focus and resize at ${w}x${h}`, () => {
    const f = fixture(w, h);
    const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
    f.render(anchor);
    const margin = w <= 640 ? 24 : 36;
    const centre = (h - f.metrics.top - 320) / 2 - margin;
    assert.equal(parseFloat(f.panels[0].style['--film-y']), centre);
    assert.equal(parseFloat(f.panels[0].style['--film-read-y']), centre);
    f.window.location.hash = '#chapter-0'; f.film.alignHash(); f.render(anchor);
    assert(f.panels[0].focused);
    assert.equal(parseFloat(f.panels[0].style['--film-read-y']), centre);
    f.metrics.h += 100; f.film.measure(f.metrics); f.render(anchor);
    assert.equal(parseFloat(f.panels[0].style['--film-y']), centre + 50);
  });
  test(`adjacent scenes coexist on the stage and reverse exactly at ${w}x${h}`, () => {
    const f = fixture(w, h);
    const nextAnchor = f.layoutY(f.sections[1]) - f.metrics.top;
    const transition = h * (w <= 640 ? .48 : .52);
    const before = f.reads;
    const midway = nextAnchor - transition * .5;
    f.render(midway);
    assert.equal(f.panels[0].style.visibility, 'visible');
    assert.equal(f.panels[1].style.visibility, 'visible');
    assert.equal(f.panels[0].style['--film-alpha'], '1.0000');
    assert.equal(f.panels[1].style['--film-alpha'], '1.0000');
    assert.equal(f.sections[0].style['--film-departure'], '0.5000');
    assert.equal(f.sections[1].style['--film-arrival'], '0.5000');
    assert(f.pose[4] > .8 - .001, 'The oversized logo accompanies the shared cut');
    const snapshot = JSON.stringify(f.panels.map(panel => panel.style));
    f.render(nextAnchor + 1000); f.render(midway);
    assert.equal(JSON.stringify(f.panels.map(panel => panel.style)), snapshot);
    assert.equal(f.reads, before, 'The playhead must use cached geometry');
    if (w <= 640) assert(f.panels.every(panel => panel.style['--film-x'] === '0.0000px'));
    f.render(nextAnchor);
    assert.equal(f.panels[1].style['--film-y'], '0.0000px');
    assert.equal(f.panels[1].style['--film-scale'], '1.0000');
    assert.equal(f.panels[1].inert, false);
    assert.equal(f.panels[0].inert, true);
    // A tall scene exposes its final content before the transition begins,
    // then leaves a reading hold instead of cutting away immediately.
    const margin = w <= 640 ? 24 : 36;
    const read = 1250 - (h - f.metrics.top - margin * 2 - 32);
    f.render(nextAnchor + read + h * .28 * .5);
    assert.equal(parseFloat(f.panels[1].style['--film-read-y']), -read);
    assert.equal(f.sections[1].style['--film-departure'], '0.0000');
    assert.equal(f.footer.style.visibility, 'hidden', 'The footer must not cover unfinished content');
    const finalAnchor = f.layoutY(f.sections[2]) - f.metrics.top;
    const lastRead = Math.max(0, 620 - (h - f.metrics.top - margin * 2 - 32));
    f.render(finalAnchor + lastRead + h * .28 + transition);
    assert.equal(f.footer.style.visibility, 'visible');
    assert.equal(f.footer.inert, false);
    assert.equal(f.document.body.style['--film-footer-phase'], '1.0000');
    f.window.location.hash = '#chapter-1'; f.film.alignHash();
    assert.equal(f.window.target, nextAnchor, 'Direct navigation must settle on the original section anchor');
    f.render(nextAnchor);
    assert.equal(f.panels[1].focused, true, 'Keyboard scrolling must leave a hidden footer and reach the selected chapter');
    f.film.configure(false);
    assert(f.panels.every(panel => panel.inert === false && panel.style.visibility === ''));
    assert(f.sections.every(section => !section.style['--film-span']));
  });
}
