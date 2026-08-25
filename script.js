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

