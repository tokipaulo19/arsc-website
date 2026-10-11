const products = [
  {
    id: "gpu",
    name: "Bench G8 Graphics",
    price: 34900,
    category: "graphics",
    variants: ["8 GB / Black"],
    image: "../assets/circuit-gpu.webp",
    alt: "Black dual-fan graphics card",
    label: "FICTIONAL WORKSHOP-LABEL GRAPHICS",
    description:
      "A compact dual-fan graphics card concept. The specifications demonstrate the useful information a parts retailer should make easy to find—not a real card or a performance recommendation.",
    specs: [
      ["Memory", "8 GB GDDR6"],
      ["Interface", "PCIe 4.0 ×16"],
      ["Dimensions", "220 × 112 × 42 mm"],
      ["Design power", "160 W (illustrative)"],
      ["Power connection", "One 8-pin PCIe"],
      ["Display outputs", "2× DisplayPort, 1× HDMI"],
    ],
    care: "Before an actual purchase, confirm case clearance, PSU requirements and exact manufacturer specifications. No benchmark or compatibility guarantee.",
  },
  {
    id: "ram",
    name: "Bench DDR5 Kit",
    price: 12900,
    category: "memory",
    variants: ["32 GB / 2 × 16 GB"],
    image: "../assets/circuit-memory.webp",
    alt: "Two black DDR5 desktop memory modules",
    label: "FICTIONAL WORKSHOP-LABEL MEMORY",
    description:
      "A matched desktop memory kit concept with low-profile heatspreaders. Intended for supported DDR5 desktop platforms; not a laptop module or a substitute for checking the motherboard manual.",
    specs: [
      ["Capacity", "32 GB (2 × 16 GB)"],
      ["Generation", "DDR5 UDIMM"],
      ["Profile speed", "6000 MT/s (illustrative)"],
      ["Profile voltage", "1.35 V (illustrative)"],
      ["Module height", "35 mm"],
      ["Colour", "Black"],
    ],
    care: "Advertised profile speeds depend on the actual motherboard, processor and settings. This fictional kit has no real QVL or certification.",
  },
  {
    id: "ssd",
    name: "Bench NV1 Storage",
    price: 9900,
    category: "storage",
    variants: ["1 TB / With heatsink"],
    image: "../assets/circuit-ssd.webp",
    alt: "Black M.2 SSD with low-profile heatsink",
    label: "FICTIONAL WORKSHOP-LABEL STORAGE",
    description:
      "An internal solid-state storage concept for a compatible M.2 slot. A low-profile heatsink is pictured; actual clearance should always be checked against the board or device documentation.",
    specs: [
      ["Capacity", "1 TB"],
      ["Form factor", "M.2 2280"],
      ["Interface", "PCIe 4.0 ×4 NVMe"],
      ["Dimensions", "80 × 22 × 8 mm with heatsink"],
      ["Use", "Internal desktop storage"],
      ["Included", "Drive and heatsink only"],
    ],
    care: "A drive purchase does not include migration or data recovery. Back up accessible files before a real storage change. No verified speed or endurance claim.",
  },
  {
    id: "case",
    name: "Bench Air Case",
    price: 11900,
    category: "cases",
    variants: ["White / Mid-tower"],
    image: "../assets/circuit-case.webp",
    alt: "White mesh-front mid-tower computer case",
    label: "FICTIONAL WORKSHOP-LABEL CHASSIS",
    description:
      "A clean mesh-front chassis concept with a glass side panel and an open internal layout. A starting point for an airflow-focused desktop, with clearance details listed before you choose parts.",
    specs: [
      ["Board formats", "ATX, micro-ATX, mini-ITX"],
      ["GPU clearance", "Up to 330 mm (illustrative)"],
      ["CPU cooler height", "Up to 165 mm (illustrative)"],
      ["Dimensions", "420 × 210 × 450 mm"],
      ["Included fans", "3× front, 1× rear (120 mm)"],
      ["Power supply", "Not included"],
    ],
    care: "Radiators, cable routing and drive cages can reduce real clearance. Generated photography is not a technical drawing or assembly guide.",
  },
];
PortfolioShopUI.mount(products, {
  threshold: 30000,
  shipping: 1500,
  optionLabel: "Product option",
  bagTitle: "Your Circuit Bench bag",
});
const buildForm = document.querySelector("#build-form");
function currentBuild() {
  return PortfolioCommerce.buildQuote(
    buildForm.elements.purpose.value,
    Number(buildForm.elements.memory.value),
    Number(buildForm.elements.storage.value),
  );
}
function updateBuild() {
  const q = currentBuild();
  document.querySelector("#build-total").textContent = PortfolioCommerce.money(
    q.total,
  );
  document.querySelector("#build-note").textContent =
    q.memory + " GB memory / " + q.storage + " TB SSD / assembly included";
}
buildForm.addEventListener("change", updateBuild);
updateBuild();
buildForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = currentBuild();
  PortfolioUI.open(
    "Your sample desktop brief",
    '<p class="eyebrow">' +
      PortfolioUI.escape(q.purpose) +
      " / BUILD PLANNER</p><dl><dt>Memory</dt><dd>" +
      q.memory +
      " GB</dd><dt>SSD storage</dt><dd>" +
      q.storage +
      " TB</dd><dt>Assembly & handover</dt><dd>Included in base price</dd><dt>Illustrative total</dt><dd>" +
      PortfolioCommerce.money(q.total) +
      '</dd></dl><p>The example brief covers a complete tower, operating-system setup, assembly and handover. Displays, peripherals and delivery are excluded. A real quote would list the exact CPU, motherboard, graphics, memory, storage, cooling, power supply and case before confirming compatibility or cost.</p><p class="demo-label">No order, actual component matching or performance guarantee. This is a pricing interaction, not a real quotation.</p>',
  );
});
const repairForm = document.querySelector("#repair-form");
repairForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!repairForm.reportValidity()) return;
  const f = repairForm.elements;
  PortfolioUI.open(
    "Your repair-request preview",
    "<dl><dt>Device</dt><dd>" +
      PortfolioUI.escape(f.device.value) +
      "</dd><dt>Reported issue</dt><dd>" +
      PortfolioUI.escape(f.issue.value) +
      "</dd><dt>Next step in a live service</dt><dd>Discuss assessment scope</dd></dl><p><strong>Your sample description</strong><br />" +
      PortfolioUI.escape(f.message.value) +
      "</p><p>No request was sent and no appointment was created. The sample diagnostic assessment is $69; parts and further labour would need separate approval. This form does not diagnose a fault or promise a repair.</p>",
  );
  repairForm.querySelector(".form-status").textContent =
    "Preview complete. Your details have not been sent or saved.";
});
