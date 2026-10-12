const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scenes = [...html.matchAll(/<section class="work-scene[^\"]*"[\s\S]*?<\/section>/g)].map(match => match[0]);
const gallery = scenes.join('\n');

test('showcase categories are creative production, reporting and websites', () => {
  assert.deepEqual(scenes.map(scene => scene.match(/<h2>(.*?)<\/h2>/)[1]), ['Creative Production', 'Reporting', 'Websites']);
  assert.match(scenes[0], /Social media graphics/);
  assert.match(scenes[1], /Dashboard design/);
  assert.match(scenes[2], /id="work-websites"/);
});

test('homepage consolidates five repeated sections while preserving old fragment destinations', () => {
  assert.equal((html.match(/<section\b/g) || []).length, 9);
  for (const id of ['challenge', 'partnership', 'why-arsc', 'process', 'about']) {
    assert(html.includes(`id="${id}"`));
    assert(!new RegExp('<section[^>]+id="' + id + '"').test(html));
  }
});

test('nine graphics, three dashboards and six websites have local assets, meaningful alternatives and uncropped frames', () => {
  assert.equal(scenes.length, 3);
  assert(!html.includes('class="work-showcase"'));
  const images = [...gallery.matchAll(/<img src="([^"]+)" width="(\d+)" height="(\d+)" alt="([^"]+)" loading="lazy" decoding="async"/g)];
  assert.equal(images.length, 18);
  for (const [, file, width, height, alt] of images) {
    assert(fs.existsSync(path.join(root, file)));
    assert(+width > 0 && +height > 0 && alt.length > 35);
  }
  assert.match(fs.readFileSync(path.join(root, 'showcase.css'), 'utf8'), /object-fit: contain/);
  assert(!gallery.includes('drive.google.com'));
});

test('six website concepts have honest labels, distinct captured previews and native live-site links', () => {
  const websites = scenes[2], slugs = ['aura', 'form', 'june', 'hearth', 'offday', 'circuit'];
  let bytes = 0;
  for (const slug of slugs) {
    assert(websites.includes(`data-project-select="${slug}"`));
    assert(websites.includes(`src="assets/work/website-${slug}.webp"`));
    assert(websites.includes(`href="samples/portfolio/${slug}/" target="_blank" rel="noopener"`));
    assert(fs.existsSync(path.join(root, 'samples/portfolio', slug, 'index.html')));
    bytes += fs.statSync(path.join(root, `assets/work/website-${slug}.webp`)).size;
  }
  assert(bytes < 300000, 'Six website screenshots must stay compact');
  assert.match(websites, /not client websites/);
  assert.match(websites, /forms, bookings and checkout are demo-only/);
  assert(!websites.includes('<iframe'));
  const f = controller('websites', 6);
  for (let index = 0; index < 6; index++) {
    f.stage.ARSCShowcase.setProgress(index, true);
    assert.equal(f.gallery.dataset.selected, f.buttons[index].dataset.projectSelect);
    assert.equal(f.copies.filter(copy => !copy.hidden).length, 1);
    assert.equal(f.visuals.filter(visual => visual.attrs.tabindex === '0').length, 1);
    assert.match(f.visuals[index].attrs['aria-label'], /website concept/);
  }
});

test('dashboard figures remain labelled demo data even when the asset is opened independently', () => {
  for (const slug of ['nba', 'personalised-posing', 'peg']) {
    const svg = fs.readFileSync(path.join(root, `assets/work/${slug}-dashboard-demo.svg`), 'utf8');
    assert(svg.includes('DEMO DATA · NOT LIVE'));
    assert(svg.includes('FICTIONAL FIGURES'));
    assert(svg.includes('not client results'));
    assert(!/<script|<foreignObject|(?:href|src)=/i.test(svg));
    assert(gallery.includes(`assets/work/${slug}-dashboard-demo.svg`));
  }
  assert(!gallery.includes('href="db/'));
  assert(!gallery.includes('<iframe'));
});

test('three chapters offer labelled project controls and clearly label larger asset views', () => {
  for (const tag of gallery.match(/<a\b[^>]*href="assets\/work\/[^>]*>/g)) {
    assert(tag.includes('target="_blank"'));
    assert(tag.includes('rel="noopener"'));
  }
  assert.equal((gallery.match(/\(new tab\)/g) || []).length, 9);
  for (const [index, scene] of scenes.entries()) {
    assert.match(scene, index === 2 ? /data-chapter="work-websites"/ : /data-chapter="proof"/);
    assert.equal((scene.match(/data-project-select=/g) || []).length, [9, 3, 6][index]);
    assert.equal((scene.match(/aria-pressed="true"/g) || []).length, 1);
    assert.match(scene, /class="work-selectors"[^>]*hidden/);
    assert.equal((scene.match(/data-project-copy=/g) || []).length, [0, 3, 6][index]);
  }
  assert.match(html, /About the wider partnerships/);
  assert.match(gallery, /not current offers or testimonials for ARSC/);
  assert.match(fs.readFileSync(path.join(root, 'cinematic.js'), 'utf8'), /\.proof-stat, \.work-visual, \.case-study-card/);
});

test('reporting descriptions remain distinct while graphics use no name or description panels', () => {
  const headlines = [...scenes[1].matchAll(/<h3>(.*?)<\/h3>/g)].map(match => match[1]);
  const descriptions = [...scenes[1].matchAll(/<p class="work-description">(.*?)<\/p>/g)].map(match => match[1]);
  assert.equal(new Set(headlines).size, 3);
  assert.equal(new Set(descriptions).size, 3);
  assert.match(descriptions[0], /other bodybuilding accounts/);
  assert.match(descriptions[1], /coaching-brand view/);
  assert.match(descriptions[2], /period filters and post-performance summaries/);
  assert(!/work-captions|work-client|work-description/.test(scenes[0]));
});

test('graphic payload is compressed and public assets contain no source PNG copies', () => {
  let size = 0;
  for (const file of ['the-giving-table.webp', 'ampt-coaching.webp', 'ont.webp', 'melgreen.webp', 'fitfocus.webp', 'saltsand.webp', 'personalised-posing.webp', 'koko-stagewear.webp', 'posing-locker.webp']) {
    const bytes = fs.readFileSync(path.join(root, 'assets/work', file));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    size += bytes.length;
  }
  assert(size < 1400000, `Nine-graphic payload grew to ${size} bytes`);
  assert(!fs.readdirSync(path.join(root, 'assets/work')).some(file => file.endsWith('.png')));
});

function controller(type, count = 3, imagesOnly = false) {
  const ids = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'].slice(0, count);
  const make = (key, id) => {
    const classes = new Set();
    return { dataset: { [key]: id }, textContent: id, attrs: {}, hidden: false,
      style: { setProperty(key, value) { this[key] = value; } },
      setAttribute(k, v) { this.attrs[k] = v; },
      classList: { toggle(k, on) { on ? classes.add(k) : classes.delete(k); }, contains(k) { return classes.has(k); } },
      closest(selector) { return selector === `[data-${key.replace(/[A-Z]/g, ch => '-' + ch.toLowerCase())}]` ? this : null; }
    };
  };
  const buttons = ids.map(id => make('projectSelect', id)), visuals = ids.map(id => make('projectVisual', id)), copies = imagesOnly ? [] : ids.map(id => make('projectCopy', id));
  const gallery = { dataset: {} }, selectors = { hidden: true };
  let click;
  const classes = new Set();
  const stage = { dataset: { showcase: type }, classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); } },
    querySelectorAll(selector) { return { '[data-project-select]': buttons, '[data-project-visual]': visuals, '[data-project-copy]': copies }[selector]; },
    querySelector(selector) { return selector === '.work-gallery' ? gallery : selectors; },
    addEventListener(name, fn) { assert.equal(name, 'click'); click = fn; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'showcase.js'), 'utf8'), { window: {}, document: { querySelectorAll: () => [stage] } });
  return { buttons, visuals, copies, gallery, selectors, stage, classes, click(target, extras = {}) {
    const event = { target, prevented: false, preventDefault() { this.prevented = true; }, ...extras };
    click(event); return event;
  } };
}

test('phone artwork compositing hints are bounded to the visible fan and released with less motion', () => {
  const f = controller('creative', 9, true);
  f.stage.ARSCShowcase.setProgress(0, true);
  const promoted = () => f.visuals.filter(visual => visual.style['will-change'] === 'transform, opacity');
  assert(promoted().length > 0 && promoted().length <= 6);
  for (let progress = 0; progress <= 8; progress += .25) {
    f.stage.ARSCShowcase.setProgress(progress, true);
    assert(promoted().length <= 6);
    for (const visual of f.visuals) if (visual.style['--work-opacity'] === '0.0000') {
      assert.equal(visual.style['will-change'], 'auto');
    }
  }
  f.stage.ARSCShowcase.release();
  assert.equal(promoted().length, 0);
  f.stage.ARSCShowcase.setProgress(2, false);
  assert.equal(promoted().length, 0, 'Desktop does not get forced phone image layers');
});

test('hidden gallery suspension releases layers without changing poses or selection and resumes at the same playhead', () => {
  const f = controller('creative', 9, true);
  const gallery = f.stage.ARSCShowcase;
  gallery.setProgress(2.25, true);
  const selected = f.gallery.dataset.selected;
  const poses = f.visuals.map(visual => visual.style['--work-x']);
  gallery.suspend();
  assert(f.visuals.every(visual => visual.style['will-change'] === 'auto'));
  assert.equal(f.gallery.dataset.selected, selected);
  assert.deepEqual(f.visuals.map(visual => visual.style['--work-x']), poses);
  assert(f.classes.has('showcase-scrubbed'));
  gallery.setProgress(2.25, true);
  assert(f.visuals.some(visual => visual.style['will-change'] === 'transform, opacity'));
  assert.deepEqual(f.visuals.map(visual => visual.style['--work-x']), poses);
  gallery.release();
  assert(!f.classes.has('showcase-scrubbed'));
});

test('project controls select one caption, arrange creative work and preserve native asset links', () => {
  const f = controller('creative');
  assert.equal(f.selectors.hidden, false);
  assert.equal(f.gallery.dataset.selected, 'first');
  assert(f.click(f.visuals[1]).prevented);
  assert.equal(f.gallery.dataset.selected, 'second');
  assert.equal(f.visuals[0].dataset.slot, 'left');
  assert.equal(f.visuals[2].dataset.slot, 'right');
  assert.equal(f.copies.filter(x => !x.hidden).length, 1);
  assert.equal(f.buttons[1].attrs['aria-pressed'], 'true');
  assert.equal(f.click(f.visuals[1]).prevented, false);
  assert.equal(f.click(f.visuals[2], { ctrlKey: true }).prevented, false);
  assert.equal(f.gallery.dataset.selected, 'second');
});

test('reporting controls show all three assets and keep client descriptions in sync', () => {
  const f = controller('reporting');
  f.click(f.buttons[2]);
  assert.equal(f.gallery.dataset.selected, 'third');
  assert.deepEqual(f.visuals.map(x => x.hidden), [false, false, false]);
  assert.deepEqual(f.copies.map(x => x.hidden), [true, true, false]);
  assert(f.visuals[2].attrs['aria-label'].includes('opens in a new tab'));
  assert.equal(f.buttons.filter(x => x.attrs['aria-pressed'] === 'true').length, 1);
  assert(!/wheel|touchmove|setInterval|requestAnimationFrame/.test(fs.readFileSync(path.join(root, 'showcase.js'), 'utf8')));
});

test('six graphics occupy unique layers and only one caption is visible', () => {
  const f = controller('creative', 6);
  assert.equal(new Set(f.visuals.map(x => x.dataset.slot)).size, 6);
  f.click(f.buttons[5]);
  assert.equal(f.visuals[5].dataset.slot, 'center');
  assert.equal(f.copies.filter(x => !x.hidden).length, 1);
  assert.equal(f.visuals.filter(x => !x.hidden).length, 6);
});

test('nine creative artworks follow the owner requested first three and use accessible unnamed dots', () => {
  const order = ['fitfocus', 'giving-table', 'saltsand', 'ampt', 'ont', 'melgreen', 'personalised-posing', 'koko-stagewear', 'posing-locker'];
  for (const attribute of ['select', 'visual']) {
    assert.deepEqual([...scenes[0].matchAll(new RegExp('data-project-' + attribute + '="([^"]+)"', 'g'))].map(match => match[1]), order);
  }
  const labels = [...scenes[0].matchAll(/aria-label="Select graphic (\d+) of 9"/g)].map(match => Number(match[1]));
  assert.deepEqual(labels, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('all nine images remain selectable without captions and far-away orbit poses stay bounded', () => {
  const f = controller('creative', 9, true);
  assert.equal(f.stage.ARSCShowcase.count, 9);
  for (let progress = 0; progress <= 8; progress += .125) {
    f.stage.ARSCShowcase.setProgress(progress, true);
    assert.equal(f.gallery.dataset.selected, f.buttons[Math.round(progress)].dataset.projectSelect);
    for (const visual of f.visuals) {
      const opacity = Number(visual.style['--work-opacity']);
      assert(opacity >= 0 && opacity <= 1);
      assert(Number(visual.style['--work-scale']) > 0);
    }
    assert.equal(f.visuals.filter(visual => visual.attrs.tabindex === '0').length, 1);
  }
  f.stage.ARSCShowcase.release();
  f.click(f.buttons[0]);
  assert.equal(f.gallery.dataset.selected, 'first');
});

test('inactive captions reserve stable layout space but remain invisible and non-interactive', () => {
  const css = fs.readFileSync(path.join(root, 'showcase.css'), 'utf8');
  assert.match(css, /\.showcase-ready \.work-captions\s*\{ display: grid;/);
  assert.match(css, /\.showcase-ready \.work-copy\s*\{ grid-area: 1 \/ 1;/);
  assert.match(css, /\.showcase-ready \.work-copy\[hidden\]\s*\{ display: grid !important; visibility: hidden; pointer-events: none;/);
});

test('gallery layer order stays stable between selection boundaries', () => {
  const f = controller('creative', 9, true);
  f.stage.ARSCShowcase.setProgress(.1, true);
  const layers = f.visuals.map(visual => visual.style['--work-depth']);
  const position = f.visuals[0].style['--work-x'];
  f.stage.ARSCShowcase.setProgress(.2, true);
  assert.deepEqual(f.visuals.map(visual => visual.style['--work-depth']), layers);
  assert.notEqual(f.visuals[0].style['--work-x'], position);
  f.stage.ARSCShowcase.setProgress(.6, true);
  assert.notDeepEqual(f.visuals.map(visual => visual.style['--work-depth']), layers);
});

test('invisible phone artworks stop updating and refresh on re-entry', () => {
  const f = controller('creative', 9, true);
  let hiddenWrites = 0;
  const hidden = f.visuals[4];
  const original = hidden.style.setProperty;
  hidden.style.setProperty = function (key, value) { hiddenWrites++; original.call(this, key, value); };
  f.stage.ARSCShowcase.setProgress(0, true);
  assert.equal(hidden.style['--work-opacity'], '0.0000');
  hiddenWrites = 0;
  for (let step = 1; step <= 10; step++) f.stage.ARSCShowcase.setProgress(step / 50, true);
  assert.equal(hiddenWrites, 0);
  f.stage.ARSCShowcase.setProgress(4, true);
  assert(hiddenWrites > 0);
  assert.equal(hidden.style['--work-opacity'], '1.0000');
  assert.equal(hidden.style['--work-x'], '0.0000%');
});

test('creative and reporting motion interpolates directly from the film and releases to native controls', () => {
  for (const type of ['creative', 'reporting']) {
    for (const mobile of [false, true]) {
      const f = controller(type, type === 'creative' ? 6 : 3);
      f.stage.ARSCShowcase.setProgress(.5, mobile);
      assert.equal(f.visuals[0].style['--work-x'], mobile ? '-17.0000%' : '-32.5000%');
      assert.equal(f.visuals[1].style['--work-x'], mobile ? '17.0000%' : '32.5000%');
      assert.equal(f.gallery.dataset.selected, 'second');
      assert.equal(f.copies.filter(copy => !copy.hidden).length, 1);
      f.stage.ARSCShowcase.setProgress(1, mobile);
      assert.equal(f.visuals[1].style['--work-x'], '0.0000%');
      assert.equal(f.visuals[1].style['--work-scale'], '1.0000');
      f.stage.ARSCShowcase.setProgress(0, mobile);
      assert.equal(f.visuals[0].style['--work-x'], '0.0000%');
      f.stage.ARSCShowcase.release();
      assert(!f.classes.has('showcase-scrubbed'));
      f.click(f.buttons[2]);
      assert.equal(f.gallery.dataset.selected, 'third');
    }
  }
  const css = fs.readFileSync(path.join(root, 'showcase.css'), 'utf8');
  assert.match(css, /\.showcase-ready.showcase-scrubbed[\s\S]*?transition: none;/);
});

test('graphics keep their continuous orbit across caption changes and hide their back-edge recycling', () => {
  for (const type of ['creative', 'reporting']) {
    const f = controller(type, type === 'creative' ? 6 : 3);
    f.stage.ARSCShowcase.setProgress(.499, false);
    const before = f.visuals.map(visual => parseFloat(visual.style['--work-x']));
    f.stage.ARSCShowcase.setProgress(.501, false);
    f.visuals.forEach((visual, i) => {
      if (Number(visual.style['--work-opacity']) > .01) {
        assert(Math.abs(parseFloat(visual.style['--work-x']) - before[i]) < 1, 'Selecting the next caption cannot reposition the pictures');
      }
    });
    f.stage.ARSCShowcase.setProgress(type === 'creative' ? 0 : .5, false);
    const back = f.visuals.find(visual => Number(visual.style['--work-opacity']) < .01);
    assert(back, 'The wrapping artwork must be invisible at the back seam');
    assert(f.visuals.every(visual => Number.isFinite(Number(visual.style['--work-depth']))));
  }
});
