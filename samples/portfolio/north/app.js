const studies = {
  quiet: {
    type: "RESIDENTIAL / 140 M²",
    title: "The Quiet House",
    text: "A calm family home shaped around daylight and shared spaces. Warm oak, soft stone and muted greens connect the interior with its courtyard.",
    zones: ["LIVING", "DINING", "COURTYARD"],
    style: "residential",
    materials: [
      ["Oak", "#c6aa7e"],
      ["Limestone", "#ded7c5"],
      ["Olive", "#9aaa87"],
    ],
  },
  common: {
    type: "HOSPITALITY / 90 M²",
    title: "Common Ground",
    text: "A neighbourhood gathering place with a generous central table. Terracotta, walnut and warm plaster create a welcoming rhythm from coffee bar to courtyard.",
    zones: ["COFFEE BAR", "COMMUNAL TABLE", "GARDEN TABLES"],
    style: "hospitality",
    materials: [
      ["Terracotta", "#bc7757"],
      ["Walnut", "#705543"],
      ["Plaster", "#dfcfb7"],
    ],
  },
  work: {
    type: "WORKPLACE / 110 M²",
    title: "Room to Think",
    text: "A flexible workspace with room for focus and exchange. Acoustic felt, pale timber and a green pocket make the workday feel less institutional.",
    zones: ["FOCUS ROOM", "SHARED STUDIO", "GREEN BREAKOUT"],
    style: "workplace",
    materials: [
      ["Ash", "#d7c8ab"],
      ["Felt", "#98aaa9"],
      ["Sage", "#aab59a"],
    ],
  },
};
function project(id) {
  const s = studies[id];
  document.querySelector("#project-type").textContent = s.type;
  document.querySelector("#project-title").textContent = s.title;
  document.querySelector("#project-description").textContent = s.text;
  ["one", "two", "three"].forEach(
    (n, i) =>
      (document.querySelector("#plan-zone-" + n).textContent = s.zones[i]),
  );
  const plan = document.querySelector("#project-plan");
  plan.className = "n-plan " + s.style;
  plan.setAttribute(
    "aria-label",
    "Concept plan for " + s.title + ": " + s.zones.join(", "),
  );
  document.querySelector("#project-materials").innerHTML = s.materials
    .map(
      ([name, color]) =>
        '<span><i style="background:' + color + '"></i>' + name + "</span>",
    )
    .join("");
  document.querySelectorAll("[data-project]").forEach((b) => {
    const active = b.dataset.project === id;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}
document
  .querySelectorAll("[data-project]")
  .forEach((b) =>
    b.addEventListener("click", () => project(b.dataset.project)),
  );
project("quiet");
const form = document.querySelector("#brief-form");
function updateFee() {
  try {
    const q = PortfolioDomain.interiorQuote(
      form.elements.space.value,
      Number(form.elements.area.value),
      form.elements.scope.value,
    );
    document.querySelector("#fee-total").textContent = PortfolioDomain.money(
      q.total,
    );
    document.querySelector("#fee-summary").textContent =
      q.area + " m² · " + q.scope;
    form.querySelector(".form-status").textContent = "";
  } catch {
    document.querySelector("#fee-total").textContent = "—";
    document.querySelector("#fee-summary").textContent =
      "Enter a whole area from 10 to 500 m².";
  }
}
form.addEventListener("input", updateFee);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const q = PortfolioDomain.interiorQuote(
    form.elements.space.value,
    Number(form.elements.area.value),
    form.elements.scope.value,
  );
  PortfolioUI.open(
    "Your project brief",
    "<dl><dt>Space</dt><dd>" +
      q.space +
      "</dd><dt>Area</dt><dd>" +
      q.area +
      " m²</dd><dt>Design scope</dt><dd>" +
      q.scope +
      "</dd><dt>Sample design fee</dt><dd>" +
      PortfolioDomain.money(q.total) +
      '</dd></dl><p class="demo-label">Design-fee illustration only, excluding construction. No enquiry or email was sent and no proposal has been issued.</p>',
  );
  form.querySelector(".form-status").textContent =
    "Project preview ready. No enquiry has been sent.";
});
updateFee();
