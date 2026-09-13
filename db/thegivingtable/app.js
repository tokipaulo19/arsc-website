const DATA_ROOT = "https://raw.githubusercontent.com/tokipaulo19/arsc-instagram-benchmarking/main";
const TARGET_HANDLE = "givingtablebylilianasanelli";
const COMPETITOR_HANDLE = "perfecteventsoz";
const CACHE_VERSION = Math.floor(Date.now() / 300000);

const numberFormat = new Intl.NumberFormat("en-AU");
const compactFormat = new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
const percentFormat = new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });

const state = { report: [], profiles: new Map(), history: [], issues: [] };

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
  return state.profiles.get(handle) || { name: handle };
}

function signedInteger(value) {
  if (!hasValue(value)) return "—";
  const number = numeric(value);
  return `${number > 0 ? "+" : ""}${numberFormat.format(number)}`;
}

function growthDisplay(value) {
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
  if (!target) throw new Error("The Giving Table is missing from the latest report");
  const comparisonReady = hasValue(target.comparison_date) && hasValue(target.comparison_days);

  setText("statusText", "Latest report loaded");
  setText(
    "reportPeriod",
    comparisonReady
      ? `Updated ${dateFormat.format(parseDate(target.date))} · comparison starts ${dateFormat.format(parseDate(target.comparison_date))}`
      : `Updated ${dateFormat.format(parseDate(target.date))} · exact baseline snapshot`,
  );
  setText("targetFollowers", numberFormat.format(numeric(target.current_followers)));
  setText(
    "targetFollowerChange",
    hasValue(target.follower_change_30d_plus)
      ? `${signedInteger(target.follower_change_30d_plus)} followers`
      : "Growth builds after 30 days",
  );
  setText("targetRank", `#${target.rank}`);
  setText("trackedAccounts", `Across ${state.report.length} tracked accounts`);
  setText("targetPosts", numberFormat.format(numeric(target.current_total_posts)));
  setText(
    "postActivity",
    hasValue(target.posts_since_previous_snapshot)
      ? `${signedInteger(target.posts_since_previous_snapshot)} since last snapshot`
      : "Latest exact public profile total",
  );
  setText("targetGrowth", growthDisplay(target.growth_percent_30d_plus));
  setText("comparisonWindow", comparisonReady ? `${target.comparison_days}-day comparison window` : "Baseline captured; comparison pending");
}

function makeCell(text, className = "") {
  const cell = document.createElement("td");
  cell.textContent = text;
  if (className) cell.className = className;
  return cell;
}

function renderRanking() {
  const tbody = document.getElementById("rankingRows");
  tbody.replaceChildren();

  state.report.forEach((account) => {
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
    name.textContent = profileFor(account.handle).name;
    accountCell.append(accountLink, name);
    row.appendChild(accountCell);

    row.appendChild(makeCell(numberFormat.format(numeric(account.current_followers))));
    row.appendChild(makeCell(numberFormat.format(numeric(account.current_total_posts))));
    row.appendChild(makeCell(signedInteger(account.follower_change_30d_plus), valueClass(account.follower_change_30d_plus)));
    row.appendChild(makeCell(growthDisplay(account.growth_percent_30d_plus), valueClass(account.growth_percent_30d_plus)));
    row.appendChild(makeCell(hasValue(account.posts_since_previous_snapshot) ? numberFormat.format(numeric(account.posts_since_previous_snapshot)) : "—", hasValue(account.posts_since_previous_snapshot) ? "" : "unavailable"));
    tbody.appendChild(row);
  });

  setText("tableCount", `${state.report.length} accounts tracked`);
}

function renderGrowth() {
  const target = state.report.find((account) => account.handle === TARGET_HANDLE);
  const competitor = state.report.find((account) => account.handle === COMPETITOR_HANDLE);
  const box = document.getElementById("growthSnapshot");
  box.replaceChildren();

  if (!hasValue(target?.growth_percent_30d_plus) || !hasValue(competitor?.growth_percent_30d_plus)) {
    const message = document.createElement("p");
    message.textContent = "Growth comparisons will appear once the tracker has at least 30 days of exact history. Weekly snapshots are now recorded automatically.";
    box.appendChild(message);
    return;
  }

  const leader = numeric(target.growth_percent_30d_plus) >= numeric(competitor.growth_percent_30d_plus) ? target : competitor;
  const content = document.createElement("div");
  content.className = "growth-stat";
  const value = document.createElement("strong");
  value.textContent = growthDisplay(leader.growth_percent_30d_plus);
  const label = document.createElement("span");
  label.textContent = `${profileFor(leader.handle).name} leads the current comparison`;
  content.append(value, label);
  box.appendChild(content);
}

function buildHistory(historical, snapshots) {
  const points = new Map();
  [...historical, ...snapshots].forEach((row) => {
    const followers = Number(row.followers);
    if (!row.date || !row.handle || !Number.isFinite(followers)) return;
    points.set(`${row.date}|${row.handle}`, { date: row.date, handle: row.handle, followers });
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

  const comparisonOn = document.getElementById("competitorToggle").checked;
  const chartSeries = [
    { name: "The Giving Table", colour: "#f80213", points: seriesFor(TARGET_HANDLE) },
    ...(comparisonOn ? [{ name: "Perfect Events", colour: "#313131", points: seriesFor(COMPETITOR_HANDLE) }] : []),
  ];
  const all = chartSeries.flatMap((series) => series.points);
  context.clearRect(0, 0, rect.width, rect.height);
  if (!all.length) return;

  const padding = { top: 16, right: 16, bottom: 36, left: rect.width < 520 ? 48 : 64 };
  const plotWidth = rect.width - padding.left - padding.right;
  const plotHeight = rect.height - padding.top - padding.bottom;
  const times = all.map((point) => parseDate(point.date).getTime());
  const values = all.map((point) => point.followers);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minObserved = Math.min(...values);
  const maxObserved = Math.max(...values);
  const valuePad = Math.max(25, (maxObserved - minObserved) * 0.1);
  const minValue = Math.max(0, minObserved - valuePad);
  const maxValue = maxObserved + valuePad;
  const singleDate = minTime === maxTime;
  const x = (date) => singleDate ? padding.left + plotWidth / 2 : padding.left + ((parseDate(date).getTime() - minTime) / (maxTime - minTime)) * plotWidth;
  const y = (value) => padding.top + (1 - ((value - minValue) / Math.max(1, maxValue - minValue))) * plotHeight;

  context.font = "11px Raleway, Arial";
  context.fillStyle = "#777277";
  context.strokeStyle = "#eadfe4";
  context.lineWidth = 1;
  for (let tick = 0; tick <= 4; tick += 1) {
    const tickY = padding.top + (plotHeight / 4) * tick;
    const tickValue = maxValue - ((maxValue - minValue) / 4) * tick;
    context.beginPath();
    context.moveTo(padding.left, tickY);
    context.lineTo(rect.width - padding.right, tickY);
    context.stroke();
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(compactFormat.format(tickValue), padding.left - 9, tickY);
  }

  if (singleDate) {
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillText(shortDateFormat.format(new Date(minTime)), padding.left + plotWidth / 2, rect.height - padding.bottom + 13);
  } else {
    for (let tick = 0; tick <= 3; tick += 1) {
      const tickTime = minTime + ((maxTime - minTime) / 3) * tick;
      const tickX = padding.left + (plotWidth / 3) * tick;
      context.textAlign = tick === 0 ? "left" : tick === 3 ? "right" : "center";
      context.textBaseline = "top";
      context.fillText(shortDateFormat.format(new Date(tickTime)), tickX, rect.height - padding.bottom + 13);
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

  setText("chartSummary", chartSeries.map((series) => {
    const latest = series.points.at(-1);
    return latest ? `${series.name}: ${numberFormat.format(latest.followers)} followers` : `${series.name}: no history available`;
  }).join(". "));
  document.getElementById("historyNote").hidden = new Set(state.history.map((point) => point.date)).size > 1;
}

function renderIssues() {
  if (!state.issues.length) return;
  const panel = document.getElementById("issuesPanel");
  const handles = state.issues.map((issue) => `@${issue.handle}`).join(", ");
  setText("issuesText", `${handles} could not be fully collected in the latest run. Verified account data remains available.`);
  panel.hidden = false;
}

async function loadDashboard() {
  try {
    const [report, profiles, historical, snapshots, issues] = await Promise.all([
      fetchCSV("data/thegivingtable/weekly_report.csv"),
      fetchCSV("config/thegivingtable_competitors.csv"),
      fetchCSV("data/thegivingtable/historical.csv", true),
      fetchCSV("data/thegivingtable/instagram_snapshots.csv"),
      fetchCSV("data/thegivingtable/profile_validation_errors.csv", true),
    ]);
    state.report = report.sort((a, b) => numeric(a.rank) - numeric(b.rank));
    state.profiles = new Map(profiles.map((profile) => [profile.handle, profile]));
    state.history = buildHistory(historical, snapshots);
    state.issues = issues;
    renderSummary();
    renderRanking();
    renderGrowth();
    renderIssues();
    drawTrendChart();
    document.getElementById("competitorToggle").addEventListener("change", drawTrendChart);
    if ("ResizeObserver" in window) new ResizeObserver(drawTrendChart).observe(document.querySelector(".chart-wrap"));
    else window.addEventListener("resize", drawTrendChart);
  } catch (error) {
    setText("statusText", "Report unavailable");
    const message = document.getElementById("errorMessage");
    message.hidden = false;
    message.textContent = "The live report could not be loaded. Please try again shortly.";
    console.error(error);
  }
}

loadDashboard();
