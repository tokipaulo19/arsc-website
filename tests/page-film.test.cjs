const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../page-film.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../cinematic.css'), 'utf8');

function fixture(w, h) {
  let reads = 0, pose;
  const node = () => ({ style: {
    setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ''; },
    removeProperty(k) { delete this[k]; }
  }, classList: { toggle() {} }, append() {}, setAttribute() {}, focus() { this.focused = true; } });
  const panels = [320, 1250, 620].map(height => {
    const panel = node();
    Object.defineProperty(panel, 'offsetHeight', { get() { reads++; return height; } });
    return panel;
  });
  const sections = panels.map(panel => ({ ...node(), querySelector: () => panel }));
  const footer = node();
  const story = node(), document = { body: node(), documentElement: node(), createElement: node }, window = { location: { hash: '' }, scrollTo(value) { this.target = value.top; } };
  vm.runInNewContext(source, { window, document });
  const mobile = w <= 640, top = mobile ? 76 : 88;
  const metrics = { w, h, top, mobile, end: 1200 };
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
    render(scroll) { film.render(scroll, metrics); } };
}

test('stage keeps original anchors and viewport-fixed content, without wheel interception', () => {
  assert.match(styles, /film-enabled \.journey-section > \.container\s*\{[^}]*position: fixed/);
  assert.match(styles, /scroll-margin-top: var\(--film-header/);
  assert(!/preventDefault|addEventListener\(['"](?:wheel|touchmove)/.test(source));
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
