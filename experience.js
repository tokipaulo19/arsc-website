/* Native chapter links work without JavaScript. This layer adds a remembered
   motion choice and an active chapter, without intercepting scrolling. */
(() => {
  const menu = document.querySelector('.chapter-menu');
  if (!menu) return;
  const root = document.documentElement;
  const summary = menu.querySelector('summary');
  const links = [...menu.querySelectorAll('[data-chapter]')];
  const current = menu.querySelector('.chapter-current');
  const choice = menu.querySelector('.motion-choice');
  const button = menu.querySelector('.motion-toggle');
  const note = menu.querySelector('#motion-note');
  const system = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'arsc-less-motion';
  let manual = false, reduced = false, chapter = 'home', canRemember = true;
  let anchors = [], header = 88, measureFrame = null, scrollFrame = null;
  try { manual = localStorage.getItem(key) === '1'; } catch { canRemember = false; }

  function setChapter(id) {
    const selected = links.find(link => link.dataset.chapter === id);
    if (!selected || id === chapter) return;
    chapter = id;
    links.forEach(link => {
      if (link === selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    current.textContent = `Now: ${selected.textContent.trim()}`;
  }

  window.ARSCExperience = {
    get reduced() { return reduced; },
    get chapter() { return chapter; },
    setChapter
  };

  function applyPreference(save = false) {
    const next = manual || system.matches;
    const position = next !== reduced ? window.ARSCExperience.capturePosition?.() : null;
    const changed = next !== reduced;
    reduced = next;
    root.classList.toggle('less-motion', reduced);
    button.setAttribute('aria-pressed', String(reduced));
    button.disabled = system.matches;
    if (save) {
      try { localStorage.setItem(key, manual ? '1' : '0'); canRemember = true; } catch { canRemember = false; }
    }
    note.textContent = system.matches
      ? 'Less motion follows your device setting. Change that setting to enable cinematic scrolling.'
      : reduced ? `Less motion is on. The page scrolls normally; your choice ${canRemember ? 'is remembered on this device' : 'applies for this visit'}.`
        : 'Cinematic scrolling is on. Choose a calmer, normally scrolling page.';
    if (changed) window.dispatchEvent(new CustomEvent('arsc:motion-change', { detail: { reduced, position } }));
  }
  choice.hidden = false;
  applyPreference();
  button.addEventListener('click', () => {
    if (system.matches) return;
    manual = !manual;
    applyPreference(true);
  });
  system.addEventListener('change', () => applyPreference());
  window.addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    try { manual = localStorage.getItem(key) === '1'; } catch { return; }
    applyPreference();
  });

  function closeMenu(focus = false) {
    menu.open = false;
    if (focus) summary.focus();
  }
  links.forEach(link => link.addEventListener('click', () => {
    closeMenu();
    // A repeated link does not fire hashchange, but should still return to the
    // chapter's beginning. Let the browser manage history for every link.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (document.body.classList.contains('film-enabled')) window.ARSCExperience.realign?.();
      else {
        const target = document.getElementById(link.dataset.chapter);
        target?.setAttribute('tabindex', '-1');
        target?.focus({ preventScroll: true });
      }
    }));
  }));
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !menu.open) return;
    event.preventDefault(); closeMenu(true);
  });
  window.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) closeMenu();
  }, { passive: true });
  menu.addEventListener('focusout', event => {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) closeMenu();
  });

  function layoutY(element) {
    let y = 0;
    for (let node = element; node; node = node.offsetParent) y += node.offsetTop;
    return y;
  }
  function updateChapter() {
    scrollFrame = null;
    if (document.body.classList.contains('film-enabled')) return;
    const line = window.scrollY + header + Math.min(window.innerHeight * .25, 160);
    const active = [...anchors].reverse().find(anchor => anchor.top <= line);
    if (active && active.id !== chapter) setChapter(active.id);
  }
  function measure() {
    measureFrame = null;
    header = document.querySelector('.nav-wrap')?.offsetHeight || 88;
    anchors = links.map(link => {
      const target = document.getElementById(link.dataset.chapter);
      return target ? { id: target.id, top: layoutY(target) } : null;
    }).filter(Boolean).sort((a, b) => a.top - b.top);
    updateChapter();
  }
  function queueMeasure() {
    if (measureFrame === null) measureFrame = requestAnimationFrame(measure);
  }
  window.addEventListener('scroll', () => {
    if (!document.body.classList.contains('film-enabled') && scrollFrame === null) scrollFrame = requestAnimationFrame(updateChapter);
  }, { passive: true });
  for (const event of ['resize', 'load', 'arsc:motion-change']) window.addEventListener(event, queueMeasure);
  document.fonts?.ready.then(queueMeasure);
  if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(document.querySelector('main'));
  queueMeasure();
})();
