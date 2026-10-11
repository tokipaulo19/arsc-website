(function (root) {
  "use strict";
  const clamp = (n, low = 0, high = 1) =>
    Math.min(high, Math.max(low, Number(n) || 0));
  function progress(top, height, viewport) {
    return clamp((viewport - top) / Math.max(1, height + viewport));
  }
  function coffeePose(p, width, height) {
    p = clamp(p);
    // A broad figure-eight inside the artwork, never over menu or form controls.
    return {
      x: Math.sin(p * Math.PI * 2) * Math.max(0, width - 200) * 0.36,
      y: Math.cos(p * Math.PI * 2) * Math.max(0, height - 200) * 0.25,
      angle: -24 + p * 360,
    };
  }
  root.PortfolioMotionMath = { clamp, progress, coffeePose };
  if (typeof document === "undefined") return;
  const body = document.body;
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const controls = [...document.querySelectorAll("[data-motion-toggle]")];
  const listeners = new Set();
  let paused = false;
  let enabled = false;
  function refresh() {
    enabled = !paused && !media.matches && !document.hidden;
    body.dataset.motion = enabled ? "running" : "stopped";
    document.documentElement.dataset.motion = body.dataset.motion;
    controls.forEach((button) => {
      button.hidden = false;
      button.disabled = media.matches;
      button.textContent = media.matches
        ? "REDUCED MOTION ON"
        : paused
          ? "PLAY MOTION ▶"
          : "PAUSE MOTION Ⅱ";
      button.setAttribute("aria-pressed", String(paused || media.matches));
      button.setAttribute(
        "aria-label",
        media.matches
          ? "Animations disabled by your reduced motion setting"
          : paused
            ? "Play animations"
            : "Pause animations",
      );
    });
    listeners.forEach((fn) => fn(enabled));
  }
  controls.forEach((button) =>
    button.addEventListener("click", () => {
      paused = !paused;
      refresh();
    }),
  );
  media.addEventListener("change", refresh);
  document.addEventListener("visibilitychange", refresh);
  root.PortfolioMotion = {
    enabled: () => enabled,
    subscribe(fn) {
      listeners.add(fn);
      fn(enabled);
      return () => listeners.delete(fn);
    },
  };
  // Content is visible before JS and stays visible if observation is unsupported.
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          if (enabled)
            target.animate(
              [
                { opacity: 0.65, transform: "translateY(18px)" },
                { opacity: 1, transform: "none" },
              ],
              { duration: 650, easing: "cubic-bezier(.2,.65,.3,1)" },
            );
          observer.unobserve(target);
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
  }
  listeners.add((on) => {
    if (!on)
      document
        .querySelectorAll("[data-reveal]")
        .forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
  });
  refresh();
})(typeof window !== "undefined" ? window : globalThis);
