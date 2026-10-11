(function (scope) {
  "use strict";
  const money = (value) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(value);
  const beautyServices = {
    occasion: { name: "Occasion makeup", rate: 130 },
    bridal: { name: "Bridal makeup", rate: 220 },
    lesson: { name: "Personal lesson", rate: 160 },
  };
  function beautyQuote(service, count, trial = false) {
    const item = beautyServices[service];
    if (
      !Object.hasOwn(beautyServices, service) ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 6 ||
      typeof trial !== "boolean"
    )
      throw new Error("Invalid beauty selection");
    return {
      title: item.name,
      total: item.rate * count + (trial && service === "bridal" ? 110 : 0),
      people: count,
      trial: trial && service === "bridal",
    };
  }
  const coachPlans = {
    strength: {
      title: "Build your base",
      focus: "Full-body strength, technique and steady progression.",
      sessions: [
        "Full-body foundations",
        "Strength + control",
        "Full-body progress",
        "Accessory practice",
      ],
    },
    energy: {
      title: "Find your rhythm",
      focus: "A balance of strength, low-impact movement and recovery.",
      sessions: [
        "Full-body strength",
        "Easy movement",
        "Strength + mobility",
        "Low-impact conditioning",
      ],
    },
    return: {
      title: "Start where you are",
      focus: "A manageable practice that grows with your confidence.",
      sessions: [
        "Movement foundations",
        "Technique practice",
        "Full-body basics",
        "Recovery + mobility",
      ],
    },
  };
  function coachPlan(goal, days) {
    if (
      !Object.hasOwn(coachPlans, goal) ||
      !Number.isInteger(days) ||
      days < 2 ||
      days > 4
    )
      throw new Error("Invalid programme selection");
    return {
      ...coachPlans[goal],
      days,
      sessions: coachPlans[goal].sessions.slice(0, days),
      monthly: 149,
    };
  }
  const rooms = {
    garden: { name: "Garden room", rate: 220, capacity: 2 },
    ocean: { name: "Ocean studio", rate: 295, capacity: 3 },
    loft: { name: "The dune loft", rate: 380, capacity: 4 },
  };
  function stayQuote(room, nights, guests) {
    const item = rooms[room];
    if (
      !Object.hasOwn(rooms, room) ||
      !Number.isInteger(nights) ||
      nights < 1 ||
      nights > 14 ||
      !Number.isInteger(guests) ||
      guests < 1 ||
      guests > item.capacity
    )
      throw new Error("Choose guests within the room capacity");
    return { ...item, nights, guests, total: item.rate * nights };
  }
  function isFutureDate(value, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + "T12:00:00Z");
    return (
      !Number.isNaN(d.valueOf()) &&
      d.toISOString().slice(0, 10) === value &&
      value >= today
    );
  }
  const menus = [
    {
      name: "House flat white",
      category: "coffee",
      price: 5,
      tag: "Coffee",
      note: "Double espresso, silky milk. Oat milk +$1.",
    },
    {
      name: "Cold brew tonic",
      category: "coffee",
      price: 7,
      tag: "Coffee",
      note: "Slow-steeped coffee, tonic, orange.",
    },
    {
      name: "Filter of the day",
      category: "coffee",
      price: 6,
      tag: "Coffee",
      note: "A rotating single-origin pour-over.",
    },
    {
      name: "Ricotta hotcakes",
      category: "breakfast",
      price: 23,
      tag: "Vegetarian",
      note: "Seasonal fruit, lemon curd, maple.",
    },
    {
      name: "Green morning toast",
      category: "breakfast",
      price: 21,
      tag: "Vegan",
      note: "Sourdough, avocado, herbs, pickled shallot.",
    },
    {
      name: "Soft eggs on toast",
      category: "breakfast",
      price: 19,
      tag: "Vegetarian",
      note: "Scrambled eggs, cultured butter, chives.",
    },
    {
      name: "Tomato + stracciatella",
      category: "lunch",
      price: 24,
      tag: "Vegetarian",
      note: "Heirloom tomatoes, basil oil, sourdough.",
    },
    {
      name: "Roast mushroom bowl",
      category: "lunch",
      price: 22,
      tag: "Vegan",
      note: "Brown rice, kale, tahini, toasted seeds.",
    },
    {
      name: "Chicken focaccia",
      category: "lunch",
      price: 25,
      tag: "Lunch",
      note: "Roast chicken, green sauce, crispy leaves.",
    },
  ];
  function interiorQuote(space, area, scope) {
    const types = {
      home: "Home",
      hospitality: "Café / hospitality",
      workplace: "Workplace",
    };
    if (
      !Object.hasOwn(types, space) ||
      !Number.isInteger(area) ||
      area < 10 ||
      area > 500 ||
      !["concept", "detailed"].includes(scope)
    )
      throw new Error("Invalid design brief");
    const rate = scope === "concept" ? 50 : 90;
    return {
      space: types[space],
      area,
      scope:
        scope === "concept" ? "Concept direction" : "Detailed design study",
      total: area * rate,
    };
  }
  function departureDate(arrival, nights) {
    if (
      !isFutureDate(arrival, "0000-00-00") ||
      !Number.isInteger(nights) ||
      nights < 1 ||
      nights > 14
    )
      throw new Error("Invalid stay dates");
    const d = new Date(arrival + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + nights);
    return d.toISOString().slice(0, 10);
  }
  scope.PortfolioDomain = {
    money,
    beautyServices,
    beautyQuote,
    coachPlan,
    rooms,
    stayQuote,
    isFutureDate,
    menus,
    interiorQuote,
    departureDate,
  };
})(typeof window === "undefined" ? globalThis : window);
