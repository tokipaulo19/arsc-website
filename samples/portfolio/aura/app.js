const { beautyQuote, money } = PortfolioDomain;
const form = document.querySelector("#aura-form");
const service = form.elements.service,
  people = form.elements.people,
  trial = form.elements.trial;
function update() {
  const isBridal = service.value === "bridal";
  document.querySelector(".a-trial").hidden = !isBridal;
  if (!isBridal) trial.checked = false;
  const quote = beautyQuote(service.value, Number(people.value), trial.checked);
  document.querySelector("#aura-total").textContent = money(quote.total);
  document.querySelector("#aura-summary").textContent =
    quote.title +
    " / " +
    quote.people +
    (quote.people === 1 ? " person" : " people") +
    (quote.trial ? " + trial" : "");
  document.querySelectorAll("[data-service]").forEach((b) => {
    const active = b.dataset.service === service.value;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}
form.addEventListener("change", update);
document.querySelectorAll("[data-service]").forEach((b) =>
  b.addEventListener("click", () => {
    service.value = b.dataset.service;
    update();
    document.querySelector("#book").scrollIntoView({ behavior: "smooth" });
  }),
);
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
  const q = beautyQuote(service.value, Number(people.value), trial.checked);
  PortfolioUI.open(
    "Your consultation preview",
    "<p>" +
      PortfolioUI.escape(q.title) +
      " for " +
      q.people +
      " on " +
      PortfolioUI.escape(form.elements.date.value) +
      ".</p><dl><dt>People</dt><dd>" +
      q.people +
      "</dd><dt>Bridal trial</dt><dd>" +
      (q.trial ? "Included" : "Not included") +
      "</dd><dt>Illustrative estimate</dt><dd>" +
      money(q.total) +
      '</dd></dl><p class="demo-label">Demo only. Your email has not been sent or saved, and no booking has been made.</p>',
  );
  form.querySelector(".form-status").textContent =
    "Consultation preview ready. Nothing was sent or booked.";
});
update();
