(function () {
  "use strict";
  function mount(products, options) {
    const cart = PortfolioCommerce.createCart(products),
      cash = PortfolioCommerce.money,
      esc = PortfolioUI.escape;
    const byId = new Map(products.map((p) => [p.id, p]));
    const grid = document.querySelector("[data-shop-grid]");
    const cards = [...grid.querySelectorAll("[data-product]")];
    const status = document.querySelector("[data-shop-status]");
    let filter = "all";
    function updateCount() {
      document
        .querySelectorAll("[data-bag-count]")
        .forEach((n) => (n.textContent = cart.count()));
    }
    function openBag(focusKey) {
      const items = cart.items(),
        subtotal = cart.total(),
        shipping = PortfolioCommerce.delivery(
          subtotal,
          options.threshold,
          options.shipping,
        );
      PortfolioUI.open(
        options.bagTitle,
        items.length
          ? '<div class="shop-bag">' +
              items
                .map(
                  (r, i) =>
                    "<article><h3>" +
                    esc(r.product.name) +
                    "</h3><p>" +
                    esc(r.variant) +
                    " · " +
                    cash(r.product.price) +
                    ' each</p><div class="shop-quantity"><button data-cart-row="' +
                    i +
                    '" data-delta="-1" aria-label="Decrease ' +
                    esc(r.product.name) +
                    " " +
                    esc(r.variant) +
                    ' quantity">−</button><span>' +
                    r.quantity +
                    '</span><button data-cart-row="' +
                    i +
                    '" data-delta="1" ' +
                    (r.quantity === 10 ? "disabled" : "") +
                    ' aria-label="Increase ' +
                    esc(r.product.name) +
                    " " +
                    esc(r.variant) +
                    ' quantity">+</button><strong>' +
                    cash(r.quantity * r.product.price) +
                    "</strong></div></article>",
                )
                .join("") +
              "</div><dl><dt>Subtotal</dt><dd>" +
              cash(subtotal) +
              "</dd><dt>Sample standard delivery</dt><dd>" +
              cash(shipping) +
              "</dd><dt>Total (AUD)</dt><dd><strong>" +
              cash(subtotal + shipping) +
              '</strong></dd></dl><button class="shop-primary" data-checkout>Preview order summary ↗</button><p class="demo-label">Local demo bag. No payment or order is processed; nothing is saved after a reload.</p>'
          : "<p>Your bag is empty. Explore the collection and choose a product to try the shopping experience.</p>",
      );
      document.querySelectorAll("[data-cart-row]").forEach(
        (b) =>
          (b.onclick = () => {
            const r = items[Number(b.dataset.cartRow)];
            cart.change(r.id, r.variant, Number(b.dataset.delta));
            updateCount();
            openBag(b.getAttribute("aria-label"));
          }),
      );
      const target = [...document.querySelectorAll("[data-cart-row]")].find(
        (b) => b.getAttribute("aria-label") === focusKey,
      );
      if (target && !target.disabled) target.focus({ preventScroll: true });
      const checkout = document.querySelector("[data-checkout]");
      if (checkout)
        checkout.onclick = () =>
          PortfolioUI.open(
            "Your sample order",
            "<p><strong>" +
              cart.count() +
              " item" +
              (cart.count() === 1 ? "" : "s") +
              " · " +
              cash(subtotal + shipping) +
              " including sample delivery.</strong></p><ul>" +
              items
                .map(
                  (r) =>
                    "<li>" +
                    esc(r.product.name) +
                    " / " +
                    esc(r.variant) +
                    " × " +
                    r.quantity +
                    "</li>",
                )
                .join("") +
              '</ul><p>This is the end of the demo journey. No order has been placed, no stock reserved and no payment taken. A real shop would collect delivery information and show final terms here.</p><button class="shop-primary" data-return-bag>Return to bag</button>',
          );
      if (checkout)
        checkout.addEventListener("click", () => {
          document.querySelector("[data-return-bag]").onclick = () => openBag();
        });
    }
    function openProduct(id) {
      const p = byId.get(id);
      if (!p) return;
      const choose = p.variants.length > 1;
      PortfolioUI.open(
        p.name,
        '<div class="shop-detail"><img src="' +
          p.image +
          '" alt="' +
          esc(p.alt) +
          '"><div><p class="eyebrow">' +
          esc(p.label) +
          '</p><p class="shop-detail-price">' +
          cash(p.price) +
          "</p><p>" +
          esc(p.description) +
          "</p><dl>" +
          p.specs
            .map(
              ([key, value]) =>
                "<dt>" + esc(key) + "</dt><dd>" + esc(value) + "</dd>",
            )
            .join("") +
          "</dl><p>" +
          esc(p.care) +
          '</p><label class="field">' +
          esc(options.optionLabel) +
          "<select data-variant>" +
          (choose ? '<option value="">Choose an option</option>' : "") +
          p.variants
            .map(
              (v) => '<option value="' + esc(v) + '">' + esc(v) + "</option>",
            )
            .join("") +
          '</select></label><button class="shop-primary" data-add ' +
          (choose ? "disabled" : "") +
          '>Add to demo bag</button><p role="status" data-add-status></p><p class="demo-label">Fictional product, illustrative price and generated image. No real inventory.</p></div></div>',
      );
      const select = document.querySelector("[data-variant]"),
        add = document.querySelector("[data-add]"),
        feedback = document.querySelector("[data-add-status]");
      select.onchange = () => {
        add.disabled = !select.value;
        feedback.textContent = "";
      };
      add.onclick = () => {
        try {
          cart.add(id, select.value);
          updateCount();
          feedback.textContent =
            p.name +
            " / " +
            select.value +
            " added. Open the bag in the header to review.";
        } catch (e) {
          feedback.textContent = e.message;
        }
      };
    }
    function render() {
      const sort = document.querySelector("[data-shop-sort]").value;
      [...cards]
        .sort((a, b) =>
          sort === "low"
            ? byId.get(a.dataset.product).price -
              byId.get(b.dataset.product).price
            : sort === "high"
              ? byId.get(b.dataset.product).price -
                byId.get(a.dataset.product).price
              : cards.indexOf(a) - cards.indexOf(b),
        )
        .forEach((card) => {
          card.hidden =
            filter !== "all" &&
            byId.get(card.dataset.product).category !== filter;
          grid.append(card);
        });
      const count = cards.filter((c) => !c.hidden).length;
      status.textContent =
        count + " product" + (count === 1 ? "" : "s") + " to explore";
    }
    cards.forEach(
      (card) =>
        (card.querySelector("button").onclick = () =>
          openProduct(card.dataset.product)),
    );
    document.querySelectorAll("[data-shop-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          filter = b.dataset.shopFilter;
          document.querySelectorAll("[data-shop-filter]").forEach((x) => {
            x.setAttribute("aria-pressed", String(x === b));
          });
          render();
        }),
    );
    document.querySelector("[data-shop-sort]").onchange = render;
    document
      .querySelectorAll("[data-open-bag]")
      .forEach((b) => (b.onclick = () => openBag()));
    render();
    updateCount();
  }
  window.PortfolioShopUI = { mount };
})();
