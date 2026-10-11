(function (scope) {
  "use strict";
  function createCart(products, initial) {
    const catalog = new Map(products.map((product) => [product.id, product]));
    const rows = new Map();
    (Array.isArray(initial) ? initial : []).forEach((row) => {
      if (
        row &&
        catalog.has(row.id) &&
        catalog.get(row.id).variants.includes(row.variant) &&
        Number.isInteger(row.quantity) &&
        row.quantity > 0
      ) {
        rows.set(JSON.stringify([row.id, row.variant]), {
          id: row.id,
          variant: row.variant,
          quantity: Math.min(row.quantity, 99),
        });
      }
    });
    return {
      add(id, variant) {
        if (!catalog.has(id)) throw new Error("Unknown product");
        variant = variant || catalog.get(id).variants[0];
        if (!catalog.get(id).variants.includes(variant))
          throw new Error("Unknown shade");
        const key = JSON.stringify([id, variant]);
        const row = rows.get(key) || { id, variant, quantity: 0 };
        rows.set(key, { ...row, quantity: Math.min(99, row.quantity + 1) });
      },
      change(id, variant, delta) {
        if (!Number.isInteger(delta))
          throw new Error("Quantity change must be an integer");
        const key = JSON.stringify([id, variant]);
        const row = rows.get(key);
        if (!row) return;
        const quantity = Math.min(99, row.quantity + delta);
        if (quantity <= 0) rows.delete(key);
        else rows.set(key, { ...row, quantity });
      },
      items() {
        return [...rows.values()].map((row) => ({
          ...row,
          product: catalog.get(row.id),
        }));
      },
      serialize() {
        return [...rows.values()].map((row) => ({ ...row }));
      },
      count() {
        return [...rows.values()].reduce(
          (total, row) => total + row.quantity,
          0,
        );
      },
      total() {
        return [...rows.values()].reduce(
          (total, row) => total + catalog.get(row.id).price * row.quantity,
          0,
        );
      },
    };
  }
  scope.MakeupStore = { createCart };
})(typeof window === "undefined" ? globalThis : window);
