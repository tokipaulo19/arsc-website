const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "../samples/portfolio");
const source = fs.readFileSync(path.join(root, "shared/motion.js"), "utf8");
const context = {};
vm.runInNewContext(source, context);
const math = context.PortfolioMotionMath;
test("motion geometry clamps scroll progress and keeps coffee within its art stage", () => {
  assert.equal(math.clamp(-10), 0);
  assert.equal(math.clamp(200, 0, 100), 100);
  assert.equal(math.clamp(NaN), 0);
  assert.equal(math.progress(2000, 1200, 800), 0);
  assert.equal(math.progress(800, 1200, 800), 0);
  assert.equal(math.progress(-200, 1200, 800), 0.5);
  assert.equal(math.progress(-1200, 1200, 800), 1);
  for (const [width, height] of [
    [500, 580],
    [330, 440],
  ]) {
    for (let p = 0; p <= 1; p += 0.01) {
      const pose = math.coffeePose(p, width, height);
      assert.ok(Number.isFinite(pose.angle));
      assert.ok(Math.abs(pose.x) <= (width - 200) * 0.36 + 0.001);
      assert.ok(Math.abs(pose.y) <= (height - 200) * 0.25 + 0.001);
    }
  }
  assert.equal(math.coffeePose(0, 500, 580).angle, -24);
  assert.equal(math.coffeePose(1, 500, 580).angle, 336);
});
function fixture(reduced = false) {
  const handlers = {};
  const media = {
    matches: reduced,
    addEventListener: (name, fn) => {
      handlers.media = fn;
    },
  };
  const button = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(name, fn) {
      handlers.click = fn;
    },
  };
  const document = {
    hidden: false,
    body: { dataset: {} },
    documentElement: { dataset: {} },
    querySelectorAll: (selector) =>
      selector === "[data-motion-toggle]" ? [button] : [],
    addEventListener: (name, fn) => {
      handlers[name] = fn;
    },
  };
  const window = { matchMedia: () => media };
  vm.runInNewContext(source, { document, window });
  return { document, window, button, handlers, media };
}
test("a manual motion pause stops effects and survives visibility changes without storage", () => {
  const f = fixture();
  const states = [];
  f.window.PortfolioMotion.subscribe((value) => states.push(value));
  assert.equal(f.document.body.dataset.motion, "running");
  f.handlers.click();
  assert.equal(f.document.body.dataset.motion, "stopped");
  assert.equal(f.button.attributes["aria-label"], "Play animations");
  assert.equal(f.button.attributes["aria-pressed"], "true");
  f.document.hidden = true;
  f.handlers.visibilitychange();
  f.document.hidden = false;
  f.handlers.visibilitychange();
  assert.equal(f.window.PortfolioMotion.enabled(), false);
  f.handlers.click();
  assert.equal(f.window.PortfolioMotion.enabled(), true);
  f.document.hidden = true;
  f.handlers.visibilitychange();
  assert.equal(f.window.PortfolioMotion.enabled(), false);
  f.document.hidden = false;
  f.handlers.visibilitychange();
  assert.equal(f.window.PortfolioMotion.enabled(), true);
  assert.deepEqual(states, [true, false, false, false, true, false, true]);
});
test("OS reduced motion wins over play controls and responds when the setting changes", () => {
  const f = fixture(true);
  assert.equal(f.window.PortfolioMotion.enabled(), false);
  assert.equal(f.button.disabled, true);
  assert.equal(f.button.textContent, "REDUCED MOTION ON");
  assert.equal(f.button.attributes["aria-pressed"], "true");
  f.media.matches = false;
  f.handlers.media();
  assert.equal(f.window.PortfolioMotion.enabled(), true);
  f.media.matches = true;
  f.handlers.media();
  assert.equal(f.window.PortfolioMotion.enabled(), false);
  assert.equal(f.document.documentElement.dataset.motion, "stopped");
});
test("every featured site has three visibly fictional customer stories, not verified ratings", () => {
  for (const slug of ["aura", "form", "june", "hearth", "offday", "circuit"]) {
    const html = fs.readFileSync(path.join(root, slug, "index.html"), "utf8");
    const section = html.match(
      /<section[^>]*data-customer-stories[\s\S]*?<\/section>/,
    )?.[0];
    assert.ok(section, slug);
    assert.equal((section.match(/<blockquote>/g) || []).length, 3);
    assert.match(section, /Fictional customer stories/);
    assert.match(section, /not real reviews or verified results/);
    assert.doesNotMatch(
      section,
      /verified purchase|five.star|\d+[,.]\d+\s*\/\s*5|\d+ happy customers/i,
    );
  }
});
test("FORM comparator supports keyboard endpoints and describes its fictional, non-physique story", () => {
  const html = fs.readFileSync(path.join(root, "form/index.html"), "utf8");
  assert.match(html, /type="range"[\s\S]*?min="0"[\s\S]*?max="100"/);
  assert.match(html, /No weight loss, timeline or guaranteed outcome/);
  const handlers = {};
  const image = {
    style: {
      setProperty(name, value) {
        image[name] = value;
      },
    },
  };
  const slider = {
    value: "50",
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(name, fn) {
      handlers[name] = fn;
    },
  };
  const output = {};
  const elements = {
    "[data-story-range]": slider,
    "[data-story-comparison]": image,
    "[data-story-output]": output,
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "form/stories.js"), "utf8"),
    {
      PortfolioMotionMath: math,
      document: { querySelector: (selector) => elements[selector] },
    },
  );
  assert.equal(image["--split"], "50%");
  for (const value of ["0", "25", "100"]) {
    slider.value = value;
    handlers.input();
    assert.equal(image["--split"], `${value}%`);
    assert.match(
      slider.attributes["aria-valuetext"],
      /starting-point photograph/,
    );
    assert.equal(output.textContent, `${value}% / ${100 - Number(value)}%`);
  }
});
test("motion assets are local, dependency-free, reduced-motion aware and never send data", () => {
  for (const file of [
    "shared/motion.js",
    "circuit/motion.js",
    "hearth/motion.js",
    "form/stories.js",
  ]) {
    const js = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(
      js,
      /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|sendBeacon|\.submit\s*\(/,
    );
  }
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /visibilitychange/);
  const css = fs.readFileSync(path.join(root, "shared/motion.css"), "utf8");
  assert.match(
    css,
    /body:not\(\[data-motion="running"\]\) \[data-animate\] \*::after/,
  );
  assert.match(css, /\[data-in-view="false"\]\[data-animate\] \*::before/);
  for (const slug of ["form", "hearth", "circuit"]) {
    const html = fs.readFileSync(path.join(root, slug, "index.html"), "utf8");
    assert.match(html, /data-motion-toggle/);
    assert.match(html, /shared\/motion.js/);
    assert.match(html, /shared\/motion.css/);
  }
});
test("coffee scroll frames coalesce, stop offscreen and cancel on a motion pause", () => {
  const events = {};
  const frames = new Map();
  let nextFrame = 0;
  let top = 0;
  let reads = 0;
  let onMotion;
  let enabled = true;
  let onIntersection;
  const journey = {
    getBoundingClientRect() {
      reads++;
      return { top, height: 1200 };
    },
  };
  const stage = { clientWidth: 500, clientHeight: 580, dataset: {} };
  const cup = { style: {} },
    meter = { style: {} };
  const elements = {
    "[data-coffee-journey]": journey,
    "[data-coffee-stage]": stage,
    "[data-coffee-cup]": cup,
    "[data-coffee-progress]": meter,
  };
  class Observer {
    constructor(fn) {
      onIntersection = fn;
    }
    observe() {}
  }
  const context = {
    window: {
      IntersectionObserver: Observer,
      addEventListener(name, fn) {
        events[name] = fn;
      },
    },
    IntersectionObserver: Observer,
    innerHeight: 800,
    PortfolioMotionMath: math,
    PortfolioMotion: {
      enabled: () => enabled,
      subscribe(fn) {
        onMotion = fn;
        fn(enabled);
      },
    },
    document: { querySelector: (selector) => elements[selector] },
    requestAnimationFrame(fn) {
      const id = ++nextFrame;
      frames.set(id, fn);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "hearth/motion.js"), "utf8"),
    context,
  );
  assert.equal(frames.size, 1);
  events.scroll();
  events.scroll();
  events.resize();
  assert.equal(frames.size, 1);
  function flush() {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((fn) => fn());
  }
  flush();
  assert.equal(reads, 1);
  const first = cup.style.transform;
  top = -500;
  events.scroll();
  flush();
  assert.notEqual(cup.style.transform, first);
  events.scroll();
  onIntersection([{ isIntersecting: false }]);
  assert.equal(frames.size, 0);
  const oldReads = reads;
  events.scroll();
  events.resize();
  assert.equal(frames.size, 0);
  assert.equal(reads, oldReads);
  onIntersection([{ isIntersecting: true }]);
  assert.equal(frames.size, 1);
  enabled = false;
  onMotion(false);
  assert.equal(frames.size, 0);
  assert.equal(cup.style.transform, "rotate(-18deg)");
  assert.equal(meter.style.transform, "scaleX(1)");
  events.scroll();
  assert.equal(frames.size, 0);
  enabled = true;
  onMotion(true);
  flush();
  assert.notEqual(cup.style.transform, "rotate(-18deg)");
});
