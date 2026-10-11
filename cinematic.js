(() => {
  const story = document.querySelector('.cinematic-story');
  if (!story) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shortViewport = window.matchMedia('(max-height: 500px)');
  const stage = story.querySelector('.cinematic-stage');
  const object = story.querySelector('.cinematic-object');
  const word = story.querySelector('.cinematic-word');
  const chapters = [...story.querySelectorAll('.cinematic-chapter')];
  const cards = [...story.querySelectorAll('.cinematic-capability')];
  const step = story.querySelector('.cinematic-step');
  const hint = story.querySelector('.cinematic-scroll-hint');
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let frame = null;

  function render() {
    frame = null;
    if (reduceMotion.matches || shortViewport.matches) return;
    const bounds = story.getBoundingClientRect();
    document.body.classList.toggle('in-cinematic', bounds.top < window.innerHeight * .5 && bounds.bottom > window.innerHeight * .5);
    const pinnedTop = parseFloat(getComputedStyle(stage).top) || 0;
    const p = clamp((pinnedTop - bounds.top) / Math.max(1, story.offsetHeight - stage.offsetHeight));
    const mobile = window.innerWidth <= 640;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const swap = smooth((p - .2) / .3);
    const assemble = smooth((p - .56) / .3);
    const horizontalTravel = Math.min(w * .27, 340);
    const x = mobile ? Math.sin(p * Math.PI * 2) * w * .15 * (1 - assemble) : lerp(horizontalTravel, -horizontalTravel, swap) * (1 - assemble);
    const y = mobile ? h * .12 + assemble * h * .035 : assemble * h * .13;
    const scale = lerp(1, mobile ? .67 : .58, assemble);
    const rotation = lerp(-18, 20, swap) * (1 - assemble);
    object.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    word.style.transform = `translateX(calc(-50% + ${((p - .5) * w * .18).toFixed(2)}px))`;
    story.style.setProperty('--cinema-progress', p.toFixed(4));
    const visible = [1 - smooth((p - .22) / .12), smooth((p - .3) / .1) * (1 - smooth((p - .59) / .1)), smooth((p - .67) / .12)];
    chapters.forEach((chapter, i) => {
      chapter.style.opacity = visible[i].toFixed(3);
      chapter.style.visibility = visible[i] < .01 ? 'hidden' : 'visible';
      chapter.style.pointerEvents = visible[i] > .9 ? 'auto' : 'none';
      chapter.inert = visible[i] < .9;
    });
    cards.forEach((card, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const row = i < 2 ? -1 : 1;
      const initialX = side * Math.min(w * .34, 430);
      const initialY = mobile ? (i < 2 ? h * .02 : h * .31) : row * h * .28;
      const finalX = side * (mobile ? Math.min(w * .26, 105) : Math.min(w * .22, 310));
      const finalY = mobile ? (i < 2 ? h * .04 : h * .25) : h * .13 + row * h * .12;
      const cardX = lerp(initialX, finalX, assemble);
      const cardY = lerp(initialY, finalY, assemble);
      const opacity = lerp(.55, 1, assemble);
      card.style.transform = `translate(-50%, -50%) translate3d(${cardX.toFixed(2)}px, ${cardY.toFixed(2)}px, 0) rotate(${(side * row * 12 * (1 - assemble)).toFixed(2)}deg)`;
      card.style.opacity = opacity.toFixed(3);
    });
    step.textContent = `${p < .3 ? '01' : p < .67 ? '02' : '03'} / 03`;
    hint.textContent = p > .9 ? 'YOUR NEXT MOVE ↓' : 'SCROLL TO SET IT IN MOTION ↓';
  }

  function queue() { if (frame === null) frame = requestAnimationFrame(render); }
  function configure() {
    const staticScene = reduceMotion.matches || shortViewport.matches;
    story.classList.toggle('is-cinematic', !staticScene);
    if (staticScene) {
      document.body.classList.remove('in-cinematic');
      chapters.forEach(chapter => { chapter.removeAttribute('style'); chapter.inert = false; });
      object.removeAttribute('style');
      word.removeAttribute('style');
    } else queue();
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  reduceMotion.addEventListener('change', configure);
  shortViewport.addEventListener('change', configure);
  configure();
})();
