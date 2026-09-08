const DATA_ROOT = "https://raw.githubusercontent.com/tokipaulo19/nbaaustralia-operations/main";
const TARGET_HANDLE = "personalisedposing";
const TARGET_NAME = "Personalised Posing";
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
const COMPETITOR_COLOURS = ["#f4effa", "#ff30c6", "#62e4b3", "#ff9a71", "#58c7ef", "#e1c65a", "#a9a0ff", "#ff7f9e"];

const state = {
  report: [],
  profiles: new Map(),
  history: [],
  snapshots: [],
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

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
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

function latestSnapshot(handle) {
  return state.snapshots
    .filter((row) => row.handle === handle)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function followerDisplay(account) {
  const prefix = latestSnapshot(account.handle)?.follower_precision === "approximate" ? "~" : "";
  return `${prefix}${numberFormat.format(numeric(account.current_followers))}`;
}

function signedInteger(value) {
  if (!hasValue(value)) return "—";
  const number = numeric(value);
  return `${number > 0 ? "+" : ""}${numberFormat.format(number)}`;
}

function formatGrowth(value) {
  return hasValue(value) ? `${percentFormat.format(numeric(value))}%` : "—";
}

function valueClass(value) {
  if (!hasValue(value)) return "unavailable";
  return numeric(value) >= 0 ? "positive" : "negative";
}

function parseDate(value) {
  return new Date(`${value}T00:00:00`);
}

function renderSummary() {
  const target = state.report.find((account) => account.handle === TARGET_HANDLE);
  if (!target) throw new Error(`${TARGET_NAME} is missing from the latest report`);

  const reportDate = parseDate(target.date);
  const comparisonReady = hasValue(target.comparison_date) && hasValue(target.comparison_days);
  const ahead = state.report.filter((account) => (
    (account.ahead_of_target || account.ahead_of_nba || "").toLowerCase() === "yes"
  )).length;
  const approximate = latestSnapshot(TARGET_HANDLE)?.follower_precision === "approximate";

  setText("statusText", approximate ? "Starting snapshot loaded" : "Latest report loaded");
  setText(
    "reportPeriod",
    comparisonReady
      ? `Updated ${dateFormat.format(reportDate)} · comparison starts ${dateFormat.format(parseDate(target.comparison_date))}`
      : `Updated ${dateFormat.format(reportDate)} · baseline snapshot`,
  );
  setText("targetFollowers", followerDisplay(target));
  setText(
    "targetFollowerChange",
    hasValue(target.follower_change_30d_plus)
      ? `${signedInteger(target.follower_change_30d_plus)} followers`
      : approximate ? "Rounded starting value from supplied benchmark" : "Growth builds after 30 days",
  );
  setText("targetRank", `#${target.rank}`);
  setText("trackedAccounts", `Across ${state.report.length} tracked accounts`);
  setText("targetGrowth", formatGrowth(target.growth_percent_30d_plus));
  setText("comparisonWindow", comparisonReady ? `${target.comparison_days}-day comparison window` : "Baseline captured; comparison pending");
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
    .filter((account) => account.handle !== TARGET_HANDLE)
    .sort((a, b) => accountName(a.handle).localeCompare(accountName(b.handle)));
  const initialAccount = state.report.find((account) => account.handle !== TARGET_HANDLE);
  if (initialAccount) state.selectedHandles.add(initialAccount.handle);

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
    if (account.handle === TARGET_HANDLE) row.className = "is-target";
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
    row.appendChild(makeCell(followerDisplay(account)));
    row.appendChild(makeCell(signedInteger(account.follower_change_30d_plus), valueClass(account.follower_change_30d_plus)));
    row.appendChild(makeCell(formatGrowth(account.growth_percent_30d_plus), valueClass(account.growth_percent_30d_plus)));
    row.appendChild(makeCell(hasValue(account.posts_since_previous_snapshot) ? numberFormat.format(numeric(account.posts_since_previous_snapshot)) : "—", hasValue(account.posts_since_previous_snapshot) ? "" : "unavailable"));
    tbody.appendChild(row);
  });

  setText("tableCount", `${rows.length} of ${state.report.length} accounts shown`);
}

function renderGrowthLeaders() {
  const list = document.getElementById("growthLeaders");
  list.replaceChildren();
  const available = state.report
    .filter((account) => hasValue(account.growth_percent_30d_plus))
    .sort((a, b) => numeric(b.growth_percent_30d_plus) - numeric(a.growth_percent_30d_plus))
    .slice(0, 5);

  if (!available.length) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = "Growth rankings will appear once the tracker has at least 30 days of history. Weekly follower snapshots are now being collected automatically.";
    list.appendChild(item);
    return;
  }

  available.forEach((account, index) => {
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
    { handle: TARGET_HANDLE, name: TARGET_NAME, colour: "#cd82ff", points: seriesFor(TARGET_HANDLE) },
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
  const singleDate = minTime === maxTime;
  const x = (date) => singleDate
    ? padding.left + plotWidth / 2
    : padding.left + ((parseDate(date).getTime() - minTime) / (maxTime - minTime)) * plotWidth;
  const y = (value) => padding.top + (1 - ((value - minValue) / Math.max(1, maxValue - minValue))) * plotHeight;

  context.clearRect(0, 0, width, height);
  context.font = "11px DM Sans, Arial";
  context.fillStyle = "rgba(244,239,250,.55)";
  context.strokeStyle = "rgba(255,255,255,.08)";
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

  if (singleDate) {
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(shortDateFormat.format(new Date(minTime)), padding.left + plotWidth / 2, height - padding.bottom + 13);
  } else {
    for (let tick = 0; tick <= 3; tick += 1) {
      const tickTime = minTime + ((maxTime - minTime) / 3) * tick;
      const tickX = padding.left + (plotWidth / 3) * tick;
      context.textAlign = tick === 0 ? "left" : tick === 3 ? "right" : "center";
      context.textBaseline = "top";
      context.fillText(shortDateFormat.format(new Date(tickTime)), tickX, height - padding.bottom + 13);
    }
  }

  chartSeries.forEach((series) => {
    if (!series.points.length) return;
    if (series.points.length > 1) {
      context.beginPath();
      series.points.forEach((point, index) => {
        if (index === 0) context.moveTo(x(point.date), y(point.followers));
        else context.lineTo(x(point.date), y(point.followers));
      });
      context.strokeStyle = series.colour;
      context.lineWidth = 2.5;
      context.lineJoin = "round";
      context.lineCap = "round";
      context.stroke();
    }
    const latest = series.points.at(-1);
    context.beginPath();
    context.arc(x(latest.date), y(latest.followers), 4, 0, Math.PI * 2);
    context.fillStyle = series.colour;
    context.fill();
  });

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
    chartSeries.map((series) => {
      const latest = series.points.at(-1);
      return latest ? `${series.name}: ${numberFormat.format(latest.followers)} followers` : `${series.name}: no history available`;
    }).join(". "),
  );
  document.getElementById("historyNote").hidden = new Set(state.history.map((point) => point.date)).size > 1;
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
      fetchCSV("data/personalisedposing/weekly_report.csv"),
      fetchCSV("config/personalisedposing_competitors.csv"),
      fetchCSV("data/personalisedposing/historical.csv"),
      fetchCSV("data/personalisedposing/instagram_snapshots.csv"),
      fetchCSV("data/personalisedposing/profile_validation_errors.csv", true),
    ]);
    state.report = report.sort((a, b) => numeric(a.rank) - numeric(b.rank));
    state.profiles = new Map(profiles.map((profile) => [profile.handle, profile]));
    state.history = buildHistory(historical, snapshots);
    state.snapshots = snapshots;
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
