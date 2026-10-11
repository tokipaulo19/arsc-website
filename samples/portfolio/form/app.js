const { coachPlan, money } = PortfolioDomain;
const programme = document.querySelector("#programme-form");
function selected() {
  return coachPlan(
    programme.elements.goal.value,
    Number(programme.elements.days.value),
  );
}
function update() {
  const plan = selected();
  document.querySelector("#plan-title").textContent = plan.title;
  document.querySelector("#plan-focus").textContent = plan.focus;
  document.querySelector("#plan-week").innerHTML = plan.sessions
    .map(
      (s, i) =>
        "<li><span>SESSION 0" +
        (i + 1) +
        "</span>" +
        PortfolioUI.escape(s) +
        "</li>",
    )
    .join("");
}
programme.addEventListener("change", update);
document.querySelector("#save-plan").addEventListener("click", () => {
  const plan = selected();
  PortfolioUI.open(
    plan.title,
    "<p>" +
      plan.days +
      " sessions per week.</p><ol>" +
      plan.sessions
        .map((s) => "<li>" + PortfolioUI.escape(s) + "</li>")
        .join("") +
      "</ol><p>Online coaching concept: " +
      money(plan.monthly) +
      ' / month.</p><p class="demo-label">Sample only, not an individual prescription. No signup or payment has been made. Discuss your needs with a qualified coach before starting.</p>',
  );
});
update();
