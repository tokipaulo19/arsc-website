const products = [
  {
    id: "tint",
    name: "Water Veil",
    price: 4400,
    category: "Base",
    description:
      "A sheer serum tint for flexible, light coverage. The finish is fresh, never flat.",
    variants: ["01 Mist", "04 Sand", "07 Earth", "09 Deep"],
    position: "15% center",
  },
  {
    id: "blush",
    name: "Cloud Blush",
    price: 3400,
    category: "Colour",
    description:
      "A soft cream blush that can be tapped onto cheeks and lids, then blended with fingers.",
    variants: ["Petal", "Coral mist", "Fig"],
    position: "35% center",
  },
  {
    id: "oil",
    name: "Glass Oil",
    price: 2900,
    category: "Finish",
    description:
      "A comforting tinted lip oil with a gentle shine and a cushiony texture.",
    variants: ["Rosewater", "Fig water", "Clear"],
    position: "43% center",
  },
];
const shop = DemoShop({
  brand: "Mizu",
  products,
  image: "../assets/mizu-hero.png",
});
const formulas = {
  tint: [
    "◌",
    "SHEER SERUM TINT",
    "BASE / 30 ML",
    "Water Veil",
    "A sheer serum tint for flexible, light coverage. The finish is fresh, never flat.",
    "Fresh & natural",
    "Water-light serum",
    "Press two drops into skin",
    "Find your shade — $44 →",
  ],
  blush: [
    "●",
    "WHIPPED CHEEK COLOUR",
    "COLOUR / 8 G",
    "Cloud Blush",
    "A soft cream blush for cheeks and lids, blended with fingers.",
    "Softly diffused",
    "Whipped cream",
    "Tap onto cheeks and lids",
    "Choose your colour — $34 →",
  ],
  oil: [
    "◇",
    "CUSHION LIP OIL",
    "FINISH / 5 ML",
    "Glass Oil",
    "A tinted lip oil with a gentle shine and a cushiony texture.",
    "Gentle shine",
    "Cushion oil",
    "Sweep over bare lips",
    "Choose your finish — $29 →",
  ],
};
const tabs = [...document.querySelectorAll("[data-formula]")];
function chooseFormula(button) {
  tabs.forEach((tab) => {
    tab.setAttribute("aria-selected", String(tab === button));
    tab.tabIndex = tab === button ? 0 : -1;
  });
  const key = button.dataset.formula;
  [
    "texture-glyph",
    "texture-label",
    "formula-type",
    "formula-name",
    "formula-description",
    "formula-finish",
    "formula-texture",
    "formula-use",
    "formula-shop",
  ].forEach((id, i) => {
    document.getElementById(id).textContent = formulas[key][i];
  });
  document
    .getElementById("formula-panel")
    .setAttribute("aria-labelledby", button.id);
  document.getElementById("formula-shop").dataset.product = key;
  document.querySelector(".m-texture").style.background =
    key === "blush"
      ? "radial-gradient(circle at 35% 30%,#ffeded,#dca3b0)"
      : key === "oil"
        ? "radial-gradient(circle at 35% 30%,#faf3ec,#dba5a0)"
        : "radial-gradient(circle at 35% 30%,#fdfdfd,#a8d1d8)";
}
tabs.forEach((button, index) => {
  button.addEventListener("click", () => chooseFormula(button));
  button.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      tabs[next].focus();
      chooseFormula(tabs[next]);
    }
  });
});
const routine = document.getElementById("routine-form");
function selected() {
  const ids = [];
  if (routine.elements.base.value === "tint") ids.push("tint");
  if (["fresh", "both"].includes(routine.elements.finish.value))
    ids.push("blush");
  if (["gloss", "both"].includes(routine.elements.finish.value))
    ids.push("oil");
  return ids;
}
routine.addEventListener("change", () => {
  const edit = selected().map((id) => products.find((p) => p.id === id));
  document.getElementById("routine-description").textContent = edit
    .map((p) => p.name)
    .join(" + ");
  document.getElementById("routine-price").textContent = shop.money(
    edit.reduce((t, p) => t + p.price, 0),
  );
});
routine.addEventListener("submit", (event) => {
  event.preventDefault();
  selected().forEach((id) => shop.add(id));
  shop.notify("Your Mizu routine is in the bag");
});
