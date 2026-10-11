const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "../samples/portfolio");
const source = fs.readFileSync(path.join(root, "shared/shop-ui.js"), "utf8");
const products = [
  { id: "shirt", name: "Weekend Shirt", category: "tops", label: "Navy / Cotton poplin", description: "Boxy shirt", price: 8900 },
  { id: "tee", name: "Daily Tee", category: "tops", label: "Ecru / Cotton jersey", description: "Relaxed tee", price: 4900 },
  { id: "trouser", name: "Easy Trouser", category: "bottoms", label: "Sand / Cotton linen", description: "Wide leg", price: 11900 },
  { id: "overshirt", name: "After Hours Overshirt", category: "layers", label: "Olive / Cotton twill", description: "Everyday layer", price: 13900 },
];
function fixture(withSearch = true) {
  const order = [];
  const cards = products.map((p) => ({ dataset: { product: p.id }, button: {}, querySelector() { return this.button; } }));
  const grid = { querySelectorAll: () => cards, append: (card) => order.push(card.dataset.product) };
  const sort = { value: "featured" }, status = {};
  const search = { value: "", handlers: {}, addEventListener(event, fn) { this.handlers[event] = fn; }, scrollIntoView() { this.scrolled = true; }, focus() { this.focused = true; } };
  const filters = ["all", "tops", "bottoms", "layers"].map((category) => ({ dataset: { shopFilter: category }, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } }));
  const toggle = {};
  const elements = { "[data-shop-grid]": grid, "[data-shop-status]": status, "[data-shop-sort]": sort, "[data-shop-search]": withSearch ? search : null };
  const window = {};
  vm.runInNewContext(source, {
    window,
    document: { querySelector: (selector) => elements[selector], querySelectorAll: (selector) => selector === "[data-shop-filter]" ? filters : selector === "[data-search-toggle]" ? [toggle] : [] },
    PortfolioCommerce: { createCart: () => ({ count: () => 0 }), money: String },
    PortfolioUI: { escape: String },
  });
  window.PortfolioShopUI.mount(products, {});
  return { api: window.PortfolioShopUI, cards, order, sort, status, search, filters, toggle, visible: () => cards.filter((c) => !c.hidden).map((c) => c.dataset.product) };
}
test("storefront search normalizes whitespace/case and intersects category with all search terms", () => {
  const { api } = fixture();
  assert.equal(api.matchesProduct(products[0], "all", " NAVY  shirt "), true);
  assert.equal(api.matchesProduct(products[0], "bottoms", "navy"), false);
  assert.equal(api.matchesProduct(products[0], "tops", "navy cotton"), true);
  assert.equal(api.matchesProduct(products[0], "all", "navy wool"), false);
  assert.equal(api.matchesProduct(products[0], "all", " "), true);
  assert.equal(api.matchesProduct(products[0], "all", "<script>"), false);
});
test("search, categories, sorting, empty results and native search clearing stay coordinated", () => {
  const f = fixture();
  assert.deepEqual(f.visible(), ["shirt", "tee", "trouser", "overshirt"]);
  f.toggle.onclick();
  assert.equal(f.search.scrolled, true);
  assert.equal(f.search.focused, true);
  f.search.value = "cotton";
  f.search.handlers.input();
  f.filters[1].onclick();
  assert.deepEqual(f.visible(), ["shirt", "tee"]);
  assert.equal(f.filters[1].attributes["aria-pressed"], "true");
  f.sort.value = "low";
  f.sort.onchange();
  assert.deepEqual(f.order.slice(-4), ["tee", "shirt", "trouser", "overshirt"]);
  f.search.value = "olive";
  f.search.handlers.input();
  assert.deepEqual(f.visible(), []);
  assert.match(f.status.textContent, /No matching pieces/);
  f.filters[0].onclick();
  assert.deepEqual(f.visible(), ["overshirt"]);
  f.search.value = "";
  f.search.handlers.search();
  assert.equal(f.visible().length, 4);
  assert.equal(f.status.textContent, "4 products to explore");
});
test("the shared shop still works without search, as used by Circuit Bench", () => {
  const f = fixture(false);
  assert.equal(f.visible().length, 4);
  f.filters[2].onclick();
  assert.deepEqual(f.visible(), ["trouser"]);
  assert.equal(typeof f.cards[0].button.onclick, "function");
});
test("fitness stock provenance is explicit and apparel reviews refer to actual demo garments", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/prompts.json"), "utf8"));
  const hero = manifest.assets.find((asset) => asset.file === "form-hero.webp");
  assert.equal(hero.method, "Licensed stock photography");
  assert.equal(hero.prompt, null);
  assert.equal(hero.author, "Airam Dato-on");
  assert.equal(hero.license, "https://www.pexels.com/license/");
  const html = fs.readFileSync(path.join(root, "offday/index.html"), "utf8");
  assert.match(html, /data-shop-search/);
  assert.match(html, /Made for<br \/> the everyday\./);
  assert.equal((html.match(/Choose size <span/g) || []).length, 4);
  assert.match(html, /Daily Tee \/ size M/);
  assert.match(html, /Weekend Shirt \/ size S/);
  assert.match(html, /Easy Trouser \/ size L/);
});
