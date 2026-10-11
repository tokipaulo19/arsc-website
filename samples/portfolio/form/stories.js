(function () {
  "use strict";
  const slider = document.querySelector("[data-story-range]");
  const image = document.querySelector("[data-story-comparison]");
  const output = document.querySelector("[data-story-output]");
  function update() {
    const percent = PortfolioMotionMath.clamp(slider.value, 0, 100);
    image.style.setProperty("--split", `${percent}%`);
    slider.setAttribute(
      "aria-valuetext",
      `${percent}% starting-point photograph, ${100 - percent}% finding-a-rhythm photograph`,
    );
    output.textContent = `${percent}% / ${100 - percent}%`;
  }
  slider.addEventListener("input", update);
  update();
})();
