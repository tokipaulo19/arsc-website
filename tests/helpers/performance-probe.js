// Local-only measurement harness. No analytics, storage, network or user data.
(() => {
  const results = { viewport: '', lcp: null, cls: 0, longTasks: 0, longTaskMs: 0,
    layoutReads: 0, styleWrites: 0, animationFrames: 0, slowFrames: 0, maxFrameMs: 0 };
  const rect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (...args) {
    results.layoutReads++; return rect.apply(this, args);
  };
  const set = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (...args) {
    results.styleWrites++; return set.apply(this, args);
  };
  for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask']) {
    try {
      new PerformanceObserver(list => list.getEntries().forEach(entry => {
        if (type === 'largest-contentful-paint') results.lcp = Math.round(entry.startTime);
        if (type === 'layout-shift' && !entry.hadRecentInput) results.cls += entry.value;
        if (type === 'longtask') { results.longTasks++; results.longTaskMs += entry.duration; }
      })).observe({ type, buffered: true });
    } catch { /* Capability varies by browser; unsupported values remain null. */ }
  }
  let previous = null;
  function sample(time) {
    if (document.body?.classList.contains('film-playing')) {
      if (previous !== null) {
        const gap = time - previous;
        results.animationFrames++; results.maxFrameMs = Math.max(results.maxFrameMs, gap);
        if (gap > 34) results.slowFrames++;
      }
      previous = time;
    } else previous = null;
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
  setInterval(() => {
    if (!document.body) return;
    let output = document.getElementById('performance-report');
    if (!output) { output = document.createElement('output'); output.id = 'performance-report'; output.hidden = true; document.body.append(output); }
    const readingPanel = [...document.querySelectorAll('.journey-section > .container')].find(panel => panel.style.visibility === 'visible' && !panel.inert);
    output.dataset.chapter = document.body.classList.contains('film-enabled')
      ? (scrollY < 1 ? 'home' : readingPanel?.parentElement.id || 'transition') : 'less-motion';
    results.viewport = `${innerWidth}x${innerHeight}`;
    const resources = performance.getEntriesByType('resource');
    const images = resources.filter(entry => entry.initiatorType === 'img');
    output.textContent = JSON.stringify({ ...results, cls: +results.cls.toFixed(4),
      longTaskMs: Math.round(results.longTaskMs), maxFrameMs: Math.round(results.maxFrameMs),
      imageRequests: images.length, imageTransferBytes: images.reduce((sum, entry) => sum + entry.transferSize, 0),
      navigationMs: Math.round(performance.getEntriesByType('navigation')[0]?.loadEventEnd || 0) });
  }, 1000);
})();
