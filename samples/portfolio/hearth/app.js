let category = "coffee";
const diet = document.querySelector("#diet-filter");
function render() {
  const items = PortfolioDomain.menus.filter(
    (i) =>
      i.category === category &&
      (diet.value === "all" ||
        (diet.value === "vegetarian" &&
          ["Vegetarian", "Vegan"].includes(i.tag)) ||
        (diet.value === "vegan" && i.tag === "Vegan")),
  );
  document.querySelector("#menu-items").innerHTML = items.length
    ? items
        .map(
          (i) =>
            '<article class="h-item"><h3>' +
            PortfolioUI.escape(i.name) +
            "</h3><span>" +
            PortfolioDomain.money(i.price) +
            "</span><p>" +
            PortfolioUI.escape(i.note) +
            "</p><small>" +
            PortfolioUI.escape(i.tag) +
            "</small></article>",
        )
        .join("")
    : '<p class="h-empty">No dishes in this selection.<br>Try another category or show everything.</p>';
}
document.querySelectorAll("[data-category]").forEach((b) =>
  b.addEventListener("click", () => {
    category = b.dataset.category;
    document.querySelectorAll("[data-category]").forEach((x) => {
      const active = x === b;
      x.classList.toggle("active", active);
      x.setAttribute("aria-pressed", String(active));
    });
    render();
  }),
);
diet.addEventListener("change", render);
const form = document.querySelector("#table-form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  if (
    !PortfolioDomain.isFutureDate(form.elements.date.value, PortfolioUI.today())
  ) {
    form.querySelector(".form-status").textContent =
      "Choose today or a future date.";
    return;
  }
  PortfolioUI.open(
    "Your table request",
    "<p>A table for " +
      form.elements.guests.value +
      " on " +
      PortfolioUI.escape(form.elements.date.value) +
      " at " +
      PortfolioUI.escape(form.elements.time.value) +
      '.</p><p style="margin-top:20px">Good coffee and a little company. That’s the idea.</p><p class="demo-label" style="margin-top:20px">Demo only. This is not a booking confirmation. No availability has been checked, and your details have not been sent or saved.</p>',
  );
  form.querySelector(".form-status").textContent =
    "Table preview ready. No reservation has been made.";
});
render();
