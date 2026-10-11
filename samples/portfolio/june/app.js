const stories = [
  {
    id: "wedding",
    category: "weddings",
    title: "Just us, for a moment.",
    src: "../assets/june-wedding.webp",
    alt: "Newlywed couple laughing in an olive grove",
    note: "WEDDINGS / A DAY THAT FELT LIKE THEM",
    text: "A little walk away from the noise. A shared joke. This fictional wedding study explores connection without a shot list.",
  },
  {
    id: "portrait",
    category: "portraits",
    title: "A little more yourself.",
    src: "../assets/june-portrait.webp",
    alt: "Warm studio portrait of a man in a rust shirt",
    note: "PORTRAITS / ROOM TO BE YOURSELF",
    text: "Soft light, a quiet backdrop and a little time to settle. A portrait study built around presence, not a performance.",
  },
  {
    id: "place",
    category: "places",
    title: "The long way home.",
    src: "../assets/june-street.webp",
    alt: "Cyclist in a quiet pastel seaside street",
    note: "PLACES / SLOW MORNINGS",
    text: "Travel is sometimes just taking the next street. A fictional documentary study of small daily rituals and the places that hold them.",
  },
];
let filter = "all",
  current = 0;
function activeStories() {
  return stories.filter((s) => filter === "all" || s.category === filter);
}
function show(index) {
  const list = activeStories();
  current = (index + list.length) % list.length;
  const s = list[current];
  PortfolioUI.open(
    s.title,
    '<img src="' +
      s.src +
      '" alt="' +
      s.alt +
      '"><p class="eyebrow" style="margin-top:22px">' +
      s.note +
      '</p><p style="margin-top:12px">' +
      s.text +
      '</p><p class="demo-label" style="margin-top:16px">AI-generated photograph. Fictional photo story, not actual client work.</p><div class="dialog-actions"><button data-photo-prev aria-label="Previous photo story">← Previous</button><span>' +
      (current + 1) +
      " / " +
      list.length +
      '</span><button data-photo-next aria-label="Next photo story">Next →</button></div>',
  );
  document.querySelector("[data-photo-prev]").onclick = () => show(current - 1);
  document.querySelector("[data-photo-next]").onclick = () => show(current + 1);
}
document.querySelectorAll("[data-filter]").forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((x) => {
      const active = x === b;
      x.classList.toggle("active", active);
      x.setAttribute("aria-pressed", String(active));
    });
    document
      .querySelectorAll("[data-story]")
      .forEach(
        (x) => (x.hidden = filter !== "all" && x.dataset.category !== filter),
      );
    document.querySelector(".j-count").textContent =
      activeStories().length +
      (activeStories().length === 1 ? " story" : " stories") +
      " to explore";
  }),
);
document
  .querySelectorAll("[data-story]")
  .forEach((b) =>
    b.addEventListener("click", () =>
      show(activeStories().findIndex((s) => s.id === b.dataset.story)),
    ),
  );
document.querySelector("dialog").addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    e.preventDefault();
    show(current + 1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    show(current - 1);
  }
});
