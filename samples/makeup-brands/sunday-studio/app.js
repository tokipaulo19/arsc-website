const products = [
  {
    id: "anywhere",
    name: "Anywhere Stick",
    price: 2800,
    category: "Colour",
    description:
      "A creamy multi-stick for cheeks, lips and lids. Made for quick blending with fingers.",
    variants: ["Peach walk", "Rose nap", "Cinnamon run"],
    position: "62% center",
  },
  {
    id: "pocket",
    name: "Pocket Balm",
    price: 1900,
    category: "Lips",
    description:
      "Soft colour and a comfortable lip finish. Small enough for even your tiny bag.",
    variants: ["Soft berry", "Apricot", "Clear"],
    position: "72% center",
  },
  {
    id: "lash",
    name: "Good Day Lash",
    price: 2500,
    category: "Eyes",
    description:
      "A soft lift mascara that adds just enough definition for everyday plans.",
    variants: ["Warm brown", "Soft black"],
    position: "77% center",
  },
];
const shop = DemoShop({
  brand: "Sunday Studio",
  products,
  image: "../assets/sunday-studio-hero.png",
});
const bundle = document.getElementById("bundle-form");
function bundleIds() {
  return [...bundle.querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
}
bundle.addEventListener("change", () => {
  const ids = bundleIds();
  document.getElementById("bundle-count").textContent =
    ids.length + " everyday essential" + (ids.length === 1 ? "" : "s");
  document.getElementById("bundle-total").textContent = shop.money(
    ids.reduce(
      (total, id) => total + products.find((p) => p.id === id).price,
      0,
    ),
  );
  document.getElementById("pack-bag").disabled = !ids.length;
});
bundle.addEventListener("submit", (event) => {
  event.preventDefault();
  bundleIds().forEach((id) => shop.add(id));
  shop.notify("Your daily edit is packed");
});
const routines = {
  3: [
    ["Swipe colour", "Anywhere Stick on cheeks and lips. Blend with fingers."],
    ["Balm and go", "A quick swipe of Pocket Balm. You are ready."],
  ],
  5: [
    [
      "Swipe a little colour",
      "Anywhere Stick on cheeks and lips. Blend with fingers.",
    ],
    ["Wake up your lashes", "One coat of Good Day Lash, from root to tip."],
    ["Balm, keys, go", "A quick swipe of Pocket Balm. You are ready."],
  ],
  10: [
    ["Settle in", "Start with clean, moisturised skin. Give it a moment."],
    [
      "Build your colour",
      "Layer Anywhere Stick over cheeks, then tap the remainder onto lids.",
    ],
    [
      "Give lashes a lift",
      "Work Good Day Lash from roots to tips. Add a second coat if you like.",
    ],
    [
      "The last little touch",
      "Pocket Balm and a look in daylight. Ready when you are.",
    ],
  ],
};
let duration = 5,
  remaining = 300,
  interval = null,
  deadline = 0;
const timerButton = document.getElementById("timer-toggle");
function drawTime() {
  const minutes = Math.floor(remaining / 60),
    seconds = remaining % 60;
  document.getElementById("timer-display").textContent =
    String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}
function pause() {
  clearInterval(interval);
  interval = null;
  timerButton.textContent = remaining === 0 ? "Start again ▶" : "Start timer ▶";
}
function resetTimer() {
  pause();
  remaining = duration * 60;
  drawTime();
}
timerButton.addEventListener("click", () => {
  if (interval) {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    pause();
    drawTime();
    return;
  }
  if (remaining === 0) remaining = duration * 60;
  deadline = Date.now() + remaining * 1000;
  timerButton.textContent = "Pause timer Ⅱ";
  interval = setInterval(() => {
    remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    drawTime();
    if (!remaining) {
      pause();
      shop.notify("Your little get-ready window is complete");
    }
  }, 250);
});
document.getElementById("timer-reset").addEventListener("click", resetTimer);
const steps = document.getElementById("routine-steps");
function drawProgress() {
  const total = steps.querySelectorAll("input").length,
    done = steps.querySelectorAll("input:checked").length;
  document.getElementById("routine-progress").max = total;
  document.getElementById("routine-progress").value = done;
  document.getElementById("routine-done").textContent =
    done === total
      ? "All ready. Enjoy your day."
      : done + " of " + total + " steps";
}
steps.addEventListener("change", drawProgress);
document.querySelectorAll("[data-duration]").forEach((button) =>
  button.addEventListener("click", () => {
    duration = Number(button.dataset.duration);
    document.querySelectorAll("[data-duration]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    resetTimer();
    steps.innerHTML = routines[duration]
      .map(
        ([title, text], i) =>
          '<label><input type="checkbox" data-step><span><strong>0' +
          (i + 1) +
          " / " +
          title +
          "</strong><small>" +
          text +
          "</small></span></label>",
      )
      .join("");
    drawProgress();
    document.getElementById("routine-tip").textContent =
      duration === 3
        ? "Three minutes. Just the easy essentials."
        : duration === 10
          ? "Ten minutes. Take your time and enjoy the ritual."
          : "Five minutes. Fingers are your only tools.";
  }),
);
window.addEventListener("pagehide", pause);
const articles = {
  morning: [
    "The small pleasure of getting ready.",
    "Getting ready can feel like another thing on the list. But it can also be a small pause: a warm drink nearby, good light, one familiar thing in your hand.",
    "Choose a routine that fits the time you have. Three minutes may be all you need. Start with a little colour on cheeks, blend the edges and finish with something comfortable on the lips.",
    "The aim is not a different face. It is a nice beginning to your day. You are allowed to keep it very simple.",
  ],
  bag: [
    "A makeup bag that fits your life.",
    "The useful makeup bag is the one that comes with you. It has a few familiar things, all easy to use without a perfect setup.",
    "A multi-stick can handle cheeks and lips. A balm keeps the finish comfortable. Mascara is there when you want a little definition. You can do plenty with those three.",
    "Keep the products you reach for. Let the others stay at home. The best edit is the one that matches the way you actually live.",
  ],
};
document.querySelectorAll("[data-article]").forEach((button) =>
  button.addEventListener("click", () => {
    const story = articles[button.dataset.article];
    shop.open(
      story[0],
      '<span class="s-eyebrow">THE SUNDAY JOURNAL / ISSUE 01</span>' +
        story
          .slice(1)
          .map(
            (p) =>
              '<p style="line-height:1.9;font-size:15px;margin-top:25px">' +
              p +
              "</p>",
          )
          .join("") +
        '<button class="action-button" data-close>Back to Sunday →</button>',
    );
  }),
);
