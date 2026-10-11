const sizes = ["XS", "S", "M", "L", "XL"];
const products = [
  {
    id: "shirt",
    name: "Weekend Shirt",
    price: 8900,
    category: "tops",
    variants: sizes,
    image: "../assets/offday-shirt.webp",
    alt: "Navy boxy Weekend Shirt on a model",
    label: "NAVY / COTTON POPLIN",
    description:
      "A boxy short-sleeve shirt with a neat collar, dropped shoulder and straight hem. Designed to sit away from the body without swallowing it.",
    specs: [
      ["Material", "100% cotton poplin"],
      ["Fit", "Relaxed, boxy"],
      ["Details", "Button front, chest pocket"],
      ["Colour", "Navy"],
      ["Sizing", "XS–XL; body guide on page"],
    ],
    care: "Intended care: cool gentle wash with similar colours; shade dry; cool iron. Fictional garment specification.",
  },
  {
    id: "tee",
    name: "Daily Tee",
    price: 4900,
    category: "tops",
    variants: sizes,
    image: "../assets/offday-tee.webp",
    alt: "Ecru heavyweight Daily Tee on a model",
    label: "ECRU / HEAVYWEIGHT JERSEY",
    description:
      "A familiar crewneck with a little more substance. The straight silhouette, ribbed neck and substantial jersey make it an easy piece to wear alone or under a layer.",
    specs: [
      ["Material", "100% cotton jersey"],
      ["Fabric weight", "240 gsm (illustrative)"],
      ["Fit", "Relaxed, straight"],
      ["Colour", "Ecru"],
      ["Details", "Rib neck, twin-needle hem"],
    ],
    care: "Intended care: cool gentle wash, reshape while damp, dry in shade. The generated photo is not a verified fabric sample.",
  },
  {
    id: "trouser",
    name: "Easy Trouser",
    price: 11900,
    category: "bottoms",
    variants: sizes,
    image: "../assets/offday-trouser.webp",
    alt: "Sand wide-leg Easy Trousers in a full-length model photo",
    label: "SAND / COTTON–LINEN",
    description:
      "An easy wide leg with front pleats and a little give at the back of the waistband. Side pockets are deep enough to be useful; the finish is soft, not overly polished.",
    specs: [
      ["Material", "55% linen, 45% cotton"],
      ["Fit", "High waist, wide leg"],
      ["Inseam", "76 cm (illustrative)"],
      ["Colour", "Sand"],
      ["Details", "Zip fly, elasticated back"],
    ],
    care: "Intended care: gentle 30°C wash, no tumble drying, hang in shade. Natural creasing is part of the intended texture.",
  },
  {
    id: "overshirt",
    name: "After Hours Overshirt",
    price: 13900,
    category: "layers",
    variants: sizes,
    image: "../assets/offday-overshirt.webp",
    alt: "Olive cotton twill After Hours Overshirt on a model",
    label: "OLIVE / COTTON TWILL",
    description:
      "Part shirt, part light jacket. A straight-cut layer with two front pockets and room for your favourite tee underneath. The cotton twill is intended to feel substantial without being stiff.",
    specs: [
      ["Material", "100% cotton twill"],
      ["Fabric weight", "280 gsm (illustrative)"],
      ["Fit", "Relaxed layering cut"],
      ["Colour", "Olive"],
      ["Details", "Two patch pockets, button cuffs"],
    ],
    care: "Intended care: air between wears; cool gentle wash when needed; shade dry. Follow the sewn-in care label on any real garment.",
  },
];
PortfolioShopUI.mount(products, {
  threshold: 15000,
  shipping: 1000,
  optionLabel: "Choose your size",
  bagTitle: "Your OFFDAY bag",
});
