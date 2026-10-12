(() => {
  const story = document.querySelector('.cinematic-story');
  if (!story) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = matchMedia('(max-height: 500px)');
  const stage = story.querySelector('.cinematic-stage');
  const object = story.querySelector('.cinematic-object');
  const word = story.querySelector('.cinematic-word');
  const chapters = [...story.querySelectorAll('.cinematic-chapter')];
  const cards = [...story.querySelectorAll('.cinematic-capability')];
  const step = story.querySelector('.cinematic-step');
  const hint = story.querySelector('.cinematic-scroll-hint');
  const hero = document.querySelector('.hero');
  const heroMark = hero.querySelector('.hero-mark');
  const main = document.querySelector('main');
  const sections = [...document.querySelectorAll('main > section')].filter(section => section !== hero && section !== story);
  const baseLabels = ['MAKE ROOM', 'CONNECT THE CAPABILITIES', 'YOUR WAY FORWARD', 'PROGRESS, PROVEN', 'THE ARSC DIFFERENCE', 'FROM IDEA TO ACTION', 'ONE COLLECTIVE', 'REAL PEOPLE', 'YOUR NEXT MOVE'];
  // Each chapter has its own camera beat; positions are viewport-relative and
  // sizes are relative to the flyover, rather than a repeating side-to-side loop.
  const baseBeats = [
    { name: 'rise', enter: { x: 0, y: .24, size: .65, pitch: -24 }, peak: { x: -.08, y: -.04, size: 1, pitch: 12 }, exit: { x: .18, y: -.12 }, curveY: -.08 },
    { name: 'orbit', enter: { x: .34, y: -.18, yaw: -35 }, peak: { x: -.12, y: -.06, size: 1, rotate: -28, yaw: 32 }, exit: { x: -.2, y: -.08 }, curveX: -.12, curveY: -.1 },
    { name: 'push-in', enter: { x: 0, y: 0, size: .5 }, peak: { x: 0, y: 0, size: 1, pitch: 16 }, exit: { x: 0, y: -.2, pitch: -18 } },
    { name: 'drop', enter: { x: -.06, y: -.3, pitch: 32 }, peak: { x: .06, y: .02, size: .95, rotate: 16, pitch: -12 }, exit: { x: .2, y: .12 }, curveY: .05 },
    { name: 'arc', enter: { x: -.38, y: .05, yaw: 28 }, peak: { x: .12, y: -.06, size: 1, rotate: 24, yaw: -28 }, exit: { x: .12, y: -.14 }, curveX: .1, curveY: -.13 },
    { name: 'roll', enter: { x: .12, y: .15, rotate: -28 }, peak: { x: -.06, y: -.04, size: 1, rotate: 110, pitch: 18 }, exit: { x: -.1, y: -.16, rotate: 16 }, spin: true, curveY: -.06 },
    { name: 'pull-back', enter: { x: 0, y: -.06, size: 1, yaw: -18 }, peak: { x: 0, y: 0, size: .82, yaw: 16 }, exit: { x: -.16, y: -.1 } },
    { name: 'pan', enter: { x: -.36, y: -.1 }, peak: { x: -.05, y: -.08, size: 1 }, exit: { x: 0, y: -.18, pitch: -12 }, curveX: .05 },
    { name: 'settle', enter: { x: 0, y: .2, size: .8, pitch: -18 }, peak: { x: 0, y: 0, size: .92 }, exit: { x: 0, y: 0, size: .58 }, curveY: -.04 }
  ];
  const baseCameras = [
    [0, 240, 0, 14, .2], [200, 120, -5, 8, .16], [0, 100, 0, 8, .25],
    [-30, -190, 2.5, -14, .14], [-220, 140, 5, 12, .2], [80, 150, -6, 10, .18],
    [0, 100, 0, -8, -.12], [-240, 80, -3, 0, .14], [0, 140, 0, 8, .1]
  ];
  const baseSurfaces = ['#f4f1ec', '#0b0b0c', '#f4f1ec', '#151617', '#eeeae4', '#0d0d0e', '#f4f1ec', '#09090a', '#161719'];
  const chapterIds = ['challenge', 'services', 'partnership', 'proof', 'why-arsc', 'process', 'about', 'team', 'contact'];
  const originalIndices = sections.map((section, i) => {
    const found = chapterIds.indexOf(section.id);
    return found >= 0 ? found : i % baseBeats.length;
  });
  const labels = sections.map((section, i) => section.dataset?.workLabel || baseLabels[originalIndices[i]]);
  const surfaces = sections.map((section, i) => section.dataset?.workSurface || baseSurfaces[originalIndices[i]]);
  const beats = sections.map((section, i) => baseBeats[originalIndices[i]]);
  const cameras = sections.map((section, i) => baseCameras[originalIndices[i]]);
  const ports = sections.map((section, i) => {
    const port = document.createElement('div');
    port.className = 'journey-port';
    port.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = labels[i];
    port.append(label);
    section.classList.add('journey-section');
    section.append(port);
    return port;
  });
  // Per-chapter pan X/Y (px), roll/pitch (degrees), and entry zoom delta.
  const actors = sections.map((section, i) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'movie-transition';
    backdrop.setAttribute('aria-hidden', 'true');
    section.append(backdrop);
    const readingSurface = document.createElement('div');
    readingSurface.className = 'movie-reading-surface';
    readingSurface.setAttribute('aria-hidden', 'true');
    section.append(readingSurface);
    // A sibling of the sections can feather across both sides of their clipped
    // boundary. It remains below the travelling mark and reading surfaces.
    const bridge = document.createElement('div');
    bridge.className = 'movie-bridge';
    bridge.setAttribute('aria-hidden', 'true');
    bridge.style.setProperty('--bridge-from', surfaces[i - 1] || '#0b0b0c');
    bridge.style.setProperty('--bridge-to', surfaces[i]);
    main.append(bridge);
    const heading = section.querySelector('.positioning-heading, .services-intro, .partnership-intro, .proof-intro, .work-heading, .why-heading, .process-intro, .about-heading, .team-intro, .contact-heading');
    if (heading) heading.classList.add('movie-heading');
    const pieces = [...section.querySelectorAll('.service-card, .partnership-card, .proof-stat, .work-visual, .case-study-card, .why-item, .process-step, .about-content, .team-lineup, .collective-note, .contact-panel')];
    pieces.forEach(piece => piece.classList.add('movie-piece'));
    return { section, panel: section.querySelector('.container'), pieces, bridge };
  });
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const feather = n => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let frame = null, measureFrame = null, metrics, route = [], scenes = [], lastProgress = -1;
  const film = window.ARSCFilm?.create({ sections, story, main, surfaces, beats, place, layoutY, onFrame: render });

  // Offset coordinates ignore the camera transforms, so resize measurements
  // cannot feed the current animation back into its own timeline.
  function layoutY(element) {
    let y = 0;
    for (let node = element; node; node = node.offsetParent) y += node.offsetTop;
    return y;
  }

  // Measure only when layout changes; scrolling uses cached waypoints.
  function measure() {
    if (measureFrame !== null) window.cancelAnimationFrame?.(measureFrame);
    measureFrame = null;
    if (!story.classList.contains('is-cinematic')) return;
    const scroll = window.scrollY;
    const bounds = story.getBoundingClientRect();
    const w = document.documentElement.clientWidth, h = window.innerHeight, mobile = w <= 640;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const stageH = stage.offsetHeight, stageW = stage.clientWidth;
    const start = bounds.top + scroll - top;
    const end = start + story.offsetHeight - stageH;
    const mark = heroMark.getBoundingClientRect();
    const base = object.offsetWidth;
    metrics = { w, h, mobile, top, stageH, stageW, start, end, base,
      heroX: mark.width ? mark.left + mark.width / 2 : w - 22,
      heroY: mark.width ? mark.top + scroll + mark.height / 2 : h * .72,
      heroSize: mark.width ? mark.width / .56 : 34,
      heroDeparture: Math.max(0, start - h * .7),
      introPose: { x: stageW * .84, y: top + stageH * .58,
        size: mobile ? 170 : 330, opacity: .12 } };
    film?.measure(metrics);
    // The fixed film owns every later scene at every viewport size. Do not
    // build the retired cameras, bridges and ports alongside its timeline.
    if (film?.enabled) {
      lastProgress = -1;
      queue();
      return;
    }
    const cruisingSize = mobile ? 168 : Math.min(420, Math.max(300, w * .26));
    const landingSize = mobile ? 146 : Math.min(310, w * .32);
    const flyoverSize = mobile ? Math.min(w * .72, 270) : Math.min(w * .46, 640);
    const mainTop = layoutY(main);
    const band = Math.min(h * (mobile ? .24 : .3), mobile ? 210 : 330);
    scenes = actors.map(({ section, panel, pieces, bridge }, i) => {
      const [x, y, roll, pitch, zoom] = cameras[i] || cameras[cameras.length - 1];
      const nextBeat = beats[i + 1] || beats[i];
      const camera = {
        x: mobile ? 0 : x, y: mobile ? (y < 0 ? -40 : 72) : y,
        roll: mobile ? 0 : roll, pitch: mobile ? 0 : pitch, zoom: mobile ? .045 : zoom,
        exitX: mobile ? 0 : Math.max(-200, Math.min(200, (nextBeat.peak.x - nextBeat.enter.x) * w * .3)),
        // Let the outgoing scene linger into the cut instead of racing upward
        // and leaving a blank frame between the two sets of content.
        exitY: mobile ? 24 : 90,
        exitRoll: mobile ? 0 : Math.max(-3, Math.min(3, (nextBeat.peak.rotate || 0) * .08))
      };
      const properties = {
        '--camera-x': `${camera.x}px`, '--camera-y': `${camera.y}px`,
        '--camera-roll': `${camera.roll}deg`, '--camera-pitch': `${camera.pitch}deg`
      };
      for (const [key, value] of Object.entries(properties)) section.style.setProperty(key, value);
      const sectionTop = layoutY(section), sectionBottom = sectionTop + section.offsetHeight;
      const contentTop = layoutY(panel);
      const settle = contentTop - Math.max(top + 60, h * .42);
      bridge.style.top = `${sectionTop - mainTop - band}px`;
      bridge.style.height = `${band * 2}px`;
      return { section, bridge, camera, enter: sectionTop - h * .92, settle,
        leave: Math.max(settle + 1, sectionBottom - h * .7), end: sectionBottom - h * .08,
        pieces: pieces.map((piece, j) => {
          const pieceTop = layoutY(piece), side = (j % 3) - 1;
          piece.style.setProperty('--piece-x', `${mobile ? 0 : side * 64}px`);
          piece.style.setProperty('--piece-y', `${mobile ? 32 : 72 + (j % 3) * 18}px`);
          piece.style.setProperty('--piece-roll', `${mobile ? 0 : side * 4}deg`);
          return { element: piece, enter: pieceTop - h * 1.02, settle: pieceTop - h * .68 };
        }) };
    });
    // Both sides of every cut share exactly the same clock, including reverse
    // scrolling. The final contact scene has a quiet, independent close.
    scenes.forEach((scene, i) => {
      const next = scenes[i + 1];
      if (next) { scene.leave = next.enter; scene.end = next.settle; }
    });
    route = [{ scroll: end, x: metrics.introPose.x, worldY: end + metrics.introPose.y,
      size: metrics.introPose.size, rotate: 0, yaw: 0, pitch: 0, opacity: metrics.introPose.opacity }];
    let turn = 0;
    const landingPoints = ports.map(port => port.getBoundingClientRect());
    landingPoints.forEach((box, i) => {
      const worldY = box.top + scroll + box.height / 2;
      const dock = worldY - h * .5;
      const previousDock = i ? landingPoints[i - 1].top + scroll + landingPoints[i - 1].height / 2 - h * .5 : end;
      const nextDock = i < landingPoints.length - 1 ? landingPoints[i + 1].top + scroll + landingPoints[i + 1].height / 2 - h * .5 : document.documentElement.scrollHeight - h;
      const entrance = dock - Math.min(h * .3, (dock - previousDock) * .34);
      const hold = Math.max(dock + 1, worldY - Math.max(top + (mobile ? 96 : 160), h * .28));
      const exit = hold + Math.min(h * .13, Math.max(1, nextDock - hold) * .25);
      const centerX = box.left + box.width / 2;
      const beat = beats[i] || beats[beats.length - 1];
      // The section's extra camera accent peaks on the very same scroll frame
      // as the logo's flyover, then releases completely before reading.
      scenes[i].cue = { enter: entrance, peak: lerp(entrance, dock, .52), dock, beat };
      const travel = mobile ? .55 : 1;
      const shot = (at, pose = {}, opacity = 1, curved = false) => route.push({
        scroll: at,
        x: centerX + (pose.x || 0) * w * travel,
        worldY: worldY + (pose.y || 0) * h * travel,
        size: Math.max(landingSize, pose.size ? flyoverSize * pose.size : cruisingSize),
        rotate: turn + (pose.rotate || 0) * (mobile ? .12 : 1),
        yaw: (pose.yaw || 0) * travel, pitch: (pose.pitch || 0) * travel, opacity,
        arcX: curved ? (beat.curveX || 0) * w * travel : 0,
        arcY: curved ? (beat.curveY || 0) * h * travel : 0
      });
      shot(entrance, beat.enter, mobile ? .2 : .3);
      shot(lerp(entrance, dock, .52), beat.peak, .95, true);
      if (beat.spin && !mobile) turn += 360;
      const landing = { size: landingSize / flyoverSize };
      shot(dock, landing);
      shot(hold, landing);
      shot(exit, beat.exit, mobile ? .18 : .28);
    });
    const last = route[route.length - 1];
    const bottom = Math.max(last.scroll + 1, document.documentElement.scrollHeight - h);
    route.push({ scroll: bottom, x: last.x, worldY: bottom + h * .72, size: cruisingSize, rotate: turn, yaw: 0, pitch: 0, opacity: .15 });
    lastProgress = -1;
    queue();
  }

  function place(x, y, size, rotation, opacity = 1, yaw = rotation * .55, pitch = 0) {
    const depth = metrics.mobile ? '' : `perspective(900px) rotateY(${yaw.toFixed(2)}deg) rotateX(${pitch.toFixed(2)}deg) `;
    object.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) ${depth}rotate(${rotation.toFixed(2)}deg) scale(${(size / metrics.base).toFixed(4)})`;
    object.style.opacity = opacity.toFixed(3);
  }

  function renderScenes(scroll) {
    const write = (element, key, value, unit = '') => {
      const rounded = `${value.toFixed(4)}${unit}`;
      if (element.style.getPropertyValue(key) !== rounded) element.style.setProperty(key, rounded);
    };
    scenes.forEach((scene, i) => {
      const handoff = feather((scroll - scene.enter) / Math.max(1, scene.settle - scene.enter));
      const entry = 1 - handoff;
      const exit = feather((scroll - scene.leave) / Math.max(1, scene.end - scene.leave));
      const { cue, camera } = scene;
      const pulse = scroll <= cue.peak
        ? feather((scroll - cue.enter) / Math.max(1, cue.peak - cue.enter))
        : 1 - feather((scroll - cue.peak) / Math.max(1, cue.dock - cue.peak));
      const mobile = metrics.mobile;
      write(scene.section, '--movie-entry', entry);
      write(scene.section, '--movie-exit', exit);
      write(scene.section, '--movie-beat', pulse);
      write(scene.section, '--movie-pan-x', camera.x * entry + camera.exitX * exit + (mobile ? 0 : cue.beat.peak.x * metrics.w * .05 * pulse), 'px');
      write(scene.section, '--movie-pan-y', camera.y * entry + camera.exitY * exit - pulse * (mobile ? 28 : 85), 'px');
      write(scene.section, '--movie-roll', camera.roll * entry + camera.exitRoll * exit + (mobile ? 0 : Math.max(-3, Math.min(3, (cue.beat.peak.rotate || 0) * .025)) * pulse), 'deg');
      write(scene.section, '--movie-pitch', camera.pitch * entry + (mobile ? 0 : -8 * exit + (cue.beat.peak.pitch || 0) * .25 * pulse), 'deg');
      write(scene.section, '--movie-scale', 1 - camera.zoom * entry - exit * (mobile ? .045 : .16) + pulse * (mobile ? .035 : cue.beat.name === 'pull-back' ? -.1 : .14));
      write(scene.bridge, '--bridge-center', 56 - handoff * 12);
      if (i === 0) write(story, '--movie-exit', handoff);
      scene.pieces.forEach(piece => write(piece.element, '--piece-entry', 1 - feather((scroll - piece.enter) / Math.max(1, piece.settle - piece.enter))));
    });
  }

  function render() {
    if (frame !== null) window.cancelAnimationFrame?.(frame);
    frame = null;
    if (!metrics || !story.classList.contains('is-cinematic')) return;
    const scroll = film?.position ?? window.scrollY;
    if (!film?.enabled) renderScenes(scroll);
    const filmed = film?.render(scroll, metrics);
    const { mobile, start, end, stageW: w, stageH: h, top, base } = metrics;
    if (!filmed) window.ARSCExperience?.setChapter(scroll < start - h * .3 ? 'home' : 'momentum');
    const p = clamp((scroll - start) / Math.max(1, end - start));
    document.body.classList.toggle('in-cinematic', scroll > start - h * .4 && scroll < end + h * .4);
    const swap = smooth((p - .08) / .38), assemble = smooth((p - .44) / .38);
    const openingX = mobile ? Math.sin(p * Math.PI * 2) * w * .15 : lerp(Math.min(w * .27, 340), -Math.min(w * .27, 340), swap);
    const x = lerp(openingX, w * .34, assemble);
    const y = lerp(mobile ? h * .12 : 0, h * .08, assemble);
    const size = lerp(base, metrics.introPose.size, assemble);
    const opacity = lerp(1, metrics.introPose.opacity, assemble);
    const rotation = lerp(-18, 20, swap) * (1 - assemble);
    if (filmed) {
      // The shared stage owns the mark while adjacent scenes overlap.
    } else if (scroll < start) {
      const t = smooth((scroll - metrics.heroDeparture) / Math.max(1, start - metrics.heroDeparture));
      place(lerp(metrics.heroX, w / 2 + x, t), lerp(metrics.heroY - scroll, top + h / 2 + y, t), lerp(metrics.heroSize, size, t), rotation * t, opacity);
    } else if (scroll <= end) {
      place(w / 2 + x, top + h / 2 + y, size, rotation, opacity);
    } else {
      let i = 0;
      while (i < route.length - 2 && scroll > route[i + 1].scroll) i++;
      const a = route[i], b = route[i + 1];
      const linear = clamp((scroll - a.scroll) / Math.max(1, b.scroll - a.scroll));
      const t = smooth(linear);
      // Curved travel eases to zero at both ends; docking stays in document
      // coordinates so the mark remains attached to the section as it scrolls.
      const bend = Math.sin(Math.PI * t);
      place(lerp(a.x, b.x, t) + (b.arcX || 0) * bend,
        lerp(a.worldY, b.worldY, linear) - scroll + (b.arcY || 0) * bend,
        lerp(a.size, b.size, t), lerp(a.rotate, b.rotate, t), lerp(a.opacity, b.opacity, t),
        lerp(a.yaw || 0, b.yaw || 0, t), lerp(a.pitch || 0, b.pitch || 0, t));
    }
    if (p === lastProgress) return;
    lastProgress = p;
    word.style.transform = `translateX(calc(-50% + ${((p - .5) * w * .18).toFixed(2)}px))`;
    story.style.setProperty('--cinema-progress', p.toFixed(4));
    const visible = [1 - smooth((p - .17) / .12), smooth((p - .22) / .1) * (1 - smooth((p - .54) / .1)), smooth((p - .59) / .12)];
    chapters.forEach((chapter, i) => {
      chapter.style.opacity = visible[i].toFixed(3);
      chapter.style.visibility = visible[i] < .01 ? 'hidden' : 'visible';
      chapter.style.pointerEvents = visible[i] > .9 ? 'auto' : 'none';
      chapter.inert = visible[i] < .9;
    });
    cards.forEach((card, i) => {
      const side = i % 2 === 0 ? -1 : 1, row = i < 2 ? -1 : 1;
      const initialX = side * Math.min(w * .34, 430);
      const initialY = mobile ? (i < 2 ? h * .02 : h * .31) : row * h * .28;
      const finalX = side * (mobile ? Math.min(w * .26, 105) : Math.min(w * .22, 310));
      const finalY = mobile ? (i < 2 ? h * .04 : h * .25) : h * .13 + row * h * .12;
      card.style.transform = `translate(-50%, -50%) translate3d(${lerp(initialX, finalX, assemble).toFixed(2)}px, ${lerp(initialY, finalY, assemble).toFixed(2)}px, 0) rotate(${(side * row * 12 * (1 - assemble)).toFixed(2)}deg)`;
      // Animate position, not the legibility of the small labels inside the card.
      card.style.opacity = '1';
    });
    step.textContent = `${p < .22 ? '01' : p < .59 ? '02' : '03'} / 03`;
    hint.textContent = p > .86 ? 'FOLLOW THE MOMENTUM ↓' : 'SCROLL TO SET IT IN MOTION ↓';
  }

  function queue() { if (frame === null) frame = requestAnimationFrame(render); }
  // Fonts, viewport and content observers can all report the same reflow.
  // Rebuild one timeline per frame, not once for every notification.
  function queueMeasure() {
    if (measureFrame === null) measureFrame = requestAnimationFrame(measure);
  }
  function capturePosition() {
    const filmed = film?.capturePosition();
    if (filmed) return filmed;
    const top = parseFloat(getComputedStyle(stage).top) || (window.innerWidth <= 640 ? 76 : 88);
    if (film?.enabled) {
      const section = window.scrollY < metrics.start ? hero : story;
      const read = Math.max(1, section.offsetHeight - (window.innerHeight - top));
      return { section, fraction: clamp((window.scrollY - layoutY(section) + top) / read) };
    }
    const candidates = [hero, story, ...sections];
    const section = [...candidates].reverse().find(item => item.getBoundingClientRect().top <= window.innerHeight * .5) || hero;
    const panel = section.querySelector('.container') || section;
    const margin = window.innerWidth <= 640 ? 24 : 36;
    const read = Math.max(1, panel.offsetHeight - (window.innerHeight - top - margin * 2 - 32));
    return { section, fraction: clamp((top + margin - panel.getBoundingClientRect().top) / read) };
  }
  function restorePosition(position) {
    if (!position) return;
    if (film?.restorePosition(position)) { queue(); return; }
    const top = window.innerWidth <= 640 ? 76 : 88;
    const margin = window.innerWidth <= 640 ? 24 : 36;
    const section = position.footer ? main.querySelector('.site-footer') : position.section;
    if (!section) return;
    const panel = section.querySelector('.container') || section;
    const read = Math.max(0, panel.offsetHeight - (window.innerHeight - top - margin * 2 - 32));
    window.scrollTo?.({ top: Math.max(0, layoutY(panel) - top - margin + read * (position.fraction || 0)), behavior: 'instant' });
    queue();
  }
  function configure(event) {
    const position = event?.detail?.position;
    const enabled = !(window.ARSCExperience?.reduced ?? reduceMotion.matches) && !shortViewport.matches;
    story.classList.toggle('is-cinematic', enabled);
    document.body.classList.toggle('journey-enabled', enabled);
    object.classList.toggle('journey-object', enabled);
    film?.configure(enabled);
    if (enabled) {
      document.body.append(object);
      measure();
    } else {
      metrics = null;
      scenes = [];
      document.body.classList.remove('in-cinematic');
      stage.append(object);
      chapters.forEach(chapter => { chapter.removeAttribute('style'); chapter.inert = false; });
      object.removeAttribute('style');
      word.removeAttribute('style');
    }
    if (position) requestAnimationFrame(() => { measure(); restorePosition(position); });
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queueMeasure);
  window.addEventListener('load', queueMeasure);
  if (!window.ARSCExperience) reduceMotion.addEventListener('change', configure);
  window.addEventListener('arsc:motion-change', configure);
  shortViewport.addEventListener('change', configure);
  configure();
  if (window.ARSCExperience) {
    window.ARSCExperience.capturePosition = capturePosition;
    window.ARSCExperience.selectProject = (panel, index) => film?.selectProject(panel, index);
    window.ARSCExperience.realign = () => {
      measure();
      if (window.location.hash === '#home') window.scrollTo({ top: 0, behavior: 'instant' });
      else film?.alignHash();
      queue();
    };
  }
  document.fonts.ready.then(() => { queueMeasure(); requestAnimationFrame(() => film?.alignHash()); });
  if ('ResizeObserver' in window) {
    const sizes = new WeakMap();
    const observer = new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        const size = `${entry.contentRect.width}:${entry.contentRect.height}`;
        const previous = sizes.get(entry.target);
        sizes.set(entry.target, size);
        // Include the first delivery: a fast async form or late font can
        // reflow between initial measurement and observer registration.
        if (previous !== size) changed = true;
      }
      if (changed) queueMeasure();
    });
    // Do not observe our own main spacers: rebuilding them would schedule
    // another rebuild. Real content and opening-stage sizes are the inputs.
    observer.observe(stage);
    observer.observe(hero);
    // Viewport-fixed panels can reflow without resizing their main/spacers.
    // Keep the reading distance accurate after font or content-size changes.
    sections.forEach(section => observer.observe(section.querySelector('.container')));
  }
})();
