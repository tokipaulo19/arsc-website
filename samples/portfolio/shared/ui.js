(function () {
  "use strict";
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const dialog = document.createElement("dialog");
  dialog.className = "demo-dialog";
  dialog.setAttribute("aria-labelledby", "dialog-title");
  document.body.append(dialog);
  function open(title, html) {
    dialog.innerHTML =
      '<div class="dialog-head"><h2 id="dialog-title">' +
      escape(title) +
      '</h2><button class="dialog-close" aria-label="Close dialog">×</button></div><div class="dialog-body">' +
      html +
      "</div>";
    if (!dialog.open) dialog.showModal();
    dialog.querySelector(".dialog-close").onclick = () => dialog.close();
    dialog.querySelector(".dialog-close").focus({ preventScroll: true });
  }
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  });
  function today() {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
  }
  document
    .querySelectorAll('input[type="date"]')
    .forEach((i) => (i.min = today()));
  document.querySelectorAll("form[data-demo]").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      form.querySelector(".form-status").textContent =
        "Demo preview complete. Your details have not been sent or saved. No booking or subscription has been made.";
    }),
  );
  window.PortfolioUI = { open, escape, today };
})();
