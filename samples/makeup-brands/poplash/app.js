const products = [
  {
    id: "wink",
    name: "Mega Wink",
    price: 2600,
    category: "Eyes",
    description:
      "Big-volume mascara in the loud colour your lashes have been waiting for.",
    variants: ["Electric blue", "Ink black"],
    position: "57% center",
  },
  {
    id: "jelly",
    name: "Jelly Beam",
    price: 2200,
    category: "Face",
    description:
      "A bouncy face gloss to tap onto cheeks, collarbones and anywhere that wants the spotlight.",
    variants: ["Peach glow", "Rose fizz", "Apricot pop"],
    position: "72% center",
  },
  {
    id: "doodle",
    name: "Doodle Liner",
    price: 1800,
    category: "Eyes",
    description:
      "A creamy colour pencil for scribbles, wings and happy accidents.",
    variants: ["Blue crush", "Lime zap", "Violet pulse"],
    position: "85% center",
  },
  {
    id: "gloss",
    name: "Bubble Gloss",
    price: 2100,
    category: "Lips",
    description:
      "A juicy gloss with a pink shine. Bring it everywhere and reapply whenever.",
    variants: ["Bubblegum", "Cherry pop", "Tangerine pop"],
    position: "71% center",
  },
  {
    id: "stick",
    name: "Cheek Cheat",
    price: 2400,
    category: "Face",
    description:
      "Instant creamy colour that blends without a brush. Swipe it and go.",
    variants: ["Apricot", "Punch"],
    position: "90% center",
  },
  {
    id: "party",
    name: "The Party Pack",
    price: 5800,
    category: "Sets",
    description:
      "An eye pencil, blue mascara and glossy lip in one colour-clashing kit.",
    variants: ["Blue hour", "Pink riot"],
    position: "75% center",
  },
];
const shop = DemoShop({
  brand: "Poplash",
  products,
  image: "../assets/poplash-hero.png",
});
let category = "All";
const grid = document.querySelector(".p-catalog");
function filterGoods() {
  document.querySelectorAll(".catalog-card").forEach((card) => {
    card.hidden = category !== "All" && card.dataset.category !== category;
  });
  document.getElementById("p-results").textContent =
    [...grid.children].filter((c) => !c.hidden).length + " things to play with";
}
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    category = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    filterGoods();
  }),
);
document.getElementById("p-sort").addEventListener("change", (event) => {
  const order = [...grid.children];
  order.sort((a, b) => {
    const pa = products.find(
        (p) => p.id === a.querySelector("[data-product]").dataset.product,
      ),
      pb = products.find(
        (p) => p.id === b.querySelector("[data-product]").dataset.product,
      );
    return event.target.value === "featured"
      ? products.indexOf(pa) - products.indexOf(pb)
      : event.target.value === "low"
        ? pa.price - pb.price
        : pb.price - pa.price;
  });
  order.forEach((card) => grid.append(card));
});
const look = { eye: "Cobalt", lip: "Bubblegum", cheek: "Peach" };
const face = document.querySelector(".p-face");
function pick(button) {
  const zone = button.dataset.zone;
  look[zone] = button.dataset.name;
  face.style.setProperty("--" + zone, button.dataset.colour);
  document.querySelectorAll('[data-zone="' + zone + '"]').forEach((item) => {
    item.classList.toggle("selected", item === button);
    item.setAttribute("aria-pressed", String(item === button));
  });
  const description =
    look.eye + " eyes. " + look.lip + " lips. " + look.cheek + " cheeks.";
  document.getElementById("look-name").textContent = description;
  face.setAttribute("aria-label", "Illustrated makeup look: " + description);
}
document
  .querySelectorAll("[data-colour]")
  .forEach((button) => button.addEventListener("click", () => pick(button)));
document.getElementById("shuffle-look").addEventListener("click", () => {
  ["eye", "lip", "cheek"].forEach((zone) => {
    const choices = [
      ...document.querySelectorAll('[data-zone="' + zone + '"]'),
    ];
    pick(choices[Math.floor(Math.random() * choices.length)]);
  });
});
const lookShades = {
  eye: { Cobalt: "Blue crush", Lime: "Lime zap", Violet: "Violet pulse" },
  lip: {
    Bubblegum: "Bubblegum",
    Cherry: "Cherry pop",
    Tangerine: "Tangerine pop",
  },
  cheek: { Peach: "Peach glow", Rose: "Rose fizz", Apricot: "Apricot pop" },
};
document.getElementById("shop-look").addEventListener("click", () => {
  shop.add("doodle", lookShades.eye[look.eye]);
  shop.add("gloss", lookShades.lip[look.lip]);
  shop.add("jelly", lookShades.cheek[look.cheek]);
  shop.notify("Your three selected colours are in the bag");
});
