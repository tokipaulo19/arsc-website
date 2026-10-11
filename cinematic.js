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
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let frame = null, metrics, route = [], lastProgress = -1, copyScene = null;

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
    const edgeX = side => side > 0 ? w - cruisingSize * .18 : cruisingSize * .18;
    route = [{ scroll: end, x: stageW / 2, worldY: end + top + stageH * (mobile ? .655 : .63), size: base * (mobile ? .67 : .58), rotate: 0, opacity: 1 }];
    const landingPoints = ports.map(port => port.getBoundingClientRect());
    landingPoints.forEach((box, i) => {
      const worldY = box.top + scroll + box.height / 2;
      const dock = worldY - h * .5;
      const previousDock = i ? landingPoints[i - 1].top + scroll + landingPoints[i - 1].height / 2 - h * .5 : end;
      const nextDock = i < landingPoints.length - 1 ? landingPoints[i + 1].top + scroll + landingPoints[i + 1].height / 2 - h * .5 : document.documentElement.scrollHeight - h;
      const entrance = dock - Math.min(h * .3, (dock - previousDock) * .34);
      const hold = Math.max(dock + 1, worldY - Math.max(top + (mobile ? 96 : 160), h * .28));
      const exit = hold + Math.min(h * .13, Math.max(1, nextDock - hold) * .25);
      const departureSide = i % 2 ? -1 : 1;
      const arrivalSide = i ? -departureSide : 1;
      const centerX = box.left + box.width / 2;
      const shot = point => route.push({ scene: i, copy: 1, side: departureSide, ...point });
      // A full-size flyover crosses the section's reserved title band. Between
      // chapters the mark remains oversized, but subdued behind the reading.
      shot({ scroll: entrance, x: edgeX(arrivalSide), worldY, size: cruisingSize, rotate: arrivalSide * -28, opacity: mobile ? .18 : .28, copy: .9 });
      shot({ scroll: lerp(entrance, dock, .58), x: centerX - arrivalSide * w * (mobile ? .07 : .13), worldY, size: flyoverSize, rotate: arrivalSide * 38, opacity: .95, copy: .35 });
      shot({ scroll: dock, x: centerX, worldY, size: landingSize, rotate: 0, opacity: 1 });
      shot({ scroll: hold, x: centerX, worldY, size: landingSize, rotate: 0, opacity: 1 });
      shot({ scroll: exit, x: edgeX(departureSide), worldY, size: cruisingSize, rotate: departureSide * -28, opacity: mobile ? .18 : .28 });
    });
    const last = route[route.length - 1];
    const bottom = Math.max(last.scroll + 1, document.documentElement.scrollHeight - h);
    route.push({ scroll: bottom, x: last.x, worldY: bottom + h * .72, size: cruisingSize, rotate: 18, opacity: .2 });
    lastProgress = -1;
    queue();
  }

  function place(x, y, size, rotation, opacity = 1) {
    object.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%) perspective(900px) rotateY(${(rotation * .55).toFixed(2)}deg) rotate(${rotation.toFixed(2)}deg) scale(${(size / metrics.base).toFixed(4)})`;
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

  function render() {
    frame = null;
    if (!metrics || !story.classList.contains('is-cinematic')) return;
    const scroll = window.scrollY;
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
      const cruise = a.opacity < .3 && b.opacity < .3;
      const drift = cruise ? Math.sin(linear * Math.PI) * (mobile ? 10 : 32) * (a.x > w / 2 ? -1 : 1) : 0;
      place(lerp(a.x, b.x, t) + drift, lerp(a.worldY, b.worldY, linear) - scroll, lerp(a.size, b.size, t), lerp(a.rotate, b.rotate, t), lerp(a.opacity, b.opacity, t));
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
