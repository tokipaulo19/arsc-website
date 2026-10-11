const products = [
  {
    id: "void",
    name: "Void Lip",
    price: 4700,
    category: "Object 001",
    description:
      "An opaque black lipstick with a soft matte surface. The starting point for an entirely different face.",
    variants: ["Black star", "Ultraviolet"],
    position: "65% center",
  },
  {
    id: "phase",
    name: "Phase Matter",
    price: 5200,
    category: "Object 002",
    description:
      "A reflective eye pigment that shifts as the angle of light changes. Press, don't sweep.",
    variants: ["Eclipse", "Cobalt signal", "Magenta static"],
    position: "49% center",
  },
  {
    id: "signal",
    name: "Signal Beam",
    price: 4100,
    category: "Object 003",
    description:
      "A liquid highlight for graphic points of cold light. A tiny amount creates a precise reflection.",
    variants: ["Cold chrome", "Pink frequency"],
    position: "85% center",
  },
];
const shop = DemoShop({
  brand: "Nocturne",
  products,
  image: "../assets/nocturne-hero.png",
});
const objects = [...document.querySelectorAll("[data-object]")];
const materials = {
  void: "DIMENSIONAL MATTE",
  phase: "CHROMATIC REFLECTION",
  signal: "LIQUID LIGHT",
};
function selectObject(button) {
  const p = products.find((p) => p.id === button.dataset.object);
  objects.forEach((item) => {
    item.setAttribute("aria-selected", String(item === button));
    item.tabIndex = item === button ? 0 : -1;
  });
  document
    .getElementById("n-object-panel")
    .setAttribute("aria-labelledby", button.id);
  document.getElementById("n-name").textContent = p.name;
  document.getElementById("n-description").textContent = p.description;
  document.getElementById("n-number").textContent = p.category.toUpperCase();
  document.getElementById("n-material").textContent = materials[p.id];
  const image = document.getElementById("n-product-image");
  image.style.objectPosition = p.position;
  image.alt = p.name + " in the Nocturne collection";
  const discover = document.getElementById("n-discover");
  discover.dataset.product = p.id;
  discover.textContent = "EXPLORE OBJECT — " + shop.money(p.price) + " ↗";
}
objects.forEach((button, index) => {
  button.addEventListener("click", () => selectObject(button));
  button.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? objects.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + objects.length) %
              objects.length;
      objects[next].focus();
      selectObject(objects[next]);
    }
  });
});
document.querySelectorAll("[data-light]").forEach((button) =>
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-light]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    document
      .querySelector(".n-object-image")
      .classList.toggle("flash", button.dataset.light === "flash");
    document.getElementById("n-light-label").textContent =
      button.dataset.light === "flash" ? "FLASH TREATMENT" : "STUDIO LIGHT";
  }),
);
const essays = {
  light: [
    "Reflection is a language.",
    "A point of light can give a face a new centre of gravity. A reflective pigment asks the viewer to move; it reveals a different surface with every angle.",
    "Start with one location: the inner corner, the centre of the lid or the high point of the cheek. Leave the surrounding area quiet, and the reflection becomes a deliberate mark.",
    "Signal Beam is imagined for exactly this kind of precision. Less product, more intention.",
  ],
  black: [
    "Begin with black.",
    "Black is not an absence of colour. It is a field against which other colours can become unfamiliar. A violet shimmer on bare skin and the same shimmer over black tell two different stories.",
    "Build the surface with a small amount of matte pigment, then press reflection into selected areas. Try one side first. The experiment does not need to become symmetrical.",
    "Void Lip is the starting material in this study, paired with Phase Matter for a shift in texture.",
  ],
  shape: [
    "Permission to distort.",
    "An eye look does not need to end at the crease. A lip colour does not need to describe the entire lip. The familiar outline is an option, not a requirement.",
    "Sketch a line that follows the cheekbone instead. Leave a deliberate space. Make one mark, pause and decide whether another would make it more interesting.",
    "Nocturne is a fictional collection built around this freedom: the face as a changing surface.",
  ],
};
document.querySelectorAll("[data-essay]").forEach((button) =>
  button.addEventListener("click", () => {
    const essay = essays[button.dataset.essay];
    shop.open(
      essay[0],
      '<p class="n-small">NOCTURNE / FIELD NOTES</p>' +
        essay
          .slice(1)
          .map(
            (text) =>
              '<p style="line-height:1.9;font-size:14px">' + text + "</p>",
          )
          .join("") +
        '<button class="action-button" data-close>Return to the archive →</button>',
    );
  }),
);
