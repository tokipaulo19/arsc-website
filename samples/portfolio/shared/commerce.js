(function (scope) {
  "use strict";
  const money = (cents) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(cents / 100);
  function createCart(products) {
    const rows = new Map(),
      catalog = new Map(products.map((p) => [p.id, p]));
    function product(id, variant) {
      const p = catalog.get(id);
      if (!p || !p.variants.includes(variant))
        throw new Error("Unknown product or option");
      return p;
    }
    function change(id, variant, delta) {
      product(id, variant);
      if (!Number.isInteger(delta))
        throw new Error("Quantity must be an integer");
      const key = JSON.stringify([id, variant]);
      const quantity = (rows.get(key)?.quantity || 0) + delta;
      if (quantity > 10) throw new Error("Demo limit: ten per option");
      if (quantity <= 0) rows.delete(key);
      else rows.set(key, { id, variant, quantity });
    }
    const items = () =>
      [...rows.values()].map((r) => ({ ...r, product: catalog.get(r.id) }));
    return {
      add: (id, variant) => change(id, variant, 1),
      change,
      items,
      count: () => items().reduce((n, r) => n + r.quantity, 0),
      total: () =>
        items().reduce((n, r) => n + r.product.price * r.quantity, 0),
    };
  }
  function delivery(subtotal, threshold, rate) {
    if (
      ![subtotal, threshold, rate].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      threshold === 0
    )
      throw new Error("Invalid delivery amount");
    return subtotal === 0 || subtotal >= threshold ? 0 : rate;
  }
  function buildQuote(purpose, memory, storage) {
    const base = { everyday: 129900, gaming: 169900, creator: 219900 };
    if (
      !Object.hasOwn(base, purpose) ||
      ![16, 32].includes(memory) ||
      ![1, 2].includes(storage)
    )
      throw new Error("Invalid build selection");
    return {
      purpose,
      memory,
      storage,
      total:
        base[purpose] + (memory === 32 ? 8000 : 0) + (storage === 2 ? 9000 : 0),
    };
  }
  scope.PortfolioCommerce = { money, createCart, delivery, buildQuote };
})(typeof window === "undefined" ? globalThis : window);
