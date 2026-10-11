const shop = DemoShop({
  brand: "Veloura",
  products: [
    {
      id: "rouge",
      name: "Rouge Élan",
      price: 4800,
      category: "Lips",
      description:
        "A satin lipstick with a precise sculpted tip. Build a soft stain or a full, luminous lip.",
      variants: ["Bordeaux", "Rosewood", "Burnished coral"],
      position: "61% center",
    },
    {
      id: "veil",
      name: "Veil Lumière",
      price: 5600,
      category: "Face",
      description:
        "A sheer finishing compact designed to catch the light without hiding the skin beneath.",
      variants: ["Champagne", "Rose bronze"],
      position: "82% center",
    },
    {
      id: "laque",
      name: "Laque Nocturne",
      price: 4200,
      category: "Lips",
      description:
        "A cushion gloss with a glasslike finish. Wear alone or over your signature red.",
      variants: ["Garnet", "Velvet dusk", "Clear"],
      position: "96% center",
    },
    {
      id: "ritual",
      name: "The Evening Ritual",
      price: 12800,
      category: "Sets",
      description:
        "The maison's complete evening edit: Rouge Élan, Veil Lumière and Laque Nocturne together.",
      variants: ["Bordeaux edit", "Rosewood edit"],
      position: "75% center",
    },
  ],
  image: "../assets/veloura-hero.png",
});
document.querySelectorAll("[data-filter]").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    let count = 0;
    document.querySelectorAll(".catalog-card").forEach((card) => {
      card.hidden =
        button.dataset.filter !== "All" &&
        card.dataset.category !== button.dataset.filter;
      if (!card.hidden) count++;
    });
    document.querySelector(".v-result").textContent =
      count + " objects in the collection";
  }),
);
const edits = {
  classic: [
    "THE CLASSIC RED EDIT",
    "Bordeaux, satin & candlelight.",
    "Rouge Élan in Bordeaux, paired with Veil Lumière in Champagne.",
    "Bordeaux",
    "Champagne",
  ],
  soft: [
    "THE SOFT ROMANCE EDIT",
    "Rosewood & a quiet glow.",
    "Rouge Élan in Rosewood, paired with Veil Lumière in Rose bronze.",
    "Rosewood",
    "Rose bronze",
  ],
  dramatic: [
    "THE AFTER MIDNIGHT EDIT",
    "A dark red. A little light.",
    "Rouge Élan in Bordeaux, layered against warm Rose bronze.",
    "Bordeaux",
    "Rose bronze",
  ],
};
let mood = "classic";
document.querySelectorAll("[data-mood]").forEach((button) =>
  button.addEventListener("click", () => {
    mood = button.dataset.mood;
    document.querySelectorAll("[data-mood]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    ["edit-label", "edit-title", "edit-copy"].forEach((id, index) => {
      document.getElementById(id).textContent = edits[mood][index];
    });
  }),
);
document.getElementById("add-edit").addEventListener("click", () => {
  shop.add("rouge", edits[mood][3]);
  shop.add("veil", edits[mood][4]);
  shop.notify("Your two-piece evening edit is in the bag");
});
