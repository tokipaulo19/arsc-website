(function () {
  "use strict";
  const stage = document.querySelector("[data-tech-stage]");
  const descriptions = {
    processor: [
      "01 / THE PROCESSOR",
      "The starting point for the build.",
      "Choose around the work you do. The exact processor, socket and motherboard need to be reviewed together before choosing supporting parts.",
    ],
    memory: [
      "02 / THE MEMORY",
      "Room for the things you keep open.",
      "Capacity, generation and board support belong in the same conversation. Explore the fictional DDR5 kit below; a real system needs its exact motherboard checked.",
    ],
    storage: [
      "03 / THE STORAGE",
      "A home for projects and everyday files.",
      "Start with the space you need, the slot your machine supports and your backup plan. Installation and file migration are separate decisions.",
    ],
  };
  document.querySelectorAll("[data-component]").forEach((button) =>
    button.addEventListener("click", () => {
      const key = button.dataset.component;
      const info = descriptions[key];
      if (!info) return;
      stage.dataset.selected = key;
      document
        .querySelectorAll("[data-component]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      document.querySelector("[data-component-kicker]").textContent = info[0];
      document.querySelector("[data-component-title]").textContent = info[1];
      document.querySelector("[data-component-description]").textContent =
        info[2];
    }),
  );
  let pointerFrame = 0;
  stage.addEventListener("pointermove", (event) => {
    if (
      !PortfolioMotion.enabled() ||
      event.pointerType !== "mouse" ||
      pointerFrame
    )
      return;
    const rect = stage.getBoundingClientRect();
    const x = PortfolioMotionMath.clamp(
      (event.clientX - rect.left) / rect.width,
    );
    const y = PortfolioMotionMath.clamp(
      (event.clientY - rect.top) / rect.height,
    );
    pointerFrame = requestAnimationFrame(() => {
      stage.style.setProperty("--tilt-x", `${(y - 0.5) * -8}deg`);
      stage.style.setProperty("--tilt-y", `${(x - 0.5) * 8}deg`);
      pointerFrame = 0;
    });
  });
  function resetTilt() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    stage.style.setProperty("--tilt-x", "0deg");
    stage.style.setProperty("--tilt-y", "0deg");
  }
  stage.addEventListener("pointerleave", resetTilt);
  const lines = [...document.querySelectorAll("[data-boot-line]")];
  const replay = document.querySelector("[data-replay-boot]");
  let animations = [];
  function replayBoot() {
    animations.forEach((a) => a.cancel());
    animations = [];
    if (!PortfolioMotion.enabled()) return;
    animations = lines.map((line, i) =>
      line.animate(
        [
          { opacity: 0.2, transform: "translateX(-8px)" },
          { opacity: 1, transform: "none" },
        ],
        {
          duration: 700,
          delay: i * 300,
          fill: "backwards",
          easing: "ease-out",
        },
      ),
    );
  }
  replay.addEventListener("click", replayBoot);
  PortfolioMotion.subscribe((on) => {
    replay.disabled = !on;
    if (!on) {
      resetTilt();
      animations.forEach((a) => a.cancel());
    }
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          target.dataset.inView = String(isIntersecting);
          if (target.classList.contains("c-terminal") && isIntersecting)
            replayBoot();
        });
      },
      { threshold: 0.05 },
    );
    document
      .querySelectorAll("[data-tech-stage], .c-terminal, .c-hero")
      .forEach((el) => observer.observe(el));
  }
})();
