const form = document.querySelector("#stay-form");
const { rooms, stayQuote, money } = PortfolioDomain;
function updateRoom() {
  const room = form.elements.room.value;
  const previous = Number(form.elements.guests.value);
  form.elements.guests.innerHTML = Array.from(
    { length: rooms[room].capacity },
    (_, i) =>
      '<option value="' +
      (i + 1) +
      '">' +
      (i + 1) +
      (i === 0 ? " guest" : " guests") +
      "</option>",
  ).join("");
  form.elements.guests.value = Math.min(previous || 2, rooms[room].capacity);
  document.querySelectorAll("[data-room]").forEach((b) => {
    const active = b.dataset.room === room;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  updateQuote();
}
function updateQuote() {
  const q = stayQuote(
    form.elements.room.value,
    Number(form.elements.nights.value),
    Number(form.elements.guests.value),
  );
  document.querySelector("#stay-total").textContent = money(q.total);
  document.querySelector("#stay-breakdown").textContent =
    q.nights + (q.nights === 1 ? " night" : " nights") + " × " + money(q.rate);
}
form.elements.room.addEventListener("change", updateRoom);
form.addEventListener("change", updateQuote);
document.querySelectorAll("[data-room]").forEach((b) =>
  b.addEventListener("click", () => {
    form.elements.room.value = b.dataset.room;
    updateRoom();
    document.querySelector("#stay").scrollIntoView({ behavior: "smooth" });
  }),
);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  if (
    !PortfolioDomain.isFutureDate(
      form.elements.arrival.value,
      PortfolioUI.today(),
    )
  ) {
    form.querySelector(".form-status").textContent =
      "Choose today or a future arrival.";
    return;
  }
  const q = stayQuote(
    form.elements.room.value,
    Number(form.elements.nights.value),
    Number(form.elements.guests.value),
  );
  const departure = PortfolioDomain.departureDate(
    form.elements.arrival.value,
    q.nights,
  );
  PortfolioUI.open(
    "Your coastal stay preview",
    "<dl><dt>Room</dt><dd>" +
      q.name +
      "</dd><dt>Arrival</dt><dd>" +
      PortfolioUI.escape(form.elements.arrival.value) +
      "</dd><dt>Departure</dt><dd>" +
      departure +
      "</dd><dt>Guests</dt><dd>" +
      q.guests +
      "</dd><dt>Nights</dt><dd>" +
      q.nights +
      "</dd><dt>Sample room-rate total</dt><dd>" +
      money(q.total) +
      '</dd></dl><p class="demo-label">Not a booking confirmation. No availability check, payment or enquiry has been made. Your email has not been sent or saved.</p>',
  );
  form.querySelector(".form-status").textContent =
    "Stay preview ready. No booking has been made.";
});
const days = {
  quiet: {
    name: "A VERY SLOW DAY",
    items: [
      [
        "07:30",
        "Coffee with the sea",
        "A warm cup, an open door, and no rush.",
      ],
      ["11:00", "Find a shady corner", "A good book and a little breeze."],
      [
        "17:30",
        "The last light",
        "A walk along the water, then nowhere to be.",
      ],
    ],
  },
  explore: {
    name: "A LITTLE FRESH AIR",
    items: [
      [
        "06:30",
        "Follow the shoreline",
        "An easy coastal walk as the day begins.",
      ],
      ["10:00", "Into the water", "Choose your own pace at the beach."],
      ["16:00", "One more headland", "Take the scenic way back."],
    ],
  },
  together: {
    name: "TIME WELL SHARED",
    items: [
      [
        "08:30",
        "Breakfast without a clock",
        "A full table and a slow second coffee.",
      ],
      [
        "12:30",
        "A lunch that lingers",
        "Local flavours and good conversation.",
      ],
      [
        "18:00",
        "Stay for the sunset",
        "A deck, a view, and your favourite people.",
      ],
    ],
  },
};
document
  .querySelectorAll("[data-day]")
  .forEach((b) => b.addEventListener("click", () => showDay(b.dataset.day)));
function showDay(id) {
  const d = days[id];
  document.querySelector("#day-name").textContent = d.name;
  document.querySelector("#day-timeline").innerHTML = d.items
    .map(
      ([time, title, text]) =>
        "<li><span>" +
        time +
        "</span><div><h3>" +
        title +
        "</h3><p>" +
        text +
        "</p></div></li>",
    )
    .join("");
  document.querySelectorAll("[data-day]").forEach((b) => {
    const active = b.dataset.day === id;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
}
showDay("quiet");
updateRoom();
