const shop = DemoShop({
  brand: "Terra Tone",
  products: [
    {
      id: "ground",
      name: "True Ground",
      price: 5200,
      category: "Complexion",
      description:
        "A skin tint with buildable coverage and a natural finish, organised by depth and undertone.",
      variants: [
        "Light warm 06",
        "Light neutral 08",
        "Light cool 09",
        "Medium warm 15",
        "Medium neutral 18",
        "Medium cool 19",
        "Tan warm 24",
        "Tan neutral 26",
        "Tan cool 27",
        "Deep warm 31",
        "Deep neutral 34",
        "Deep cool 35",
      ],
      position: "28% center",
    },
    {
      id: "clay",
      name: "Sun Clay",
      price: 3900,
      category: "Sculpt",
      description:
        "Soft cream bronzer for warmth and dimension. Tap a small amount where sunlight naturally falls.",
      variants: ["Dune", "Sienna", "Cacao"],
      position: "12% center",
    },
    {
      id: "earth",
      name: "Soft Earth",
      price: 3600,
      category: "Conceal",
      description:
        "A creamy concealer to pinpoint coverage or brighten selected areas. A little is enough.",
      variants: ["Sand 08", "Ochre 15", "Umber 22"],
      position: "47% center",
    },
  ],
  image: "../assets/terra-tone-hero.png",
});
let depth = "",
  undertone = "",
  match = "";
const shadeCodes = {
  light: { warm: "06", neutral: "08", cool: "09" },
  medium: { warm: "15", neutral: "18", cool: "19" },
  tan: { warm: "24", neutral: "26", cool: "27" },
  deep: { warm: "31", neutral: "34", cool: "35" },
};
const depths = {
  light: "#dab58e",
  medium: "#b7835c",
  tan: "#8c593d",
  deep: "#533021",
};
function showStep(step) {
  ["shade-depth", "shade-undertone", "shade-result"].forEach((id, i) => {
    document.getElementById(id).hidden = i !== step;
  });
  document.getElementById("shade-step").textContent =
    step === 2 ? "YOUR SHADE EDIT" : "STEP 0" + (step + 1) + " OF 02";
  document.getElementById("shade-progress").value = step === 0 ? 1 : 2;
}
document.querySelectorAll("[data-depth]").forEach((button) =>
  button.addEventListener("click", () => {
    depth = button.dataset.depth;
    document
      .querySelectorAll("[data-depth]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    document.getElementById("shade-next").disabled = false;
  }),
);
document.getElementById("shade-next").addEventListener("click", () => {
  showStep(1);
  document.querySelector("[data-undertone]").focus();
});
document.querySelectorAll("[data-undertone]").forEach((button) =>
  button.addEventListener("click", () => {
    undertone = button.dataset.undertone;
    document
      .querySelectorAll("[data-undertone]")
      .forEach((item) =>
        item.setAttribute("aria-pressed", String(item === button)),
      );
    document.getElementById("shade-result-button").disabled = false;
  }),
);
document.getElementById("shade-back").addEventListener("click", () => {
  showStep(0);
  document.querySelector('[data-depth="' + depth + '"]').focus();
});
document.getElementById("shade-result-button").addEventListener("click", () => {
  match =
    depth[0].toUpperCase() +
    depth.slice(1) +
    " " +
    undertone +
    " " +
    shadeCodes[depth][undertone];
  document.getElementById("match-name").textContent = match;
  document.getElementById("match-description").textContent =
    "Explore True Ground in " +
    match +
    ". Start with a thin layer and check the tone in natural daylight.";
  document.getElementById("match-swatch").style.background = depths[depth];
  showStep(2);
  document.getElementById("add-match").focus();
});
document
  .getElementById("add-match")
  .addEventListener("click", () => shop.add("ground", match));
document.getElementById("restart-shade").addEventListener("click", () => {
  depth = "";
  undertone = "";
  match = "";
  document
    .querySelectorAll("[data-depth],[data-undertone]")
    .forEach((button) => button.setAttribute("aria-pressed", "false"));
  document.getElementById("shade-next").disabled = true;
  document.getElementById("shade-result-button").disabled = true;
  showStep(0);
  document.querySelector("[data-depth]").focus();
});
