const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../page-film.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../cinematic.css'), 'utf8');

test('keyboard focus reveals lower controls without changing the scene or selected artwork', () => {
  const f = fixture(390, 844, 3, 1, 'reporting', true);
  const panel = f.panels[1];
  const target = { getBoundingClientRect: () => ({ top: 850, bottom: 896, height: 46 }) };
  panel.contains = node => node === target;
  panel.inert = false;
  f.window.scrollY = f.layoutY(f.sections[1]) - f.metrics.top;
  const before = f.window.scrollY;
  f.event('focusin', { target });
  assert.equal(panel.style['--film-focus-y'], '-72.0000px');
  assert.equal(f.window.scrollY, before);
  assert.equal(f.frames, 0);
  target.getBoundingClientRect = () => ({ top: 30, bottom: 76, height: 46 });
  f.event('focusin', { target });
  assert.equal(panel.style['--film-focus-y'], '-14.0000px');
  assert.match(styles, /calc\(var\(--film-read-y, 0px\) \+ var\(--film-focus-y, 0px\)\)/);
  f.event('focusout', { target, relatedTarget: {} });
  assert.equal(panel.style['--film-focus-y'], undefined);
  panel.style.setProperty('--film-focus-y', '-72px');
  f.film.configure(false);
  assert.equal(panel.style['--film-focus-y'], undefined);
});

test('focus handling does not move hidden scenes, panel landmarks or already visible controls', () => {
  const f = fixture(390, 844);
  const panel = f.panels[1];
  const target = { getBoundingClientRect: () => ({ top: 150, bottom: 196, height: 46 }) };
  panel.contains = node => node === target || node === panel;
  f.event('focusin', { target });
  assert.equal(panel.style['--film-focus-y'], undefined);
  panel.inert = true;
  target.getBoundingClientRect = () => ({ top: 900, bottom: 944, height: 44 });
  f.event('focusin', { target });
  f.event('focusin', { target: panel });
  assert.equal(panel.style['--film-focus-y'], undefined);
});

test('starting gallery playback preserves a focused selection control but releases a panel landmark', () => {
  const f = fixture(390, 844, 3, 1, 'reporting');
  let blurred = 0;
  const control = { blur() { blurred++; } };
  f.panels[1].contains = node => node === control;
  f.document.activeElement = control;
  f.window.scrollY = f.layoutY(f.sections[1]) - f.metrics.top;
  f.film.selectProject(f.panels[1], 2);
  assert.equal(blurred, 0);
  f.panels[1].blur = () => blurred++;
  f.document.activeElement = f.panels[1];
  f.film.selectProject(f.panels[1], 1);
  assert.equal(blurred, 1);
});

test('mode switches preserve a tall chapter reading point and cancel active playback', () => {
  const f = fixture(390, 844);
  f.window.scrollY = 3200;
  const position = f.film.capturePosition();
  assert(position && position.section);
  f.event('wheel');
  assert(f.frames > 0);
  f.film.configure(false);
  assert.equal(f.frames, 0);
  f.film.configure(true);
  f.film.measure(f.metrics);
  assert.equal(f.film.restorePosition(position), true);
  const restored = f.film.capturePosition();
  assert.equal(restored.section, position.section);
  assert(Math.abs(restored.fraction - position.fraction) < .001);
});

test('scrolling inside the chapter menu never starts a cinematic cut', () => {
  const f = fixture(390, 844);
  f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
  const target = { closest: selector => selector.includes('.chapter-menu') ? {} : null };
  assert.equal(f.event('wheel', { target }).prevented, false);
  assert.equal(f.frames, 0);
});

test('settled reading positions survive viewport and project-panel reflow', () => {
  const f = fixture(390, 844, 11);
  f.window.scrollY = f.layoutY(f.sections[6]) - f.metrics.top;
  f.render(f.window.scrollY);
  const before = f.film.capturePosition();
  f.metrics.h = 640; f.metrics.w = 320;
  // Browser scroll anchoring may adjust scrollY before the resize callback.
  f.window.scrollY -= 350;
  f.film.measure(f.metrics);
  const after = f.film.capturePosition();
  assert.equal(after.section, before.section);
  assert.equal(after.fraction, before.fraction);
});

test('old section anchors resolve to their consolidated chapter', () => {
  const f = fixture(390, 844, 6);
  f.document.getElementById = id => id === 'about' ? { closest: () => f.sections[4] } : null;
  f.window.location.hash = '#about';
  f.film.alignHash();
  assert.equal(f.window.scrollY, f.layoutY(f.sections[4]) - f.metrics.top);
});

function fixture(w, h, count = 3, galleryScene = -1, galleryType = 'creative', sharedClock = false) {
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
  const panels = Array.from({ length: count }, (_, i) => [320, 1250, 620][i % 3]).map(height => {
    const panel = node();
    Object.defineProperty(panel, 'offsetHeight', { get() { reads++; return height; } });
    return panel;
  });
  const sections = panels.map(panel => ({ ...node(), querySelector: () => panel }));
  const choices = [], progresses = [];
  if (galleryScene >= 0) {
    panels[galleryScene].dataset = { showcase: galleryType };
    panels[galleryScene].ARSCShowcase = { count: galleryType === 'reporting' ? 3 : galleryType === 'websites' ? 6 : 9,
      setIndex(index) { choices.push(index); },
      setProgress(progress) { progresses.push(progress); choices.push(Math.round(progress)); } };
  }
  const footer = node();
  const created = [];
  const story = node(), document = { body: node(), documentElement: node(), createElement() {
    const element = node(); created.push(element); return element;
  } }, window = {
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
    surfaces: sections.map((_, i) => ['#f4f1ec', '#0b0b0c', '#f4f1ec'][i % 3]),
    beats: sections.map((_, i) => [{ peak: { x: 0, y: 0 } }, { peak: { x: -.12, y: -.06, rotate: -28 } }, { peak: { x: 0, y: 0 } }][i % 3]),
    place(...values) { pose = values; }, layoutY,
    onFrame: sharedClock ? () => film.render(film.position, metrics) : undefined });
  film.configure(true); film.measure(metrics);
  return { film, sections, panels, story, footer, screen: created[0], screenNext: created[1], window, document, metrics, layoutY, choices, progresses, get reads() { return reads; }, get pose() { return pose; },
    get frames() { return frames.size; },
    tick(ms) {
      const end = clock + ms;
      while (clock < end) {
        clock = Math.min(clock + 16, end);
        const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(clock));
        film.render(film.position, metrics);
      }
    },
    event(name, props = {}) {
      const event = { cancelable: true, target: null, deltaX: 0, deltaY: 60, ...props,
        prevented: false, preventDefault() { this.prevented = true; } };
      events[name](event); return event;
    },
    render(scroll) { film.render(scroll, metrics); } };
}

test('phone background crossfade changes only opacity within a cut and reverses exactly', () => {
  const f = fixture(390, 844);
  const anchor = f.layoutY(f.sections[1]) - f.metrics.top;
  const transition = f.metrics.h * .48;
  f.render(anchor - transition * .75);
  const colours = [f.screen.style['--film-colour'], f.screenNext.style['--film-colour']];
  assert.deepEqual(colours, ['#f4f1ec', '#0b0b0c']);
  let paints = 0;
  for (const layer of [f.screen, f.screenNext]) {
    const original = layer.style.setProperty;
    layer.style.setProperty = function (...args) { paints++; original.apply(this, args); };
  }
  const reads = f.reads;
  f.render(anchor - transition * .5);
  assert.equal(f.screenNext.style.opacity, '0.5000');
  const middle = f.screenNext.style.opacity;
  f.render(anchor - transition * .25);
  assert(parseFloat(f.screenNext.style.opacity) > .5);
  f.render(anchor - transition * .5);
  assert.equal(f.screenNext.style.opacity, middle);
  assert.equal(paints, 0, 'No viewport background colour or glow repaint writes within the cut');
  assert.equal(f.reads, reads);
  f.render(anchor);
  assert.equal(f.screen.style['--film-colour'], '#0b0b0c');
  assert.equal(f.screenNext.style.opacity, '0');
});

test('desktop retains its existing colour interpolation and has no extra background layer', () => {
  const f = fixture(1440, 900);
  const anchor = f.layoutY(f.sections[1]) - f.metrics.top;
  f.render(anchor - f.metrics.h * .52 * .5);
  assert.match(f.screen.style['--film-colour'], /^rgb\(/);
  assert.equal(f.screenNext.style.opacity, undefined);
  assert.match(styles, /\.film-screen-next \{ display: none; \}/);
});

test('shared mobile clock renders every frame and scrolls the document only at completion', () => {
  const f = fixture(390, 844, 3, -1, 'creative', true);
  const start = f.layoutY(f.sections[0]) - f.metrics.top;
  f.window.scrollY = start; f.render(start);
  let commits = 0;
  const scrollTo = f.window.scrollTo;
  f.window.scrollTo = value => { commits++; scrollTo(value); };
  const reads = f.reads;
  f.event('wheel'); f.tick(160);
  assert.equal(commits, 0);
  assert.equal(f.window.scrollY, start);
  assert(f.film.position > start);
  assert.equal(f.reads, reads);
  f.tick(620);
  assert.equal(commits, 1);
  assert.equal(f.window.scrollY, f.film.position);
  assert.equal(f.frames, 0);
});

test('shared phone playback reverses from its visible pose and commits on interruption', () => {
  const f = fixture(390, 844, 3, -1, 'creative', true);
  const start = f.layoutY(f.sections[0]) - f.metrics.top;
  f.window.scrollY = start; f.render(start);
  f.event('wheel'); f.tick(240);
  const visible = f.film.position;
  f.event('wheel', { deltaY: -60 });
  assert.equal(f.film.position, visible);
  f.tick(96);
  assert(f.film.position < visible);
  const interrupted = f.film.position;
  f.event('keydown');
  assert.equal(f.window.scrollY, interrupted);
  assert.equal(f.frames, 0);
});

test('shared gallery clock supports retargeting, resize and all artwork without per-frame native scroll', () => {
  const f = fixture(390, 844, 3, 0, 'creative', true);
  f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
  f.render(f.window.scrollY);
  f.film.selectProject(f.panels[0], 8); f.tick(48);
  const visible = f.film.position;
  f.film.selectProject(f.panels[0], 2);
  assert.equal(f.film.position, visible);
  f.metrics.h = 760; f.film.measure(f.metrics); f.tick(700);
  assert.equal(f.choices.at(-1), 2);
  assert.equal(f.frames, 0);
  f.film.selectProject(f.panels[0], 8); f.tick(220);
  assert.equal(f.choices.at(-1), 8);
});

test('only hidden phone galleries suspend their compositor hints', () => {
  for (const [w, h] of [[390, 844], [1440, 1000]]) {
    const f = fixture(w, h, 3, 0);
    let suspended = 0;
    f.panels[0].ARSCShowcase.suspend = () => suspended++;
    f.render(f.layoutY(f.sections[0]) - f.metrics.top);
    assert.equal(suspended, 0);
    f.render(f.layoutY(f.sections[2]) - f.metrics.top);
    assert.equal(suspended, w <= 640 ? 1 : 0);
  }
});

test('gallery retargeting does not tear down playback styling between touch updates', () => {
  const f = fixture(390, 844, 3, 0, 'creative', true);
  f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
  const toggles = [];
  const toggle = f.document.body.classList.toggle;
  f.document.body.classList.toggle = (name, on) => {
    if (name === 'film-playing') toggles.push(on);
    toggle(name, on);
  };
  f.film.selectProject(f.panels[0], 2); f.tick(40);
  f.film.selectProject(f.panels[0], 5); f.tick(40);
  assert(!toggles.includes(false));
  f.tick(200);
  assert.equal(toggles.at(-1), false);
});

test('hidden scene poses receive no repeated writes and refresh exactly on reverse re-entry', () => {
  const f = fixture(390, 844, 9);
  const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
  f.render(anchor);
  const hidden = f.panels[8];
  let writes = 0;
  const set = hidden.style.setProperty;
  hidden.style.setProperty = function (...args) { writes++; return set.apply(this, args); };
  for (let step = 0; step < 40; step++) f.render(anchor + step);
  assert.equal(writes, 0);
  const endAnchor = f.layoutY(f.sections[8]) - f.metrics.top;
  f.render(endAnchor);
  assert.equal(hidden.style.visibility, 'visible');
  assert.equal(hidden.style['--film-scale'], '1.0000');
  assert.equal(hidden.inert, false);
  assert(writes > 0);
  const pose = hidden.style['--film-y'];
  f.render(anchor); f.render(endAnchor);
  assert.equal(hidden.style['--film-y'], pose);
});

test('opening logo handoff matches position size rotation and opacity exactly in both directions', () => {
  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const f = fixture(w, h);
    f.metrics.introPose = { x: w / 2, y: f.metrics.top + (h - f.metrics.top) * (w <= 640 ? .655 : .63), size: w <= 640 ? 103.18 : 197.2 };
    const expected = [f.metrics.introPose.x, f.metrics.introPose.y, f.metrics.introPose.size, 0, 1, 0, 0];
    f.render(f.metrics.end);
    assert.deepEqual(f.pose, expected);
    f.render(f.metrics.end + .01);
    assert(f.pose.every((value, i) => Math.abs(value - expected[i]) < .01));
    f.render(2200); f.render(f.metrics.end);
    assert.deepEqual(f.pose, expected);
  }
});

test('opening skips the centre stop and docks directly at the side without another flyover', () => {
  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const f = fixture(w, h);
    f.metrics.introPose = { x: w * .84, y: f.metrics.top + (h - f.metrics.top) * .58, size: w <= 640 ? 170 : 330, opacity: .12 };
    const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
    const expected = [f.metrics.introPose.x, f.metrics.introPose.y, f.metrics.introPose.size, 0, .12, 0, 0];
    for (let step = 0; step <= 10; step++) {
      f.render(f.metrics.end + (anchor - f.metrics.end) * step / 10);
      assert.deepEqual(f.pose, expected);
    }
    f.window.scrollY = f.metrics.start + (f.metrics.end - f.metrics.start) * .4;
    f.event('wheel'); f.tick(800);
    if (w <= 640) {
      assert.equal(f.window.scrollY, f.metrics.start + (f.metrics.end - f.metrics.start) * .82,
        'The phone presents the closing opening beat before the Services handoff');
      f.event('wheel'); f.tick(1000);
    }
    assert.equal(f.window.scrollY, anchor, 'The next gesture goes to Services, not a centre-logo stop');
    f.event('wheel', { deltaY: -60 }); f.tick(1000);
    if (w <= 640) {
      assert.equal(f.window.scrollY, f.metrics.start + (f.metrics.end - f.metrics.start) * .82);
      f.event('wheel', { deltaY: -60 }); f.tick(800);
    }
    assert.equal(f.window.scrollY, f.metrics.start + (f.metrics.end - f.metrics.start) * .4);
  }
});

test('phone opening handoff gets its own pacing and remains interruptible', () => {
  const f = fixture(390, 844);
  const closing = f.metrics.start + (f.metrics.end - f.metrics.start) * .82;
  const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
  f.window.scrollY = closing;
  f.event('wheel'); f.tick(620);
  assert(f.frames > 0, 'The opening handoff should not rush through in the normal cut duration');
  assert(f.window.scrollY > closing && f.window.scrollY < anchor);
  f.event('wheel', { deltaY: -60 }); f.tick(1000);
  assert.equal(f.window.scrollY, closing, 'Reverse input still responds before the handoff finishes');
  f.event('wheel'); f.tick(1000);
  assert.equal(f.window.scrollY, anchor);
  assert.equal(f.frames, 0);
});

test('all galleries scrub continuously and complete each project move in the shorter timing', () => {
  for (const type of ['creative', 'reporting', 'websites']) {
    for (const [w, h] of [[1440, 1000], [390, 844]]) {
      const f = fixture(w, h, 3, 0, type), duration = w <= 640 ? 180 : 220;
      f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
      f.event('wheel'); f.tick(32);
      assert(f.progresses.at(-1) > 0 && f.progresses.at(-1) < 1, 'Images move on the first frames, not after the midpoint');
      f.tick(duration - 32);
      assert(Math.abs(f.progresses.at(-1) - 1) < .0001);
      assert(!f.document.body.classList.contains('film-playing'));
      f.event('wheel'); f.tick(duration);
      assert.equal(f.choices.at(-1), 2);
      if (type === 'reporting') {
        f.event('wheel'); f.tick(800);
        assert.equal(f.window.scrollY, f.layoutY(f.sections[1]) - f.metrics.top);
        f.event('wheel', { deltaY: -60 }); f.tick(800);
        assert.equal(f.choices.at(-1), 2);
      }
    }
  }
});

test('every logo handoff follows its side-to-side path without a centre magnet or centre dock', () => {
  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const f = fixture(w, h, 6), transition = h * (w <= 640 ? .48 : .52);
    for (let scene = 1; scene < 6; scene++) {
      const anchor = f.layoutY(f.sections[scene]) - f.metrics.top;
      f.render(anchor - transition); const startX = f.pose[0];
      f.render(anchor); const endX = f.pose[0];
      assert(Math.abs(endX / w - .5) > .25, 'No logo parks in the middle');
      for (const phase of [.1, .25, .5, .75, .9]) {
        f.render(anchor - transition + transition * phase);
        const eased = phase ** 3 * (phase * (phase * 6 - 15) + 10);
        assert(Math.abs(f.pose[0] - (startX + (endX - startX) * eased)) < .0001, 'No additional centre excursion');
      }
    }
  }
});

test('continuous wheel bursts retarget all galleries before the first image switches', () => {
  for (const type of ['creative', 'reporting', 'websites']) {
    for (const [w, h] of [[1440, 1000], [390, 844]]) {
      const f = fixture(w, h, 3, 0, type), anchor = f.layoutY(f.sections[0]) - f.metrics.top;
      f.window.scrollY = anchor;
      f.event('wheel', { deltaY: 12 }); f.tick(16);
      assert.equal(f.choices.at(-1), 0);
      const firstFrame = f.window.scrollY;
      f.event('wheel', { deltaY: 12 });
      assert.equal(f.window.scrollY, firstFrame, 'Input cannot teleport the gallery');
      for (let event = 0; event < 8; event++) { f.tick(16); f.event('wheel', { deltaY: 12 }); }
      f.tick(220);
      assert(Math.abs(f.progresses.at(-1) - 2) < .0001, 'One uninterrupted burst can cross multiple images');
      assert.equal(f.frames, 0);
      const from = f.window.scrollY;
      f.event('wheel', { deltaY: -12 }); f.tick(32);
      assert(f.window.scrollY < from, 'Reversing input reverses immediately, even in the same burst');
      const progress = f.film.capturePosition().progress;
      f.metrics.h -= 40; f.film.measure(f.metrics); f.tick(220);
      assert(f.progresses.at(-1) < 2);
      const settled = f.film.capturePosition();
      f.metrics.h -= 20; f.film.measure(f.metrics); f.render(f.window.scrollY);
      assert(Math.abs(f.film.capturePosition().progress - settled.progress) < .0001, 'A partial gallery position survives resize');
      assert(progress < 2);
    }
  }
});

test('continued touch movement updates gallery progress instead of locking after its first move', () => {
  for (const type of ['creative', 'reporting', 'websites']) {
    const f = fixture(390, 844, 3, 0, type);
    f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
    f.event('touchstart', { touches: [{ clientX: 100, clientY: 600 }] });
    f.event('touchmove', { touches: [{ clientX: 100, clientY: 580 }] }); f.tick(16);
    const position = f.window.scrollY;
    f.event('touchmove', { touches: [{ clientX: 100, clientY: 560 }] });
    assert.equal(f.window.scrollY, position);
    f.event('touchmove', { touches: [{ clientX: 100, clientY: 540 }] });
    f.event('touchend'); f.tick(180);
    assert(Math.abs(f.progresses.at(-1) - 1) < .0001);
    assert.equal(f.frames, 0);
  }
});

test('every chapter boundary keeps the logo pose continuous and reversible', () => {
  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const f = fixture(w, h, 6);
    for (let i = 1; i < 6; i++) {
      const anchor = f.layoutY(f.sections[i]) - f.metrics.top;
      f.render(anchor - .01); const before = [...f.pose];
      f.render(anchor); const after = [...f.pose];
      assert(before.every((value, j) => Math.abs(value - after[j]) < .01), 'Logo jumps at scene ' + i);
      f.render(anchor + .01); f.render(anchor - .01);
      assert.deepEqual(f.pose, before);
    }
  }
});

test('scroll visits all nine graphics before reporting and reverses through them on desktop and mobile', () => {
  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const f = fixture(w, h, 3, 0);
    const anchor = f.layoutY(f.sections[0]) - f.metrics.top;
    f.window.scrollY = anchor; f.render(anchor);
    const before = f.reads;
    for (let project = 1; project < 9; project++) {
      assert(f.event('wheel').prevented); f.tick(1100);
      assert.equal(f.choices.at(-1), project);
      assert.equal(f.panels[0].inert, false);
    }
    f.event('wheel'); f.tick(1100);
    assert.equal(f.window.scrollY, f.layoutY(f.sections[1]) - f.metrics.top);
    for (let project = 8; project >= 0; project--) {
      f.event('wheel', { deltaY: -60 }); f.tick(1100);
      assert.equal(f.choices.at(-1), project);
      assert.equal(f.panels[0].inert, false);
    }
    // Render and gestures never measure gallery geometry.
    assert.equal(f.reads, before + 1);
  }
});

test('all six websites are reachable in both directions before leaving the chapter', () => {
  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const f = fixture(w, h, 3, 0, 'websites');
    f.window.scrollY = f.layoutY(f.sections[0]) - f.metrics.top;
    f.render(f.window.scrollY);
    for (let index = 1; index < 6; index++) {
      f.event('wheel'); f.tick(220);
      assert.equal(f.choices.at(-1), index);
      assert.equal(f.panels[0].inert, false);
    }
    f.event('wheel'); f.tick(800);
    assert.equal(f.window.scrollY, f.layoutY(f.sections[1]) - f.metrics.top);
    for (let index = 5; index >= 0; index--) {
      f.event('wheel', { deltaY: -60 }); f.tick(800);
      assert.equal(f.choices.at(-1), index);
    }
  }
});

test('manual gallery selection and resize preserve the selected project playhead', () => {
  const f = fixture(390, 844, 3, 0);
  assert(f.film.selectProject(f.panels[0], 2));
  f.tick(620); assert.equal(f.choices.at(-1), 2);
  const position = f.film.capturePosition();
  assert.equal(position.project, 2);
  f.metrics.h = 780; f.film.measure(f.metrics); f.render(f.window.scrollY);
  assert.equal(f.choices.at(-1), 2);
  f.event('wheel'); f.tick(620); assert.equal(f.choices.at(-1), 3);
  f.film.configure(false);
  assert.equal(f.film.selectProject(f.panels[0], 4), false);
});

test('mobile gallery preserves caption reading stops and then visits every project by swipe', () => {
  const f = fixture(320, 640, 3, 1);
  f.window.scrollY = f.layoutY(f.sections[1]) - f.metrics.top; f.render(f.window.scrollY);
  const swipe = () => {
    f.event('pointerdown', { pointerType: 'touch' });
    f.event('touchstart', { touches: [{ clientX: 100, clientY: 550 }] });
    f.event('touchmove', { touches: [{ clientX: 100, clientY: 450 }] });
    f.event('touchend'); f.tick(620);
  };
  const pages = Math.ceil((1250 - (640 - 76 - 48 - 32)) / ((640 - 76 - 48 - 32) * .8));
  for (let page = 0; page < pages; page++) { swipe(); assert.equal(f.choices.at(-1), 0); }
  for (let project = 1; project < 9; project++) { swipe(); assert.equal(f.choices.at(-1), project); }
  swipe();
  assert.equal(f.window.scrollY, f.layoutY(f.sections[2]) - f.metrics.top);
});

test('expanded fifteen-scene film renders forward and backward without invalid coordinates', () => {
  for (const [w, h] of [[1440, 1000], [390, 844], [320, 640]]) {
    const f = fixture(w, h, 15);
    for (const i of [...Array(15).keys(), ...Array(15).keys()].map((i, n) => n < 15 ? i : 14 - i)) {
      f.render(f.layoutY(f.sections[i]) - f.metrics.top);
      assert(f.pose.every(value => typeof value !== 'number' || Number.isFinite(value)));
      for (const panel of f.panels) {
        assert(!/NaN|undefined/.test(JSON.stringify(panel.style)), `Invalid scene ${i} at ${w}`);
      }
      assert.equal(f.panels[i].inert, false);
    }
  }
});

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
    // Invisible scenes intentionally retain cached poses; visible scenes must
    // reproduce the exact same composition when reversing.
    const visibleStyles = () => JSON.stringify(f.panels.map(panel => panel.style.visibility === 'visible'
      ? panel.style : { visibility: panel.style.visibility, pointerEvents: panel.style.pointerEvents }));
    const snapshot = visibleStyles();
    f.render(nextAnchor + 1000); f.render(midway);
    assert.equal(visibleStyles(), snapshot);
    assert.equal(f.reads, before, 'The playhead must use cached geometry');
    if (w <= 640) assert(f.panels.filter(panel => panel.style.visibility === 'visible').every(panel => panel.style['--film-x'] === '0.0000px'));
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
    assert.equal(f.footer.style['--film-footer-phase'], '1.0000');
    f.window.location.hash = '#chapter-1'; f.film.alignHash();
    assert.equal(f.window.target, nextAnchor, 'Direct navigation must settle on the original section anchor');
    f.render(nextAnchor);
    assert.equal(f.panels[1].focused, true, 'Keyboard scrolling must leave a hidden footer and reach the selected chapter');
    f.film.configure(false);
    assert(f.panels.every(panel => panel.inert === false && panel.style.visibility === ''));
    assert(f.sections.every(section => !section.style['--film-span']));
  });
}
