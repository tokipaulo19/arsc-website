(() => {
  'use strict';
  document.querySelectorAll('[data-showcase]').forEach(stage => {
    const buttons = [...stage.querySelectorAll('[data-project-select]')];
    const visuals = [...stage.querySelectorAll('[data-project-visual]')];
    const copies = [...stage.querySelectorAll('[data-project-copy]')];
    let selectedId = null;
    let lastProgress = null;
    const poseCache = new WeakMap();
    const writePose = (visual, property, value) => {
      let cache = poseCache.get(visual);
      if (!cache) { cache = new Map(); poseCache.set(visual, cache); }
      if (cache.get(property) === value) return;
      visual.style.setProperty(property, value);
      cache.set(property, value);
    };
    const slotFor = (index, focus) => {
      let offset = (index - focus + visuals.length) % visuals.length;
      if (offset > visuals.length / 2) offset -= visuals.length;
      return ({ 0: 'center', '-1': 'left', 1: 'right', '-2': 'far-left', 2: 'far-right' })[offset] || 'back';
    };
    const select = id => {
      if (id === selectedId || !visuals.some(visual => visual.dataset.projectVisual === id)) return;
      selectedId = id;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.projectSelect === id)));
      copies.forEach(copy => { copy.hidden = copy.dataset.projectCopy !== id; });
      const focus = visuals.findIndex(visual => visual.dataset.projectVisual === id);
      visuals.forEach((visual, index) => {
        const selected = visual.dataset.projectVisual === id;
        visual.classList.toggle('is-selected', selected);
        visual.dataset.slot = slotFor(index, focus);
        const button = buttons.find(item => item.dataset.projectSelect === visual.dataset.projectVisual);
        const label = button.textContent.trim();
        visual.setAttribute('aria-label', selected
          ? stage.dataset.showcase === 'websites' ? `Open ${label} website concept (opens in a new tab)`
            : `View ${label} ${stage.dataset.showcase === 'creative' ? 'artwork' : 'demo preview'} at full size (opens in a new tab)`
          : `Select ${label} project`);
        if (stage.dataset.showcase !== 'reporting') visual.setAttribute('tabindex', selected ? '0' : '-1');
      });
      stage.querySelector('.work-gallery').dataset.selected = id;
    };
    stage.classList.add('showcase-ready');
    stage.querySelector('.work-selectors').hidden = false;
    select(buttons[0].dataset.projectSelect);
    // The existing film playhead owns scroll progression; controls remain
    // usable independently when cinematic motion is disabled.
    stage.ARSCShowcase = {
      count: buttons.length,
      setIndex(index) { select(buttons[index]?.dataset.projectSelect); },
      setProgress(progress, mobile) {
        const key = `${progress.toFixed(4)}:${mobile}`;
        if (key === lastProgress) return;
        lastProgress = key;
        select(buttons[Math.round(progress)]?.dataset.projectSelect);
        stage.classList.add('showcase-scrubbed');
        const reporting = stage.dataset.showcase !== 'creative';
        const poses = mobile
          ? [[-34, -12, .74], [34, 12, .74], [-58, -20, .53], [58, 20, .53], [78, 25, .4]]
          : [[-65, -12, .78], [65, 12, .78], [-110, -20, .58], [110, 20, .58], [125, 25, .45]];
        const pose = offset => {
          const distance = Math.min(3, Math.abs(offset)), side = Math.sign(offset);
          const centre = [0, reporting ? 0 : -3, 1, 1];
          const levels = [centre, [...poses[1], reporting ? .85 : .65], [...poses[3], reporting ? .85 : .65], [...poses[4], 0]];
          const lower = Math.min(2, Math.floor(distance)), phase = distance - lower;
          const a = levels[lower].map((value, i) => i < 2 && lower ? value * side : value);
          const b = levels[lower + 1].map((value, i) => i < 2 ? value * side : value);
          const values = a.map((value, i) => value + (b[i] - value) * phase);
          // Wrap around behind the fan, not across its face. Fade at the seam
          // so a recycled graphic cannot flash from one edge to the other.
          values[3] *= Math.min(1, Math.max(0, visuals.length / 2 - distance) * 4);
          return values;
        };
        const properties = ['--work-x', '--work-roll', '--work-scale', '--work-opacity'];
        const units = ['%', 'deg', '', ''];
        visuals.forEach((visual, index) => {
          const offset = ((index - progress + visuals.length * 1.5) % visuals.length) - visuals.length / 2;
          const values = pose(offset);
          // Promote only the phone artworks actually in the fan. Release the
          // recycled layers, keeping GPU memory bounded to visible images.
          writePose(visual, 'will-change', mobile && values[3] > 0 ? 'transform, opacity' : 'auto');
          // Once a recycled artwork is fully behind the fan, keep its cached
          // pose until it returns. Do not move invisible image layers per frame.
          if (mobile && values[3] === 0 && poseCache.get(visual)?.get('--work-opacity') === '0.0000') return;
          properties.forEach((property, i) => writePose(visual, property,
            `${values[i].toFixed(4)}${units[i]}`));
          // Phone layer order changes at selection boundaries, not every pixel.
          // Fractional transforms still move continuously in both directions;
          // desktop keeps its existing depth interpolation.
          const layerProgress = mobile ? Math.round(progress) : progress;
          const layerOffset = ((index - layerProgress + visuals.length * 1.5) % visuals.length) - visuals.length / 2;
          writePose(visual, '--work-depth', String(Math.round((visuals.length / 2 - Math.abs(layerOffset)) * 100)));
        });
      },
      suspend() {
        if (lastProgress === null) return;
        lastProgress = null;
        visuals.forEach(visual => writePose(visual, 'will-change', 'auto'));
      },
      release() {
        this.suspend();
        stage.classList.remove('showcase-scrubbed');
      }
    };
    const requestSelect = id => {
      const handled = window.ARSCExperience?.selectProject?.(stage, buttons.findIndex(button => button.dataset.projectSelect === id));
      if (!handled) select(id);
    };
    stage.addEventListener('click', event => {
      const button = event.target.closest('[data-project-select]');
      if (button) requestSelect(button.dataset.projectSelect);
      const visual = event.target.closest('[data-project-visual]');
      if (visual && !visual.classList.contains('is-selected') && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.button) {
        event.preventDefault();
        requestSelect(visual.dataset.projectVisual);
      }
    });
  });
})();
