const DATA_ROOT = "https://raw.githubusercontent.com/tokipaulo19/nbaaustralia-operations/main";
const NBA_HANDLE = "nbaaustralia_official";
const CACHE_VERSION = Math.floor(Date.now() / 300000);

const numberFormat = new Intl.NumberFormat("en-AU");
const compactFormat = new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
const percentFormat = new Intl.NumberFormat("en-AU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const COMPETITOR_COLOURS = ["#f5f3ec", "#59a9ff", "#55d89b", "#ff7c72", "#b796ff", "#5ed4df", "#f49b42"];

const state = {
  report: [],
  profiles: new Map(),
  history: [],
  issues: [],
  selectedHandles: new Set(),
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((record) => Object.fromEntries(
    headers.map((header, index) => [header.trim(), (record[index] ?? "").trim()]),
  ));
}

async function fetchCSV(path, optional = false) {
  try {
    const response = await fetch(`${DATA_ROOT}/${path}?v=${CACHE_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
    return parseCSV(await response.text());
  } catch (error) {
    if (optional) return [];
    throw error;
  }
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function profileFor(handle) {
  return state.profiles.get(handle) || { name: handle, group: "Other" };
}

function accountName(handle) {
  return profileFor(handle).name || handle;
}

function signedInteger(value) {
  const number = numeric(value);
  return `${number > 0 ? "+" : ""}${numberFormat.format(number)}`;
}

function formatGrowth(value) {
  return `${percentFormat.format(numeric(value))}%`;
}

function valueClass(value) {
  return numeric(value) >= 0 ? "positive" : "negative";
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function renderSummary() {
  const nba = state.report.find((account) => account.handle === NBA_HANDLE);
  if (!nba) throw new Error("NBA Australia is missing from the latest report");

  const reportDate = parseDate(nba.date);
  const comparisonDate = parseDate(nba.comparison_date);
  const ahead = state.report.filter((account) => account.ahead_of_nba.toLowerCase() === "yes").length;

  setText("statusText", "Latest report loaded");
  setText("reportPeriod", `Updated ${dateFormat.format(reportDate)} · comparison starts ${dateFormat.format(comparisonDate)}`);
  setText("nbaFollowers", numberFormat.format(numeric(nba.current_followers)));
  setText("nbaFollowerChange", `${signedInteger(nba.follower_change_30d_plus)} followers`);
  setText("nbaRank", `#${nba.rank}`);
  setText("trackedAccounts", `Across ${state.report.length} tracked accounts`);
  setText("nbaGrowth", formatGrowth(nba.growth_percent_30d_plus));
  setText("comparisonWindow", `${nba.comparison_days}-day comparison window`);
  setText("accountsAhead", String(ahead));
}

function renderControls() {
  const groupFilter = document.getElementById("groupFilter");
  const groups = [...new Set(state.report.map((account) => profileFor(account.handle).group).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group;
    option.textContent = group;
    groupFilter.appendChild(option);
  });

  const competitors = state.report
    .filter((account) => account.handle !== NBA_HANDLE)
    .sort((a, b) => accountName(a.handle).localeCompare(accountName(b.handle)));

  const directCompetitor = state.report.find((account) => (
    account.handle !== NBA_HANDLE && profileFor(account.handle).group === "Direct Competitor"
  ));
  const initialHandle = directCompetitor?.handle || competitors[0]?.handle;
  if (initialHandle) state.selectedHandles.add(initialHandle);

  const options = document.getElementById("competitorOptions");
  competitors.forEach((account) => {
    const label = document.createElement("label");
    label.className = "competitor-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = account.handle;
    checkbox.checked = state.selectedHandles.has(account.handle);

    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = accountName(account.handle);
    const details = document.createElement("small");
    details.textContent = `@${account.handle}`;
    copy.append(name, details);
    label.append(checkbox, copy);
    options.appendChild(label);
  });
}

function makeCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function filteredReport() {
  const query = document.getElementById("accountSearch").value.trim().toLowerCase();
  const group = document.getElementById("groupFilter").value;
  const order = document.getElementById("sortOrder").value;

  const filtered = state.report.filter((account) => {
    const profile = profileFor(account.handle);
    const matchesQuery = !query || account.handle.toLowerCase().includes(query) || profile.name.toLowerCase().includes(query);
    const matchesGroup = group === "all" || profile.group === group;
    return matchesQuery && matchesGroup;
  });

  const sorters = {
    rank: (a, b) => numeric(a.rank) - numeric(b.rank),
    growth: (a, b) => numeric(b.growth_percent_30d_plus) - numeric(a.growth_percent_30d_plus),
    posts: (a, b) => numeric(b.posts_since_previous_snapshot) - numeric(a.posts_since_previous_snapshot),
    name: (a, b) => accountName(a.handle).localeCompare(accountName(b.handle)),
  };

  return filtered.sort(sorters[order]);
}

function renderRanking() {
  const rows = filteredReport();
  const tbody = document.getElementById("rankingRows");
  tbody.replaceChildren();

  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = makeCell("No accounts match these filters.", "loading-cell");
    cell.colSpan = 7;
    row.appendChild(cell);
    tbody.appendChild(row);
  }

  rows.forEach((account) => {
    const profile = profileFor(account.handle);
    const row = document.createElement("tr");
    if (account.handle === NBA_HANDLE) row.className = "is-nba";

    row.appendChild(makeCell(account.rank));

    const accountCell = document.createElement("td");
    const accountLink = document.createElement("a");
    accountLink.className = "account-handle";
    accountLink.href = `https://www.instagram.com/${encodeURIComponent(account.handle)}/`;
    accountLink.target = "_blank";
    accountLink.rel = "noopener noreferrer";
    accountLink.textContent = `@${account.handle}`;
    const name = document.createElement("span");
    name.className = "account-name";
    name.textContent = profile.name;
    accountCell.append(accountLink, name);
    row.appendChild(accountCell);

    row.appendChild(makeCell(profile.group, "group-label"));
    row.appendChild(makeCell(numberFormat.format(numeric(account.current_followers))));
    row.appendChild(makeCell(signedInteger(account.follower_change_30d_plus), valueClass(account.follower_change_30d_plus)));
    row.appendChild(makeCell(formatGrowth(account.growth_percent_30d_plus), valueClass(account.growth_percent_30d_plus)));
    row.appendChild(makeCell(numberFormat.format(numeric(account.posts_since_previous_snapshot))));
    tbody.appendChild(row);
  });

  setText("tableCount", `${rows.length} of ${state.report.length} accounts shown`);
}

function renderGrowthLeaders() {
  const list = document.getElementById("growthLeaders");
  list.replaceChildren();

  [...state.report]
    .sort((a, b) => numeric(b.growth_percent_30d_plus) - numeric(a.growth_percent_30d_plus))
    .slice(0, 5)
    .forEach((account, index) => {
      const item = document.createElement("li");
      const rank = document.createElement("span");
      rank.className = "leader-rank";
      rank.textContent = String(index + 1).padStart(2, "0");

      const details = document.createElement("div");
      details.className = "leader-account";
      const name = document.createElement("strong");
      name.textContent = accountName(account.handle);
      const handle = document.createElement("span");
      handle.textContent = `@${account.handle} · ${signedInteger(account.follower_change_30d_plus)} followers`;
      details.append(name, handle);

      const value = document.createElement("span");
      value.className = `leader-value ${valueClass(account.growth_percent_30d_plus)}`;
      value.textContent = formatGrowth(account.growth_percent_30d_plus);
      item.append(rank, details, value);
      list.appendChild(item);
    });
}

function buildHistory(historical, snapshots) {
  const points = new Map();
  [...historical, ...snapshots].forEach((row) => {
    const followers = Number(row.followers);
    const { date, handle } = row;
    if (!date || !handle || !Number.isFinite(followers)) return;
    points.set(`${date}|${handle}`, { date, handle, followers });
  });
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function seriesFor(handle) {
  return state.history.filter((point) => point.handle === handle);
}

function drawTrendChart() {
  const canvas = document.getElementById("trendChart");
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  context.scale(ratio, ratio);

  const { width, height } = rect;
  const padding = { top: 16, right: 16, bottom: 36, left: width < 520 ? 48 : 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const selectedAccounts = state.report.filter((account) => state.selectedHandles.has(account.handle));
  const chartSeries = [
    { handle: NBA_HANDLE, name: "NBA Australia", colour: "#e5bb31", points: seriesFor(NBA_HANDLE) },
    ...selectedAccounts.map((account, index) => ({
      handle: account.handle,
      name: accountName(account.handle),
      colour: COMPETITOR_COLOURS[index % COMPETITOR_COLOURS.length],
      points: seriesFor(account.handle),
    })),
  ];
  const all = chartSeries.flatMap((series) => series.points);

  if (!all.length) return;

  const times = all.map((point) => parseDate(point.date).getTime());
  const values = all.map((point) => point.followers);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const valueFloor = Math.min(...values);
  const valueCeiling = Math.max(...values);
  const valuePad = Math.max(50, (valueCeiling - valueFloor) * 0.08);
  const minValue = Math.max(0, valueFloor - valuePad);
  const maxValue = valueCeiling + valuePad;

  const x = (date) => padding.left + ((parseDate(date).getTime() - minTime) / Math.max(1, maxTime - minTime)) * plotWidth;
  const y = (value) => padding.top + (1 - ((value - minValue) / Math.max(1, maxValue - minValue))) * plotHeight;

  context.clearRect(0, 0, width, height);
  context.font = "11px Poppins, Arial";
  context.fillStyle = "#8e8b82";
  context.strokeStyle = "rgba(229, 187, 49, 0.13)";
  context.lineWidth = 1;

  for (let tick = 0; tick <= 4; tick += 1) {
    const tickY = padding.top + (plotHeight / 4) * tick;
    const tickValue = maxValue - ((maxValue - minValue) / 4) * tick;
    context.beginPath();
    context.moveTo(padding.left, tickY);
    context.lineTo(width - padding.right, tickY);
    context.stroke();
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(compactFormat.format(tickValue), padding.left - 9, tickY);
  }

  for (let tick = 0; tick <= 3; tick += 1) {
    const tickTime = minTime + ((maxTime - minTime) / 3) * tick;
    const tickX = padding.left + (plotWidth / 3) * tick;
    context.textAlign = tick === 0 ? "left" : tick === 3 ? "right" : "center";
    context.textBaseline = "top";
    context.fillText(shortDateFormat.format(new Date(tickTime)), tickX, height - padding.bottom + 13);
  }

  const drawSeries = (series, colour) => {
    if (!series.length) return;
    context.beginPath();
    series.forEach((point, index) => {
      const pointX = x(point.date);
      const pointY = y(point.followers);
      if (index === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    });
    context.strokeStyle = colour;
    context.lineWidth = 2.5;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();

    const latest = series.at(-1);
    context.beginPath();
    context.arc(x(latest.date), y(latest.followers), 4, 0, Math.PI * 2);
    context.fillStyle = colour;
    context.fill();
  };

  chartSeries.forEach((series) => drawSeries(series.points, series.colour));

  const legend = document.getElementById("trendLegend");
  legend.replaceChildren();
  chartSeries.forEach((series) => {
    const item = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.style.backgroundColor = series.colour;
    item.append(swatch, document.createTextNode(series.name));
    legend.appendChild(item);
  });

  const count = state.selectedHandles.size;
  setText("competitorCount", `${count} selected`);
  setText(
    "chartSummary",
    chartSeries
      .map((series) => {
        const latest = series.points.at(-1);
        return latest ? `${series.name}: ${numberFormat.format(latest.followers)} followers` : `${series.name}: no history available`;
      })
      .join(". "),
  );
}

function renderIssues() {
  if (!state.issues.length) return;
  const panel = document.getElementById("issuesPanel");
  const handles = state.issues.map((issue) => `@${issue.handle}`).join(", ");
  const issueDate = state.issues[0].date_checked ? dateFormat.format(parseDate(state.issues[0].date_checked)) : "the latest collection";
  setText("issuesText", `${state.issues.length} profile${state.issues.length === 1 ? "" : "s"} could not be fully collected on ${issueDate}: ${handles}. Verified accounts remain included in the dashboard.`);
  panel.hidden = false;
}

function addEvents() {
  ["accountSearch", "groupFilter", "sortOrder"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderRanking);
  });

  document.getElementById("competitorOptions").addEventListener("change", (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    const selected = [...document.querySelectorAll('#competitorOptions input[type="checkbox"]:checked')]
      .map((checkbox) => checkbox.value);
    state.selectedHandles = new Set(selected);
    drawTrendChart();
  });

  document.getElementById("clearCompetitors").addEventListener("click", () => {
    document.querySelectorAll('#competitorOptions input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
    state.selectedHandles.clear();
    drawTrendChart();
  });

  document.addEventListener("click", (event) => {
    const picker = document.getElementById("competitorPicker");
    if (picker.open && !picker.contains(event.target)) picker.open = false;
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(drawTrendChart).observe(document.querySelector(".chart-wrap"));
  } else {
    window.addEventListener("resize", drawTrendChart);
  }
}

async function loadDashboard() {
  try {
    const [report, profiles, historical, snapshots, issues] = await Promise.all([
      fetchCSV("data/weekly_report.csv"),
      fetchCSV("config/competitors.csv"),
      fetchCSV("data/historical.csv"),
      fetchCSV("data/instagram_snapshots.csv"),
      fetchCSV("data/profile_validation_errors.csv", true),
    ]);

    state.report = report.sort((a, b) => numeric(a.rank) - numeric(b.rank));
    state.profiles = new Map(profiles.map((profile) => [profile.handle, profile]));
    state.history = buildHistory(historical, snapshots);
    state.issues = issues;

    renderSummary();
    renderControls();
    renderRanking();
    renderGrowthLeaders();
    renderIssues();
    addEvents();
    drawTrendChart();
  } catch (error) {
    setText("statusText", "Report unavailable");
    const message = document.getElementById("errorMessage");
    message.hidden = false;
    message.textContent = "The live report could not be loaded. Please try again shortly.";
    console.error(error);
  }
}

loadDashboard();
