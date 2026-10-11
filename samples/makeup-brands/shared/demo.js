(function () {
  "use strict";
  const escapeHTML = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  const money = (cents) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  window.DemoShop = function (config) {
    const key = `arsc-makeup-v2-${config.brand}`;
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {}
    const cart = window.MakeupStore.createCart(config.products, saved);
    const dialog = document.createElement("dialog");
    dialog.className = "demo-dialog";
    dialog.innerHTML =
      '<div class="dialog-head"><h2 id="dialog-title"></h2><button class="dialog-close" aria-label="Close dialog">×</button></div><div class="dialog-body"></div>';
    dialog.setAttribute("aria-labelledby", "dialog-title");
    document.body.append(dialog);
    const notice = document.createElement("div");
    notice.className = "notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    document.body.append(notice);
    let noticeTimer;
    let trigger;
    const body = dialog.querySelector(".dialog-body");
    const notify = (message) => {
      notice.textContent = message;
      notice.classList.add("visible");
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => notice.classList.remove("visible"), 3000);
    };
    const update = () => {
      document.querySelectorAll("[data-count]").forEach((element) => {
        element.textContent = cart.count();
      });
      try {
        localStorage.setItem(key, JSON.stringify(cart.serialize()));
      } catch {}
    };
    const open = (title, markup) => {
      trigger = document.activeElement;
      dialog.querySelector("#dialog-title").textContent = title;
      body.innerHTML = markup;
      if (!dialog.open) dialog.showModal();
      dialog.querySelector(".dialog-close").focus();
    };
    dialog
      .querySelector(".dialog-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (trigger?.isConnected) trigger.focus();
    });

    const add = (id, variant) => {
      const product = config.products.find((item) => item.id === id);
      cart.add(id, variant || product.variants[0]);
      update();
      notify(`${product.name} added to your bag`);
    };
    const productDetail = (id) => {
      const product = config.products.find((item) => item.id === id);
      if (!product) return;
      open(
        product.name,
        `<div class="dialog-product"><div class="photo-card" style="--position:${product.position || "center"}"><img src="${config.image}" alt="${escapeHTML(config.brand)} campaign collection"></div><div><span class="chip">${escapeHTML(product.category)}</span><h3>${escapeHTML(product.name)}</h3><p>${escapeHTML(product.description)}</p><strong>${money(product.price)}</strong><label for="product-variant">${escapeHTML(product.variantLabel || "Shade")}</label><select id="product-variant">${product.variants.map((variant) => `<option>${escapeHTML(variant)}</option>`).join("")}</select><button class="action-button" data-detail-add="${product.id}">Add to bag →</button><p class="cart-note">Portfolio concept · illustrative products and AUD pricing.</p></div></div>`,
      );
    };
    const showCart = () => {
      open(
        "Your bag",
        cart.count()
          ? `${cart
              .items()
              .map(
                (row) =>
                  `<article class="cart-line"><div><h3>${escapeHTML(row.product.name)}</h3><p>${escapeHTML(row.variant)}</p><div class="quantity-controls"><button data-quantity="-1" data-id="${row.id}" data-variant="${escapeHTML(row.variant)}" aria-label="Remove one ${escapeHTML(row.product.name)}">−</button><span>${row.quantity}</span><button data-quantity="1" data-id="${row.id}" data-variant="${escapeHTML(row.variant)}" aria-label="Add one ${escapeHTML(row.product.name)}">+</button></div></div><strong>${money(row.quantity * row.product.price)}</strong></article>`,
              )
              .join(
                "",
              )}<div class="cart-total"><span>Subtotal</span><strong>${money(cart.total())}</strong></div><p class="cart-note">Interactive portfolio demo. Orders and payments are not processed.</p><button class="action-button" data-order-summary>Review demo order →</button>`
          : '<div class="empty-cart"><h3>A little room for something good.</h3><p>Your bag is empty. Explore the collection and choose a favourite.</p><button class="action-button" data-close>Continue exploring</button></div>',
      );
    };
    const results = (query) =>
      config.products
        .filter((product) =>
          `${product.name} ${product.category} ${product.description} ${product.variants.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map(
          (product) =>
            `<button data-product="${product.id}"><span>${escapeHTML(product.name)}<small style="display:block;margin-top:5px">${escapeHTML(product.category)}</small></span><strong>${money(product.price)} ↗</strong></button>`,
        )
        .join("") ||
      "<p>No matches. Try a product name, shade or category.</p>";
    const search = () => {
      open(
        "Find your favourite",
        `<label for="product-search">Search products or shades</label><input id="product-search" type="search" placeholder="Try blush, lip or a shade…"><div class="search-results">${results("")}</div>`,
      );
      body.querySelector("input").focus();
    };
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button,[data-product]");
      if (!button) return;
      if (button.hasAttribute("data-product"))
        productDetail(button.dataset.product);
      if (button.hasAttribute("data-add"))
        add(button.dataset.add, button.dataset.variant);
      if (button.hasAttribute("data-detail-add"))
        add(button.dataset.detailAdd, body.querySelector("select").value);
      if (button.hasAttribute("data-cart")) showCart();
      if (button.hasAttribute("data-search")) search();
      if (button.hasAttribute("data-close")) dialog.close();
      if (button.hasAttribute("data-quantity")) {
        const index = [...body.querySelectorAll("[data-quantity]")].indexOf(
          button,
        );
        cart.change(
          button.dataset.id,
          button.dataset.variant,
          Number(button.dataset.quantity),
        );
        update();
        showCart();
        const controls = [...body.querySelectorAll("[data-quantity]")];
        (
          controls[Math.min(index, controls.length - 1)] ||
          dialog.querySelector(".dialog-close")
        ).focus();
      }
      if (button.hasAttribute("data-order-summary"))
        open(
          "Demo order summary",
          `<h3>Your ${escapeHTML(config.brand)} edit</h3>${cart
            .items()
            .map(
              (row) =>
                `<p>${row.quantity} × ${escapeHTML(row.product.name)} — ${escapeHTML(row.variant)}</p>`,
            )
            .join(
              "",
            )}<div class="cart-total"><span>Total</span><strong>${money(cart.total())}</strong></div><p class="cart-note">This is the end of the sample shopping journey. No order has been placed and no payment details are collected.</p><button class="action-button" data-close>Back to the site</button>`,
        );
    });
    body.addEventListener("input", (event) => {
      if (event.target.id === "product-search")
        body.querySelector(".search-results").innerHTML = results(
          event.target.value,
        );
    });
    document.querySelectorAll("[data-newsletter]").forEach((form) =>
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        form.parentElement.querySelector(".form-feedback").textContent =
          "Demo complete. Your email has not been sent or saved.";
        form.reset();
      }),
    );
    update();
    return { add, notify, open, productDetail, showCart, money, cart };
  };
})();
