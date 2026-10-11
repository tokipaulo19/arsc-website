const body = document.body;
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.nav-links a');
const bagCount = document.querySelector('.bag-count');
const toast = document.querySelector('.toast');
let bag = 0;
let toastTimer;

menuToggle?.addEventListener('click', () => {
  const open = body.classList.toggle('menu-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

navLinks.forEach((link) => link.addEventListener('click', () => {
  body.classList.remove('menu-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const showToast = (message) => {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
};

document.querySelectorAll('.quick-add').forEach((button) => {
  button.addEventListener('click', () => {
    bag += 1;
    if (bagCount) bagCount.textContent = String(bag);
    button.textContent = 'Added';
    showToast(`${button.dataset.product || 'Product'} added to your sample bag`);
    setTimeout(() => { button.textContent = 'Quick add'; }, 1400);
  });
});

document.querySelectorAll('.swatches').forEach((group) => {
  const bottle = group.closest('.product-card')?.querySelector('.product-bottle');
  group.querySelectorAll('.swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      group.querySelectorAll('.swatch').forEach((item) => item.classList.remove('active'));
      swatch.classList.add('active');
      if (bottle) bottle.style.setProperty('--bottle', swatch.dataset.color);
      showToast(`Shade selected: ${swatch.getAttribute('aria-label')}`);
    });
  });
});

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 })
  : null;

document.querySelectorAll('.reveal').forEach((item) => {
  if (observer) observer.observe(item);
  else item.classList.add('is-visible');
});

document.querySelector('.newsletter-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const note = form.parentElement.querySelector('.form-note');
  if (note) note.textContent = 'You’re on the list — welcome in.';
  form.reset();
});

document.querySelector('.search-link')?.addEventListener('click', () => showToast('Search is ready for the full shop build.'));

const hero = document.querySelector('.hero');
const heroMedia = document.querySelector('.hero-media');
if (hero && heroMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    const amount = Math.min(window.scrollY * .08, 55);
    heroMedia.style.transform = `scale(1.04) translateY(${amount}px)`;
  }, { passive: true });
}
