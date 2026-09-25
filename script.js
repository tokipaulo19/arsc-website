const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");

function closeMobileMenu() {
  if (!menuToggle || !mobileMenu) return;

  mobileMenu.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("is-open");

    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1050) {
      closeMobileMenu();
    }
  });
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const countItems = document.querySelectorAll(
  ".proof-stat strong, .proof-secondary strong"
);
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const countFormatter = new Intl.NumberFormat("en-US");

const pageSignalValue = document.querySelector(".page-signal-value");
let signalFrame = null;

function updatePageSignal() {
  const scrollableHeight =
    document.documentElement.scrollHeight - window.innerHeight;
  const progress =
    scrollableHeight > 0
      ? Math.min(Math.max(window.scrollY / scrollableHeight, 0), 1)
      : 0;
  const percentage = Math.round(progress * 100);

  document.documentElement.style.setProperty(
    "--signal-progress",
    `${percentage}%`
  );

  if (pageSignalValue) {
    pageSignalValue.textContent = String(percentage).padStart(3, "0");
  }

  signalFrame = null;
}

function queuePageSignalUpdate() {
  if (signalFrame !== null) return;

  signalFrame = window.requestAnimationFrame(updatePageSignal);
}

window.addEventListener("scroll", queuePageSignalUpdate, { passive: true });
window.addEventListener("resize", queuePageSignalUpdate);
updatePageSignal();

const commandPanel = document.querySelector(".command-panel");
const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;

if (commandPanel && supportsFinePointer && !prefersReducedMotion) {
  commandPanel.addEventListener("pointermove", (event) => {
    const panelBounds = commandPanel.getBoundingClientRect();
    const horizontalPosition =
      (event.clientX - panelBounds.left) / panelBounds.width - 0.5;
    const verticalPosition =
      (event.clientY - panelBounds.top) / panelBounds.height - 0.5;

    commandPanel.style.setProperty(
      "--tilt-x",
      `${horizontalPosition * 3.5}deg`
    );
    commandPanel.style.setProperty(
      "--tilt-y",
      `${verticalPosition * -3.5}deg`
    );
  });

  commandPanel.addEventListener("pointerleave", () => {
    commandPanel.style.setProperty("--tilt-x", "0deg");
    commandPanel.style.setProperty("--tilt-y", "0deg");
  });
}

const scrollScenes = Array.from(document.querySelectorAll("main > section"));
const motionLayerDefinitions = [
  [".positioning-heading, .positioning-copy", 0.28],
  [".services-intro, .partnership-intro, .proof-intro", 0.28],
  [".services-grid, .partnership-grid, .proof-grid", 0.72],
  [".proof-secondary, .case-studies-heading", 0.42],
  [".case-studies-grid, .why-points", 0.7],
  [".process-intro, .about-heading, .about-content", 0.3],
  [".process-grid, .team-lineup", 0.72],
  [".team-intro, .collective-note", 0.34],
  [".contact-heading, .contact-panel", 0.44]
];
const motionLayers = [];
const whyItems = Array.from(document.querySelectorAll(".why-item"));
const processSteps = Array.from(document.querySelectorAll(".process-step"));
const teamPortraits = Array.from(document.querySelectorAll(".team-portrait img"));
const processSection = document.querySelector(".process-section");
const contactSection = document.querySelector(".contact-section");
const cursorReactor = document.querySelector(".cursor-reactor");
const sceneDockIndex = document.querySelector(".scene-dock-index");
const sceneDockLabel = document.querySelector(".scene-dock-label");
const interactiveCards = Array.from(
  document.querySelectorAll(
    ".service-card, .partnership-card, .proof-stat, .case-study-card, .process-step"
  )
);
const sceneLabels = [
  "COMMAND",
  "CHALLENGE",
  "CAPABILITIES",
  "PARTNERSHIP",
  "PROOF",
  "WHY ARSC",
  "PROCESS",
  "COLLECTIVE",
  "TEAM",
  "CONTACT"
];
let motionFrame = null;
let activeSceneIndex = -1;
let previousScrollY = window.scrollY;

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

if (!prefersReducedMotion) {
  document.documentElement.classList.add("motion-ready");

  scrollScenes.forEach((section, index) => {
    section.classList.add("scroll-scene");
    section.style.setProperty("--scene-index", index);
    section.dataset.scene = String(index + 1).padStart(2, "0");
    section.dataset.sceneLabel = sceneLabels[index] || `SCENE ${index + 1}`;

    const scenePortal = document.createElement("div");
    scenePortal.className = "scene-portal";
    scenePortal.innerHTML = "<i></i><span></span><i></i>";
    section.prepend(scenePortal);

    const sceneOrdinal = document.createElement("span");
    sceneOrdinal.className = "scene-ordinal";
    sceneOrdinal.textContent = section.dataset.scene;
    section.prepend(sceneOrdinal);

    section
      .querySelectorAll("h1, h2, .case-studies-heading h3")
      .forEach((heading) => heading.classList.add("kinetic-heading"));
  });

  motionLayerDefinitions.forEach(([selector, depth]) => {
    document.querySelectorAll(selector).forEach((element) => {
      const section = element.closest("section");

      if (!section) return;

      element.classList.add("motion-layer");
      motionLayers.push({ element, section, depth });
    });
  });

  [
    ".services-grid .service-card",
    ".partnership-grid .partnership-card",
    ".proof-grid .proof-stat",
    ".case-studies-grid .case-study-card",
    ".why-points .why-item",
    ".process-grid .process-step",
    ".team-lineup .team-member"
  ].forEach((selector) => {
    document.querySelectorAll(selector).forEach((item, index) => {
      item.style.setProperty("--motion-order", index);
    });
  });
}

function updateScrollScenes() {
  if (prefersReducedMotion) {
    motionFrame = null;
    return;
  }

  const viewportHeight = window.innerHeight;
  const documentProgress = clamp(
    window.scrollY /
      Math.max(document.documentElement.scrollHeight - viewportHeight, 1)
  );
  const scrollVelocity = clamp(
    Math.abs(window.scrollY - previousScrollY) / 80,
    0,
    1
  );
  const scrollDirection = window.scrollY >= previousScrollY ? 1 : -1;

  previousScrollY = window.scrollY;

  document.documentElement.style.setProperty(
    "--document-motion",
    documentProgress.toFixed(4)
  );
  document.documentElement.style.setProperty(
    "--grid-shift-y",
    `${(documentProgress * 240).toFixed(2)}px`
  );
  document.documentElement.style.setProperty(
    "--beam-y",
    `${(documentProgress * 92).toFixed(2)}vh`
  );
  document.documentElement.style.setProperty(
    "--scroll-velocity",
    scrollVelocity.toFixed(3)
  );
  document.documentElement.style.setProperty(
    "--scroll-lean",
    `${(scrollDirection * scrollVelocity * 1.4).toFixed(2)}deg`
  );
  document.documentElement.style.setProperty(
    "--aura-x",
    `${(-9 + documentProgress * 18).toFixed(2)}vw`
  );
  document.documentElement.style.setProperty(
    "--aura-y",
    `${(documentProgress * 44).toFixed(2)}vh`
  );

  let strongestSceneIndex = 0;
  let strongestSceneFocus = -1;

  scrollScenes.forEach((section, index) => {
    const bounds = section.getBoundingClientRect();
    const progress = clamp(
      (viewportHeight - bounds.top) / (viewportHeight + bounds.height)
    );
    const focus = clamp(1 - Math.abs(progress - 0.5) * 2);
    const shift = (0.5 - progress) * 52;
    const energy = Math.pow(focus, 0.72);

    if (focus > strongestSceneFocus) {
      strongestSceneFocus = focus;
      strongestSceneIndex = index;
    }

    section.style.setProperty("--scene-progress", progress.toFixed(4));
    section.style.setProperty("--scene-focus", focus.toFixed(4));
    section.style.setProperty("--scene-shift", `${shift.toFixed(2)}px`);
    section.style.setProperty("--scene-energy", energy.toFixed(4));
    section.style.setProperty(
      "--scene-scale",
      (0.965 + energy * 0.035).toFixed(4)
    );
    section.style.setProperty(
      "--scene-glow",
      (0.04 + energy * 0.2).toFixed(3)
    );
    section.style.setProperty(
      "--scene-line",
      `${(progress * 100).toFixed(2)}%`
    );
  });

  scrollScenes.forEach((section, index) => {
    section.classList.toggle("is-active-scene", index === strongestSceneIndex);
  });

  if (strongestSceneIndex !== activeSceneIndex) {
    activeSceneIndex = strongestSceneIndex;

    if (sceneDockIndex) {
      sceneDockIndex.textContent = String(activeSceneIndex + 1).padStart(2, "0");
    }

    if (sceneDockLabel) {
      sceneDockLabel.textContent = sceneLabels[activeSceneIndex] || "ARSC";
    }
  }

  motionLayers.forEach(({ element, section, depth }) => {
    const shift = Number.parseFloat(
      section.style.getPropertyValue("--scene-shift")
    );
    const responsiveFactor =
      window.innerWidth <= 640 ? 0.28 : window.innerWidth <= 1050 ? 0.55 : 1;

    element.style.setProperty(
      "--layer-shift",
      `${(shift * depth * responsiveFactor).toFixed(2)}px`
    );
  });

  const hero = document.querySelector(".hero");

  if (hero) {
    const heroProgress = clamp(window.scrollY / Math.max(hero.offsetHeight, 1));

    hero.style.setProperty(
      "--hero-panel-shift",
      `${(-heroProgress * 34).toFixed(2)}px`
    );
    hero.style.setProperty(
      "--hero-panel-scale",
      (1 - heroProgress * 0.035).toFixed(4)
    );
    hero.style.setProperty(
      "--hero-copy-shift",
      `${(-heroProgress * 24).toFixed(2)}px`
    );
    hero.style.setProperty(
      "--hero-copy-opacity",
      (1 - heroProgress * 0.38).toFixed(4)
    );
  }

  whyItems.forEach((item) => {
    const bounds = item.getBoundingClientRect();
    const itemCenter = bounds.top + bounds.height / 2;
    const focus = clamp(
      1 - Math.abs(itemCenter - viewportHeight * 0.52) / (viewportHeight * 0.52)
    );

    item.style.setProperty("--item-opacity", (0.56 + focus * 0.44).toFixed(3));
    item.style.setProperty("--item-shift", `${((1 - focus) * 16).toFixed(2)}px`);
  });

  interactiveCards.forEach((card, index) => {
    const bounds = card.getBoundingClientRect();
    const itemCenter = bounds.top + bounds.height / 2;
    const focus = clamp(
      1 - Math.abs(itemCenter - viewportHeight * 0.56) / (viewportHeight * 0.7)
    );
    const direction = index % 2 === 0 ? -1 : 1;

    card.style.setProperty(
      "--card-x",
      `${((1 - focus) * direction * 18).toFixed(2)}px`
    );
    card.style.setProperty(
      "--card-y",
      `${((1 - focus) * 24).toFixed(2)}px`
    );
    card.style.setProperty(
      "--card-rotate",
      `${((1 - focus) * direction * 1.8).toFixed(2)}deg`
    );
    card.style.setProperty("--card-energy", focus.toFixed(3));
  });

  processSteps.forEach((step) => {
    const bounds = step.getBoundingClientRect();
    const itemCenter = bounds.top + bounds.height / 2;
    const focus = clamp(
      1 - Math.abs(itemCenter - viewportHeight * 0.58) / (viewportHeight * 0.62)
    );

    step.style.setProperty("--step-glow", focus.toFixed(3));
  });

  if (processSection) {
    const bounds = processSection.getBoundingClientRect();
    const progress = clamp(
      (viewportHeight * 0.72 - bounds.top) / Math.max(bounds.height * 0.68, 1)
    );

    processSection.style.setProperty(
      "--process-progress",
      `${(progress * 100).toFixed(2)}%`
    );
  }

  const teamSection = document.querySelector(".team-section");

  if (teamSection) {
    const bounds = teamSection.getBoundingClientRect();
    const progress = clamp(
      (viewportHeight - bounds.top) / (viewportHeight + bounds.height)
    );
    const portraitFactor = window.innerWidth <= 640 ? 0.45 : 1;
    const portraitShift = (progress - 0.5) * -28 * portraitFactor;

    teamPortraits.forEach((portrait, index) => {
      const direction = index % 2 === 0 ? 1 : -1;
      portrait.style.setProperty(
        "--portrait-shift",
        `${(portraitShift * direction).toFixed(2)}px`
      );
    });
  }

  if (contactSection) {
    const bounds = contactSection.getBoundingClientRect();
    const focus = clamp(
      (viewportHeight - bounds.top) / Math.max(viewportHeight * 0.85, 1)
    );

    contactSection.style.setProperty("--contact-focus", focus.toFixed(3));
    contactSection.style.setProperty(
      "--contact-glow-size",
      `${(focus * 70).toFixed(2)}px`
    );
    contactSection.style.setProperty(
      "--contact-glow-alpha",
      (focus * 0.13).toFixed(3)
    );
    contactSection.style.setProperty(
      "--contact-orb-scale",
      (0.72 + focus * 0.34).toFixed(3)
    );
    contactSection.style.setProperty(
      "--contact-orb-opacity",
      (0.45 + focus * 0.55).toFixed(3)
    );
  }

  motionFrame = null;
}

function queueScrollSceneUpdate() {
  if (motionFrame !== null) return;

  motionFrame = window.requestAnimationFrame(updateScrollScenes);
}

if (!prefersReducedMotion) {
  window.addEventListener("scroll", queueScrollSceneUpdate, { passive: true });
  window.addEventListener("resize", queueScrollSceneUpdate);

  if (supportsFinePointer && cursorReactor) {
    window.addEventListener(
      "pointermove",
      (event) => {
        document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
        document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
        cursorReactor.classList.add("is-active");
      },
      { passive: true }
    );

    document.documentElement.addEventListener("mouseleave", () => {
      cursorReactor.classList.remove("is-active");
    });
  }

  updateScrollScenes();
}

function animateCount(item, delay) {
  const finalText = item.textContent.trim();
  const numberMatch = finalText.match(/^([\d,]+)(.*)$/);

  if (!numberMatch) return;

  const target = Number(numberMatch[1].replaceAll(",", ""));
  const suffix = numberMatch[2];
  const finalWidth = Math.ceil(item.getBoundingClientRect().width);

  item.style.minWidth = `${finalWidth}px`;
  item.setAttribute("aria-label", finalText);

  window.setTimeout(() => {
    const duration = 800;
    const startTime = performance.now();

    item.textContent = `0${suffix}`;

    function updateCount(currentTime) {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(target * easedProgress);

      item.textContent = `${countFormatter.format(currentValue)}${suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(updateCount);
      } else {
        item.textContent = finalText;
      }
    }

    window.requestAnimationFrame(updateCount);
  }, delay);
}

if (
  countItems.length &&
  !prefersReducedMotion &&
  "IntersectionObserver" in window
) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const itemIndex = Array.from(countItems).indexOf(entry.target);
        const delay = Math.min(itemIndex * 70, 210);

        animateCount(entry.target, delay);
        countObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.4
    }
  );

  countItems.forEach((item) => countObserver.observe(item));
}
