const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const root = path.join(__dirname, "..", "samples", "makeup-brands");
const slugs = [
  "veloura",
  "mizu",
  "poplash",
  "terra-tone",
  "nocturne",
  "sunday-studio",
];
const context = {};
vm.runInNewContext(
  fs.readFileSync(path.join(root, "shared/store.js"), "utf8"),
  context,
);
const products = [
  { id: "lip", name: "Lip", price: 4800, variants: ["Rose", "Red"] },
  { id: "veil", name: "Veil", price: 5600, variants: ["Gold"] },
];
test("shopping bag separates shades, computes exact totals and supports quantity removal", () => {
  const cart = context.MakeupStore.createCart(products);
  cart.add("lip", "Rose");
  cart.add("lip", "Rose");
  cart.add("lip", "Red");
  cart.add("veil");
  assert.equal(cart.count(), 4);
  assert.equal(cart.items().length, 3);
  assert.equal(cart.total(), 20000);
  cart.change("lip", "Rose", -1);
  assert.equal(cart.total(), 15200);
  cart.change("lip", "Red", -1);
  assert.equal(cart.count(), 2);
  assert.equal(cart.items().length, 2);
});
test("shopping bag restores valid persisted rows and rejects corrupt or unknown records", () => {
  const cart = context.MakeupStore.createCart(products, [
    null,
    { id: "lip", variant: "Rose", quantity: 2 },
    { id: "missing", variant: "Rose", quantity: 4 },
    { id: "lip", variant: "Wrong", quantity: 2 },
    { id: "veil", variant: "Gold", quantity: -2 },
    { id: "veil", variant: "Gold", quantity: 1.2 },
  ]);
  assert.equal(cart.count(), 2);
  assert.equal(cart.total(), 9600);
  const restored = context.MakeupStore.createCart(
    products,
    JSON.parse(JSON.stringify(cart.serialize())),
  );
  assert.equal(restored.total(), cart.total());
  assert.throws(() => cart.add("missing"), /Unknown product/);
  assert.throws(() => cart.add("lip", "Wrong"), /Unknown shade/);
  assert.throws(() => cart.change("lip", "Rose", 1.5), /integer/);
});
test("each website and gallery have resolvable local routes, images, scripts and section links", () => {
  for (const slug of ["", ...slugs]) {
    const directory = path.join(root, slug);
    const html = fs.readFileSync(path.join(directory, "index.html"), "utf8");
    const ids = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
    );
    for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(ref)) continue;
      if (ref.startsWith("#")) {
        assert.ok(ids.has(ref.slice(1)), slug + ": missing section " + ref);
        continue;
      }
      const file = ref.split("#")[0];
      assert.ok(
        fs.existsSync(path.resolve(directory, file)),
        slug + ": missing file " + ref,
      );
    }
    assert.equal(
      (html.match(/<h1\b/g) || []).length,
      1,
      slug + " needs a single primary heading",
    );
  }
});
test("the original gallery entry now features the mixed-industry portfolio while retaining a beauty archive", () => {
  const gallery = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const archive = fs.readFileSync(path.join(root, "archive.html"), "utf8");
  slugs.forEach((slug) =>
    assert.ok(archive.includes('href="' + slug + '/index.html"')),
  );
  ["aura", "form", "june", "hearth", "north", "tidehouse"].forEach((slug) =>
    assert.ok(gallery.includes('href="../portfolio/' + slug + '/index.html"')),
  );
});
