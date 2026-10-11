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
  const sections = [...document.querySelectorAll('main > section')].filter(section => section !== hero && section !== story);
  const labels = ['MAKE ROOM', 'CONNECT THE CAPABILITIES', 'YOUR WAY FORWARD', 'PROGRESS, PROVEN', 'THE ARSC DIFFERENCE', 'FROM IDEA TO ACTION', 'ONE COLLECTIVE', 'REAL PEOPLE', 'YOUR NEXT MOVE'];
  // Each chapter has its own camera beat; positions are viewport-relative and
  // sizes are relative to the flyover, rather than a repeating side-to-side loop.
  const beats = [
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
  const cameras = [
    [0, 150, 0, 10, .1], [-90, 70, -2.8, 6, .07], [0, 40, 0, 5, .13],
    [30, -110, 1.2, -8, .06], [90, 80, 2.5, 6, .09], [-40, 90, -3, 8, .1],
    [0, 60, 0, -5, -.08], [-120, 50, -1.5, 0, .05], [0, 80, 0, 4, .04]
  ];
  const surfaces = ['#f4f1ec', '#0b0b0c', '#f4f1ec', '#151617', '#eeeae4', '#0d0d0e', '#f4f1ec', '#09090a', '#161719'];
  const actors = sections.map((section, i) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'movie-transition';
    backdrop.setAttribute('aria-hidden', 'true');
    section.append(backdrop);
    section.style.setProperty('--movie-previous-surface', surfaces[i - 1] || '#0b0b0c');
    const heading = section.querySelector('.positioning-heading, .services-intro, .partnership-intro, .proof-intro, .why-heading, .process-intro, .about-heading, .team-intro, .contact-heading');
    if (heading) heading.classList.add('movie-heading');
    const pieces = [...section.querySelectorAll('.service-card, .partnership-card, .proof-stat, .case-study-card, .why-item, .process-step, .about-content, .team-lineup, .collective-note, .contact-panel')];
    pieces.forEach(piece => piece.classList.add('movie-piece'));
    return { section, panel: section.querySelector('.container'), pieces };
  });
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let frame = null, metrics, route = [], scenes = [], lastProgress = -1, copyScene = null;

  // Offset coordinates ignore the camera transforms, so resize measurements
  // cannot feed the current animation back into its own timeline.
  function layoutY(element) {
    let y = 0;
    for (let node = element; node; node = node.offsetParent) y += node.offsetTop;
    return y;
  }

  // Measure only when layout changes; scrolling uses cached waypoints.
  function measure() {
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
      heroDeparture: Math.max(0, start - h * .7) };
    const cruisingSize = mobile ? 168 : Math.min(420, Math.max(300, w * .26));
    const landingSize = mobile ? 146 : Math.min(310, w * .32);
    const flyoverSize = mobile ? Math.min(w * .72, 270) : Math.min(w * .46, 640);
    scenes = actors.map(({ section, panel, pieces }, i) => {
      const [x, y, roll, pitch, zoom] = cameras[i] || cameras[cameras.length - 1];
      const properties = {
        '--camera-x': `${mobile ? 0 : x}px`, '--camera-y': `${mobile ? (y < 0 ? -24 : 56) : y}px`,
        '--camera-roll': `${mobile ? 0 : roll}deg`, '--camera-pitch': `${mobile ? 0 : pitch}deg`,
        '--camera-zoom': mobile ? '.025' : String(zoom), '--camera-exit-y': mobile ? '-28px' : '-72px'
      };
      for (const [key, value] of Object.entries(properties)) section.style.setProperty(key, value);
      const sectionTop = layoutY(section), sectionBottom = sectionTop + section.offsetHeight;
      const contentTop = layoutY(panel);
      const settle = contentTop - Math.max(top + 60, h * .38);
      return { section, enter: contentTop - h * 1.08, settle,
        leave: Math.max(settle + 1, sectionBottom - h * .7), end: sectionBottom - h * .08,
        wipeStart: sectionTop - h, wipeEnd: sectionTop - h * .25,
        pieces: pieces.map((piece, j) => {
          const pieceTop = layoutY(piece), side = (j % 3) - 1;
          piece.style.setProperty('--piece-x', `${mobile ? 0 : side * 64}px`);
          piece.style.setProperty('--piece-y', `${mobile ? 32 : 72 + (j % 3) * 18}px`);
          piece.style.setProperty('--piece-roll', `${mobile ? 0 : side * 4}deg`);
          return { element: piece, enter: pieceTop - h * 1.02, settle: pieceTop - h * .68 };
        }) };
    });
    route = [{ scroll: end, x: stageW / 2, worldY: end + top + stageH * (mobile ? .655 : .63), size: base * (mobile ? .67 : .58), rotate: 0, yaw: 0, pitch: 0, opacity: 1 }];
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
      const travel = mobile ? .55 : 1;
      const shot = (at, pose = {}, opacity = 1, copy = 1, curved = false) => route.push({
        scroll: at, scene: i, copy, side: Math.sign(beat.exit.x) || 1,
        x: centerX + (pose.x || 0) * w * travel,
        worldY: worldY + (pose.y || 0) * h * travel,
        size: Math.max(landingSize, pose.size ? flyoverSize * pose.size : cruisingSize),
        rotate: turn + (pose.rotate || 0) * (mobile ? .12 : 1),
        yaw: (pose.yaw || 0) * travel, pitch: (pose.pitch || 0) * travel, opacity,
        arcX: curved ? (beat.curveX || 0) * w * travel : 0,
        arcY: curved ? (beat.curveY || 0) * h * travel : 0
      });
      shot(entrance, beat.enter, mobile ? .2 : .3);
      shot(lerp(entrance, dock, .52), beat.peak, .95, .65, true);
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
    object.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) perspective(900px) rotateY(${yaw.toFixed(2)}deg) rotateX(${pitch.toFixed(2)}deg) rotate(${rotation.toFixed(2)}deg) scale(${(size / metrics.base).toFixed(4)})`;
    object.style.opacity = opacity.toFixed(3);
  }

  function compose(scene = null, opacity = 1, side = 1) {
    if (copyScene !== scene && copyScene !== null) {
      sections[copyScene].style.setProperty('--movie-copy', '1');
      sections[copyScene].style.setProperty('--movie-copy-shift', '0px');
    }
    copyScene = scene;
    if (scene === null) return;
    sections[scene].style.setProperty('--movie-copy', opacity.toFixed(3));
    sections[scene].style.setProperty('--movie-copy-shift', `${((1 - opacity) * side * (metrics.mobile ? 20 : 56)).toFixed(2)}px`);
  }

  function renderScenes(scroll) {
    const write = (element, key, value) => {
      const rounded = value.toFixed(4);
      if (element.style.getPropertyValue(key) !== rounded) element.style.setProperty(key, rounded);
    };
    scenes.forEach(scene => {
      write(scene.section, '--movie-entry', 1 - smooth((scroll - scene.enter) / Math.max(1, scene.settle - scene.enter)));
      write(scene.section, '--movie-exit', smooth((scroll - scene.leave) / Math.max(1, scene.end - scene.leave)));
      write(scene.section, '--movie-wipe', 1 - smooth((scroll - scene.wipeStart) / Math.max(1, scene.wipeEnd - scene.wipeStart)));
      scene.pieces.forEach(piece => write(piece.element, '--piece-entry', 1 - smooth((scroll - piece.enter) / Math.max(1, piece.settle - piece.enter))));
    });
  }

  function render() {
    frame = null;
    if (!metrics || !story.classList.contains('is-cinematic')) return;
    const scroll = window.scrollY;
    renderScenes(scroll);
    const { mobile, start, end, stageW: w, stageH: h, top, base } = metrics;
    const p = clamp((scroll - start) / Math.max(1, end - start));
    document.body.classList.toggle('in-cinematic', scroll > start - h * .4 && scroll < end + h * .4);
    const swap = smooth((p - .08) / .38), assemble = smooth((p - .44) / .38);
    const x = mobile ? Math.sin(p * Math.PI * 2) * w * .15 * (1 - assemble) : lerp(Math.min(w * .27, 340), -Math.min(w * .27, 340), swap) * (1 - assemble);
    const y = mobile ? h * .12 + assemble * h * .035 : assemble * h * .13;
    const size = base * lerp(1, mobile ? .67 : .58, assemble);
    const rotation = lerp(-18, 20, swap) * (1 - assemble);
    if (scroll <= end) compose();
    if (scroll < start) {
      const t = smooth((scroll - metrics.heroDeparture) / Math.max(1, start - metrics.heroDeparture));
      place(lerp(metrics.heroX, w / 2 + x, t), lerp(metrics.heroY - scroll, top + h / 2 + y, t), lerp(metrics.heroSize, size, t), rotation * t);
    } else if (scroll <= end) {
      place(w / 2 + x, top + h / 2 + y, size, rotation);
    } else {
      let i = 0;
      while (i < route.length - 2 && scroll > route[i + 1].scroll) i++;
      const a = route[i], b = route[i + 1];
      const linear = clamp((scroll - a.scroll) / Math.max(1, b.scroll - a.scroll));
      const t = smooth(linear);
      const scene = b.scene ?? a.scene ?? null;
      compose(scene, lerp(a.scene === scene ? a.copy ?? 1 : 1, b.copy ?? 1, t), b.side ?? 1);
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
      card.style.opacity = lerp(.55, 1, assemble).toFixed(3);
    });
    step.textContent = `${p < .22 ? '01' : p < .59 ? '02' : '03'} / 03`;
    hint.textContent = p > .86 ? 'FOLLOW THE MOMENTUM ↓' : 'SCROLL TO SET IT IN MOTION ↓';
  }

  function queue() { if (frame === null) frame = requestAnimationFrame(render); }
  function configure() {
    const enabled = !reduceMotion.matches && !shortViewport.matches;
    story.classList.toggle('is-cinematic', enabled);
    document.body.classList.toggle('journey-enabled', enabled);
    object.classList.toggle('journey-object', enabled);
    if (enabled) {
      document.body.append(object);
      measure();
    } else {
      compose();
      metrics = null;
      scenes = [];
      document.body.classList.remove('in-cinematic');
      stage.append(object);
      chapters.forEach(chapter => { chapter.removeAttribute('style'); chapter.inert = false; });
      object.removeAttribute('style');
      word.removeAttribute('style');
    }
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  reduceMotion.addEventListener('change', configure);
  shortViewport.addEventListener('change', configure);
  configure();
  document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.querySelector('main'));
})();
