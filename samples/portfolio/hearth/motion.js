(function () {
  "use strict";
  const journey = document.querySelector("[data-coffee-journey]");
  const stage = document.querySelector("[data-coffee-stage]");
  const cup = document.querySelector("[data-coffee-cup]");
  const meter = document.querySelector("[data-coffee-progress]");
  let frame = 0;
  let inView = true;
  function render() {
    frame = 0;
    if (!PortfolioMotion.enabled() || !inView) return;
    const rect = journey.getBoundingClientRect();
    const p = PortfolioMotionMath.progress(rect.top, rect.height, innerHeight);
    const pose = PortfolioMotionMath.coffeePose(
      p,
      stage.clientWidth,
      stage.clientHeight,
    );
    cup.style.transform = `translate(${pose.x}px, ${pose.y}px) rotate(${pose.angle}deg)`;
    meter.style.transform = `scaleX(${p})`;
  }
  function schedule() {
    if (PortfolioMotion.enabled() && inView && !frame)
      frame = requestAnimationFrame(render);
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      stage.dataset.inView = String(inView);
      if (inView) schedule();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(stage);
  }
  PortfolioMotion.subscribe((on) => {
    if (on) schedule();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
      // Static composition when motion is off, including OS reduced motion.
      cup.style.transform = "rotate(-18deg)";
      meter.style.transform = "scaleX(1)";
    }
  });
})();
