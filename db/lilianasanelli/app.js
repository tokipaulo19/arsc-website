import { loadCompetitorData, loadReportingPayload } from "./api.js?v=20260928-real-only";
import { CONTENT_COLUMNS, DASHBOARD_CONFIG } from "./config.js?v=20260928-real-only";
import { renderLineChart } from "./charts.js";
import {
  accountValueAt,
  addDays,
  aggregatePosts,
  buildCsv,
  buildPostRows,
  getPeriodRange,
  groupRows,
  isWithin,
  maturityEligible,
  median,
  parseDateKey,
  safeNumber,
  sumAvailable,
  sumRowsInRange,
  toDateKey,
  valueChange,
} from "./metrics.js";

const numberFormat = new Intl.NumberFormat("en-AU");
const compactFormat = new Intl.NumberFormat("en-AU", { notation: "compact", maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: DASHBOARD_CONFIG.reportingTimezone, timeZoneName: "short" });
const SUMMARY_CONTENT_COLUMNS = CONTENT_COLUMNS.filter((column) => [
  "title", "platform", "published_at", "primary_pillar", "format", "reach", "engagement_rate", "shares", "saves",
].includes(column.key));

const state = {
  payload: null,
  competitor: null,
  selectedBrandHandle: DASHBOARD_CONFIG.targetHandle,
  activeTab: "overview",
  preset: "30",
  customStart: "",
  customEnd: "",
  filters: { platform: "all", pillar: "all", format: "all", campaign: "all" },
  includeYoungPosts: false,
  search: "",
  sort: { key: "reach", direction: "desc" },
  range: null,
  rows: [],
  previousRows: [],
  totals: null,
  previousTotals: null,
};

const byId = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatValue(value, style = "number") {
  const number = safeNumber(value);
  if (number === null) return "N/A";
  if (style === "percent") return `${percentFormat.format(number)}%`;
  if (style === "currency") return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(number);
  return numberFormat.format(Math.round(number));
}

function formatSigned(value, style = "number") {
  const number = safeNumber(value);
  if (number === null) return "N/A";
  const formatted = style === "percent" ? `${percentFormat.format(Math.abs(number))}%` : numberFormat.format(Math.abs(Math.round(number)));
  return `${number > 0 ? "+" : number < 0 ? "−" : ""}${formatted}`;
}

function dateLabel(value) {
  const date = parseDateKey(value);
  return date ? dateFormat.format(date) : "N/A";
}

function titleCase(value) {
  return String(value ?? "").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function relativeFreshness(source) {
  const hours = safeNumber(source.data_freshness_hours);
  if (hours === null) return source.status === "inactive" ? "not active" : "unavailable";
  if (hours < 1) return "updated under 1h ago";
  return `updated ${Math.round(hours)}h ago`;
}

function previousDay(dateValue) {
  return toDateKey(addDays(parseDateKey(dateValue), -1));
}

function netFollowersFor(range) {
  const rows = state.payload.account_daily;
  const start = accountValueAt(rows, "followers", previousDay(range.start));
  const end = accountValueAt(rows, "followers", range.end);
  return {
    start,
    end,
    net: start === null || end === null ? null : end - start,
    rate: start && end !== null ? ((end - start) / start) * 100 : null,
  };
}

function periodLabel(range) {
  return `${dateLabel(range.start)}–${dateLabel(range.end)} · compared with ${dateLabel(range.previousStart)}–${dateLabel(range.previousEnd)}`;
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const supportedTabs = new Set(["overview", "brands", "sources"]);
  const supportedPresets = new Set(["14", "30", "mtd", "previous-month", "custom"]);
  if (supportedTabs.has(params.get("tab"))) state.activeTab = params.get("tab");
  if (supportedPresets.has(params.get("period"))) state.preset = params.get("period");
  state.customStart = params.get("start") ?? "";
  state.customEnd = params.get("end") ?? "";
  ["platform", "pillar", "format", "campaign"].forEach((key) => {
    if (params.get(key)) state.filters[key] = params.get(key);
  });
}

function persistUrlState() {
  const params = new URLSearchParams();
  if (state.activeTab !== "overview") params.set("tab", state.activeTab);
  if (state.preset !== "30") params.set("period", state.preset);
  if (state.preset === "custom") {
    params.set("start", state.customStart);
    params.set("end", state.customEnd);
  }
  Object.entries(state.filters).forEach(([key, value]) => {
    if (value !== "all") params.set(key, value);
  });
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function setActiveTab(tabName, focusPanel = false) {
  state.activeTab = tabName;
  document.querySelectorAll(".tab-button").forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${tabName}`;
  });
  if (focusPanel) byId(`panel-${tabName}`).focus();
  persistUrlState();
  if (state.payload && tabName === "overview") window.requestAnimationFrame(renderOverviewChart);
  if (state.competitor && tabName === "brands") window.requestAnimationFrame(renderCompetitorChart);
}

function addOptions(select, values, formatter = titleCase) {
  const current = select.value;
  select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = formatter(value);
    select.appendChild(option);
  });
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function populateFilters() {
  const posts = state.payload.posts;
  addOptions(byId("platformFilter"), [...new Set(posts.map((post) => post.platform))].sort());
  addOptions(byId("pillarFilter"), DASHBOARD_CONFIG.pillars, (value) => value);
  addOptions(byId("formatFilter"), [...new Set(posts.map((post) => post.format))].sort());
  addOptions(byId("campaignFilter"), [...new Set(posts.map((post) => post.campaign_slug).filter(Boolean))].sort());
  Object.entries(state.filters).forEach(([key, value]) => {
    const select = byId(`${key}Filter`);
    if ([...select.options].some((option) => option.value === value)) select.value = value;
    else state.filters[key] = "all";
  });
}

function renderSourceStatus() {
  const sources = Object.entries(state.payload.sources);
  byId("sourceStatus").innerHTML = sources.map(([key, source]) => {
    const connected = key === "competitors";
    return `<span class="source-chip" data-status="${connected ? "ok" : "inactive"}"><strong>${escapeHtml(source.label ?? titleCase(key))}</strong> ${connected ? "live public feed" : "not connected · no data shown"}</span>`;
  }).join("");
  const degraded = [];
  const warning = byId("partialWarning");
  if (!degraded.length) {
    warning.hidden = true;
    return;
  }
  warning.hidden = false;
  warning.innerHTML = `<strong>Partial-data notice.</strong> ${degraded.map(([, source]) => `${escapeHtml(source.label)} is ${escapeHtml(source.status)}`).join("; ")}. Healthy sources remain visible and affected values use the last known good aggregate or N/A.`;
}

function comparisonMarkup(current, previous, style = "number") {
  const change = valueChange(current, previous);
  if (change.absolute === null) return '<span class="trend-value trend-na">N/A</span><span>previous period unavailable</span>';
  const trend = change.absolute > 0 ? "up" : change.absolute < 0 ? "down" : "flat";
  const percent = change.percent === null ? "" : ` · ${formatSigned(change.percent, "percent")}`;
  return `<span class="trend-value trend-${trend}">${formatSigned(change.absolute, style)}${percent}</span><span>vs previous period</span>`;
}

function kpiCard(label, value, current, previous, options = {}) {
  return `<article class="kpi-card${options.featured ? " is-featured" : ""}">
    <span class="kpi-label">${escapeHtml(label)}</span>
    <strong class="kpi-value">${formatValue(value, options.style)}</strong>
    <div class="kpi-comparison">${options.comparison ?? comparisonMarkup(current, previous, options.style)}</div>
  </article>`;
}

function renderOverview() {
  if (state.payload.mode === "skeleton") {
    byId("primaryKpis").innerHTML = `<article class="empty-state verified-empty-state"><div class="empty-state-mark" aria-hidden="true">✓</div><h3>No detailed performance source is connected yet.</h3><p>Nothing has been estimated or filled with sample data. The verified public follower and post totals are available in Brand Accounts.</p><a class="button button-dark" href="?tab=brands">Open live brand accounts</a></article>`;
    byId("simpleStory").replaceChildren();
    byId("overviewInsights").hidden = true;
    byId("overviewDetails").hidden = true;
    return;
  }
  byId("overviewInsights").hidden = false;
  byId("overviewDetails").hidden = false;
  const currentFollowers = netFollowersFor(state.range);
  const previousFollowers = netFollowersFor({
    start: state.range.previousStart,
    end: state.range.previousEnd,
  });
  const primary = [
    kpiCard("Total followers", currentFollowers.end, currentFollowers.net, previousFollowers.net, {
      featured: true,
      comparison: `<span class="trend-value">${formatSigned(currentFollowers.net)}</span><span>net this period · ${formatValue(currentFollowers.rate, "percent")} growth</span>`,
    }),
    kpiCard("People reached", state.totals.reach, state.totals.reach, state.previousTotals.reach),
    kpiCard("Engagement rate", state.totals.engagement_rate, state.totals.engagement_rate, state.previousTotals.engagement_rate, { style: "percent" }),
  ];
  byId("primaryKpis").innerHTML = primary.join("");

  const insights = buildReportInsights();
  const reachChange = valueChange(state.totals.reach, state.previousTotals.reach);
  const reachDirection = (reachChange.percent ?? reachChange.absolute ?? 0) > 0 ? "up" : (reachChange.percent ?? reachChange.absolute ?? 0) < 0 ? "down" : "steady";
  const topPostText = insights.topReach
    ? `<strong>Best post:</strong> “${escapeHtml(insights.topReach.title)}” reached ${formatValue(insights.topReach.reach)} people.`
    : "<strong>Best post:</strong> Not enough mature posts to compare yet.";
  byId("simpleStory").innerHTML = `
    <article><span class="story-number">1</span><div><h3>Audience</h3><p>Reach is <strong>${reachDirection}</strong> ${reachChange.percent === null ? "from the previous period" : `by ${formatValue(Math.abs(reachChange.percent), "percent")}`}.</p></div></article>
    <article><span class="story-number">2</span><div><h3>Content</h3><p>${topPostText}</p></div></article>
    <article><span class="story-number">3</span><div><h3>Action</h3><p>${formatValue(state.totals.contacts_captured)} contacts and ${formatValue(state.totals.sessions)} website sessions are shown in this demo.</p></div></article>`;
  const action = insights.topReach
    ? `Create one follow-up based on <strong>“${escapeHtml(insights.topReach.title)}”</strong>. Keep the topic, but test a new opening or call to action.`
    : "Publish at least three comparable posts before making a content decision.";
  byId("nextAction").innerHTML = `<p class="action-copy">${action}</p><p class="context-note">Recommendation is based on example data and should not guide a live campaign yet.</p>`;

  const currentMentions = sumRowsInRange(state.payload.mentions_daily, "date", "mention_count", state.range);
  const previousMentions = sumRowsInRange(state.payload.mentions_daily, "date", "mention_count", { start: state.range.previousStart, end: state.range.previousEnd });
  const secondary = [
    ["Likes", state.totals.likes, "number"],
    ["Comments", state.totals.comments, "number"],
    ["Shares / reposts", sumAvailable([state.totals.shares, state.totals.reposts]), "number"],
    ["Saves", state.totals.saves, "number"],
    ["Views", state.totals.views, "number"],
    ["Video views", state.totals.video_views, "number"],
    ["DM interactions", state.totals.dm_interactions, "number"],
    ["ManyChat CTR", state.totals.manychat_ctr, "percent"],
    ["Mentions", currentMentions, "number"],
    ["Video completion", state.totals.completion_rate, "percent"],
  ];
  byId("secondaryMetrics").innerHTML = secondary.map(([label, value, style]) => (
    `<div class="secondary-metric"><span>${escapeHtml(label)}</span><strong>${formatValue(value, style)}</strong></div>`
  )).join("");
  const mentionChange = valueChange(currentMentions, previousMentions);
  if (mentionChange.absolute !== null) {
    byId("secondaryMetrics").lastElementChild.insertAdjacentHTML("afterend", `<div class="secondary-metric"><span>Mention change</span><strong>${formatSigned(mentionChange.percent ?? mentionChange.absolute, mentionChange.percent === null ? "number" : "percent")}</strong></div>`);
  }

  const funnel = [
    ["Reach", state.totals.reach],
    ["Engagement", state.totals.engagements],
    ["DM interaction", state.totals.dm_interactions],
    ["Link click", state.totals.link_clicks],
    ["Kajabi session", state.totals.sessions],
    ["Conversion", state.totals.conversions],
  ];
  const max = Math.max(...funnel.map(([, value]) => safeNumber(value) ?? 0), 1);
  byId("funnel").innerHTML = funnel.map(([label, value]) => {
    const numeric = safeNumber(value);
    const width = numeric === null ? 0 : Math.max(1.5, (numeric / max) * 100);
    return `<div class="funnel-row"><span>${escapeHtml(label)}</span><div class="funnel-track"><div class="funnel-fill" style="width:${width}%"></div></div><strong class="funnel-value">${formatValue(value)}</strong></div>`;
  }).join("");
  renderOverviewChart();
}

function renderOverviewChart() {
  const canvas = byId("overviewTrendChart");
  if (!canvas || canvas.closest(".tab-panel").hidden) return;
  const dated = [...state.rows].sort((a, b) => a.published_at.localeCompare(b.published_at));
  renderLineChart(canvas, [
    { name: "Reach", colour: "#d61d24", points: dated.map((row) => ({ date: row.published_at.slice(0, 10), value: safeNumber(row.reach) })) },
    { name: "Engagements", colour: "#171315", points: dated.map((row) => ({ date: row.published_at.slice(0, 10), value: safeNumber(row.engagements) })) },
  ]);
  byId("overviewTrendSummary").textContent = dated.length
    ? `${dated.length} posts in view. Total reach ${formatValue(state.totals.reach)}; total engagements ${formatValue(state.totals.engagements)}.`
    : "No posts match the current period and filters.";
}

function contentRowsForDisplay() {
  const query = state.search.trim().toLowerCase();
  const rows = state.rows.filter((row) => {
    if (!state.includeYoungPosts && !maturityEligible(row, DASHBOARD_CONFIG.insights.minimumMaturePostAgeHours)) return false;
    if (!query) return true;
    return [row.title, row.campaign_slug, row.cta_keyword, row.primary_pillar, row.platform, row.format]
      .some((value) => String(value ?? "").toLowerCase().includes(query));
  });
  const direction = state.sort.direction === "asc" ? 1 : -1;
  return rows.sort((a, b) => {
    const left = state.sort.key === "maturity" ? a.maturity.label : a[state.sort.key];
    const right = state.sort.key === "maturity" ? b.maturity.label : b[state.sort.key];
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
    return String(left).localeCompare(String(right)) * direction;
  });
}

function formatTableCell(row, column) {
  const value = row[column.key];
  if (column.key === "title") {
    const title = escapeHtml(row.title);
    const isDemoPost = state.payload?.mode === "mock" || String(row.platform_post_id ?? "").startsWith("mock-");
    const meta = escapeHtml(isDemoPost ? "Example record · not a live post" : row.post_slug);
    return row.permalink && !isDemoPost
      ? `<a class="post-link" href="${escapeHtml(row.permalink)}" target="_blank" rel="noopener noreferrer">${title}</a><span class="post-meta">${meta}</span>`
      : `<span class="post-link">${title}</span><span class="post-meta">${meta}</span>`;
  }
  if (column.key === "maturity") return `<span class="pill maturity-${row.maturity.key}">${escapeHtml(row.maturity.label)}</span>`;
  if (column.key === "secondary_pillars") return value?.length ? escapeHtml(value.join(", ")) : '<span class="unavailable">N/A</span>';
  if (column.key === "published_at") return escapeHtml(dateLabel(value));
  if (column.type === "percent") return safeNumber(value) === null ? '<span class="unavailable">N/A</span>' : escapeHtml(formatValue(value, "percent"));
  if (column.type === "number") return safeNumber(value) === null ? '<span class="unavailable">N/A</span>' : escapeHtml(formatValue(value));
  if (value === null || value === undefined || value === "") return '<span class="unavailable">N/A</span>';
  if (["primary_pillar", "format", "platform"].includes(column.key)) return `<span class="pill">${escapeHtml(titleCase(value))}</span>`;
  return escapeHtml(titleCase(value));
}

function renderContent() {
  byId("contentTableHead").innerHTML = SUMMARY_CONTENT_COLUMNS.map((column) => {
    const active = state.sort.key === column.key;
    const indicator = active ? (state.sort.direction === "asc" ? " ↑" : " ↓") : "";
    return `<th scope="col"><button class="sort-button" type="button" data-sort="${column.key}" aria-label="Sort by ${escapeHtml(column.label)}">${escapeHtml(column.label)}${indicator}</button></th>`;
  }).join("");
  const rows = contentRowsForDisplay();
  byId("contentTableBody").innerHTML = rows.length
    ? rows.map((row) => `<tr>${SUMMARY_CONTENT_COLUMNS.map((column) => `<td>${formatTableCell(row, column)}</td>`).join("")}</tr>`).join("")
    : `<tr class="empty-row"><td colspan="${SUMMARY_CONTENT_COLUMNS.length}">No posts match these filters. Try including newer posts or broadening the date range.</td></tr>`;
  const hiddenYoung = state.rows.filter((row) => !maturityEligible(row, DASHBOARD_CONFIG.insights.minimumMaturePostAgeHours)).length;
  byId("contentTableCount").textContent = `${rows.length} of ${state.rows.length} posts shown${!state.includeYoungPosts && hiddenYoung ? ` · ${hiddenYoung} post(s) under 72 hours excluded` : ""}.`;

  const mature = state.rows.filter((row) => maturityEligible(row, 72));
  const ranked = [
    ["Highest reach", [...mature].sort((a, b) => (safeNumber(b.reach) ?? -1) - (safeNumber(a.reach) ?? -1))[0]],
    ["Highest engagement rate", [...mature].sort((a, b) => (safeNumber(b.engagement_rate) ?? -1) - (safeNumber(a.engagement_rate) ?? -1))[0]],
    ["Highest share rate", [...mature].sort((a, b) => (safeNumber(b.share_rate) ?? -1) - (safeNumber(a.share_rate) ?? -1))[0]],
    ["Most referral sessions", [...mature].sort((a, b) => (safeNumber(b.sessions) ?? -1) - (safeNumber(a.sessions) ?? -1))[0]],
  ];
  byId("contentSummary").innerHTML = ranked.map(([label, row]) => `<span class="compact-stat"><strong>${escapeHtml(label)}:</strong> ${row ? escapeHtml(row.title) : "N/A"}</span>`).join("");
}

function renderPillars() {
  const pillarData = DASHBOARD_CONFIG.pillars.map((pillar) => {
    const rows = state.rows.filter((row) => row.primary_pillar === pillar);
    return { pillar, rows, totals: aggregatePosts(rows) };
  });
  byId("pillarCards").innerHTML = pillarData.map(({ pillar, totals }) => `<article class="pillar-card">
    <h3>${escapeHtml(pillar)}</h3><strong>${formatValue(totals.reach)}</strong><span>Total reach</span>
    <div class="pillar-metrics">
      <div><span>Posts</span><strong>${formatValue(totals.posts)}</strong></div>
      <div><span>Engagements</span><strong>${formatValue(totals.engagements)}</strong></div>
      <div><span>Avg engagement</span><strong>${formatValue(totals.average_engagement_rate, "percent")}</strong></div>
      <div><span>Shares</span><strong>${formatValue(sumAvailable([totals.shares, totals.reposts]))}</strong></div>
      <div><span>Saves</span><strong>${formatValue(totals.saves)}</strong></div>
      <div><span>Comments</span><strong>${formatValue(totals.comments)}</strong></div>
      <div><span>Social sessions</span><strong>${formatValue(totals.sessions)}</strong></div>
      <div><span>MC interactions</span><strong>${formatValue(totals.dm_interactions)}</strong></div>
    </div>
  </article>`).join("");

  const maxReach = Math.max(...pillarData.map(({ totals }) => safeNumber(totals.reach) ?? 0), 1);
  byId("pillarBars").innerHTML = pillarData.map(({ pillar, totals }) => {
    const reach = safeNumber(totals.reach);
    return `<div class="bar-row"><span>${escapeHtml(pillar)}</span><div class="bar-track"><div class="bar-fill" style="width:${reach === null ? 0 : (reach / maxReach) * 100}%"></div></div><strong>${formatValue(reach)}</strong></div>`;
  }).join("");

  const formatGroups = [...groupRows(state.rows, (row) => `${row.primary_pillar} / ${titleCase(row.format)}`).entries()]
    .map(([label, rows]) => ({ label, posts: rows.length, medianRate: median(rows.map((row) => row.engagement_rate)) }))
    .sort((a, b) => (safeNumber(b.medianRate) ?? -1) - (safeNumber(a.medianRate) ?? -1));
  byId("pillarFormatTable").innerHTML = [
    '<div class="mini-row"><span>Pillar / format</span><span>Posts</span><span>Median ER</span></div>',
    ...formatGroups.map((group) => `<div class="mini-row"><span>${escapeHtml(group.label)}</span><span>${formatValue(group.posts)}</span><span>${formatValue(group.medianRate, "percent")}</span></div>`),
  ].join("");
}

function rankedList(title, items) {
  return `<h4>${escapeHtml(title)}</h4>${items.length ? items.map((item, index) => `<div class="ranked-item"><i>${index + 1}</i><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("") : '<p class="context-note">No data available for this period.</p>'}`;
}

function renderConversion() {
  const manychatSource = state.payload.sources.manychat;
  const ga4Source = state.payload.sources.ga4;
  byId("manychatState").dataset.status = manychatSource.status;
  byId("manychatState").textContent = manychatSource.status;
  byId("ga4State").dataset.status = ga4Source.status;
  byId("ga4State").textContent = ga4Source.status;
  const manychatMetrics = [
    ["Automation sends", state.totals.automation_sends],
    ["DM interactions", state.totals.dm_interactions],
    ["Contacts captured", state.totals.contacts_captured],
    ["Link clicks", state.totals.link_clicks],
    ["Automation CTR", state.totals.manychat_ctr, "percent"],
  ];
  byId("manychatMetrics").innerHTML = manychatMetrics.map(([label, value, style]) => `<div class="metric-list-item"><span>${escapeHtml(label)}</span><strong>${formatValue(value, style)}</strong></div>`).join("");

  const ctaGroups = [...groupRows(state.rows.filter((row) => row.cta_keyword), (row) => row.cta_keyword).entries()]
    .map(([label, rows]) => ({ label, value: aggregatePosts(rows).contacts_captured }))
    .filter((item) => safeNumber(item.value) !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({ label: item.label, value: `${formatValue(item.value)} contacts` }));
  byId("ctaLeaderboard").innerHTML = rankedList("Top CTA keywords", ctaGroups);

  const webMetrics = [
    ["Social sessions", state.totals.sessions],
    ["Users", state.totals.users],
    ["Engaged sessions", state.totals.engaged_sessions],
    ["Landing-page views", state.totals.landing_page_views],
    ["Tracked conversions", state.totals.conversions],
  ];
  byId("webMetrics").innerHTML = webMetrics.map(([label, value]) => `<div class="metric-list-item"><span>${escapeHtml(label)}</span><strong>${formatValue(value)}</strong></div>`).join("");
  const campaignGroups = [...groupRows(state.rows.filter((row) => row.campaign_slug), (row) => row.campaign_slug).entries()]
    .map(([label, rows]) => ({ label: titleCase(label), value: aggregatePosts(rows).sessions }))
    .filter((item) => safeNumber(item.value) !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({ label: item.label, value: `${formatValue(item.value)} sessions` }));
  byId("campaignTraffic").innerHTML = rankedList("Sessions by campaign", campaignGroups);

  const selectedIds = new Set(state.rows.map((row) => row.post_id));
  const records = state.payload.web_daily.filter((row) => selectedIds.has(row.post_id) && isWithin(row.date, state.range.start, state.range.end));
  const valid = records.filter((row) => row.utm_source && row.utm_medium && row.utm_campaign && row.utm_content);
  const missingContent = records.filter((row) => !row.utm_content);
  const postCampaign = new Map(state.payload.posts.map((post) => [post.post_id, post.campaign_slug]));
  const unknownCampaigns = [...new Set(records.filter((row) => row.utm_campaign !== postCampaign.get(row.post_id)).map((row) => row.utm_campaign))];
  const validPercent = records.length ? (valid.length / records.length) * 100 : null;
  byId("utmQa").innerHTML = [
    ["Valid tagged links", formatValue(validPercent, "percent"), false],
    ["Missing utm_content", formatValue(missingContent.length), missingContent.length > 0],
    ["Unknown campaign slugs", formatValue(unknownCampaigns.length), unknownCampaigns.length > 0],
  ].map(([label, value, warning]) => `<div class="qa-card${warning ? " has-warning" : ""}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
}

function renderPaid() {
  const ads = state.payload.ads_daily.filter((row) => isWithin(row.date, state.range.start, state.range.end));
  if (!ads.length) {
    byId("paidContent").innerHTML = `<div class="empty-state"><div class="empty-state-mark" aria-hidden="true">0</div><h3>No active paid campaigns in this reporting period.</h3><p>Paid data is unavailable or campaigns are not currently active. Organic metrics remain separate. When campaigns run, this view will support spend, reach, impressions, CPM, clicks, CTR, CPC, landing-page views, conversions, cost per result and campaign/ad performance.</p></div>`;
    return;
  }
  const totals = Object.fromEntries(["spend", "reach", "impressions", "link_clicks", "landing_page_views", "conversions"].map((field) => [field, sumAvailable(ads.map((row) => row[field]))]));
  byId("paidContent").innerHTML = `<div class="kpi-grid primary-kpis">${[
    ["Spend", totals.spend, "currency"], ["Reach", totals.reach], ["Impressions", totals.impressions],
    ["Link clicks", totals.link_clicks], ["Landing-page views", totals.landing_page_views], ["Conversions", totals.conversions],
  ].map(([label, value, style]) => kpiCard(label, value, value, null, { style })).join("")}</div>`;
}

function buildReportInsights() {
  const mature = state.rows.filter((row) => maturityEligible(row, DASHBOARD_CONFIG.insights.minimumMaturePostAgeHours));
  const topReach = [...mature]
    .filter((row) => safeNumber(row.reach) !== null)
    .sort((a, b) => b.reach - a.reach)[0];
  const lowest = [...mature].filter((row) => safeNumber(row.engagement_rate) !== null).sort((a, b) => a.engagement_rate - b.engagement_rate)[0];
  const pillarGroups = DASHBOARD_CONFIG.pillars.map((pillar) => {
    const rows = state.rows.filter((row) => row.primary_pillar === pillar);
    return { pillar, rows, totals: aggregatePosts(rows) };
  });
  const eligiblePillars = pillarGroups.filter((item) => item.rows.length >= DASHBOARD_CONFIG.insights.minimumPostsForPillarComparison);
  const strongestPillar = [...eligiblePillars].sort((a, b) => (safeNumber(b.totals.reach) ?? -1) - (safeNumber(a.totals.reach) ?? -1))[0];
  const formatGroups = [...groupRows(mature, (row) => titleCase(row.format)).entries()]
    .map(([format, rows]) => ({ format, rows, medianRate: median(rows.map((row) => row.engagement_rate)) }))
    .filter((item) => item.rows.length >= 2 && item.medianRate !== null)
    .sort((a, b) => b.medianRate - a.medianRate);
  const strongestFormat = formatGroups[0];
  const ctaGroups = [...groupRows(state.rows.filter((row) => row.cta_keyword), (row) => row.cta_keyword).entries()]
    .map(([cta, rows]) => ({ cta, contacts: aggregatePosts(rows).contacts_captured }))
    .filter((item) => item.contacts !== null)
    .sort((a, b) => b.contacts - a.contacts);
  return { mature, topReach, lowest, pillarGroups, strongestPillar, strongestFormat, topCta: ctaGroups[0] };
}

function renderReport() {
  const insights = buildReportInsights();
  const reachChange = valueChange(state.totals.reach, state.previousTotals.reach);
  const sessionChange = valueChange(state.totals.sessions, state.previousTotals.sessions);
  const follower = netFollowersFor(state.range);
  const recommendations = [];
  if (insights.strongestPillar) recommendations.push(`Plan another ${insights.strongestPillar.pillar} test: its ${insights.strongestPillar.rows.length} posts generated the highest total reach (${formatValue(insights.strongestPillar.totals.reach)}) in this period.`);
  if (insights.strongestFormat) recommendations.push(`Use ${insights.strongestFormat.format} as a deliberate next-period test; its mature posts recorded a ${formatValue(insights.strongestFormat.medianRate, "percent")} median engagement rate.`);
  if (insights.topCta) recommendations.push(`Retest the ${insights.topCta.cta} CTA with a new creative because it generated the most captured contacts (${formatValue(insights.topCta.contacts)}).`);
  if (state.payload.sources.ga4.status !== "ok") recommendations.push("Restore the GA4 connector and resolve UTM exceptions before treating referral totals as complete.");
  if (!state.payload.ads_daily.length) recommendations.push("Keep paid reporting separate and activate the nov19_event contract only when a real campaign begins.");

  const sourceNotes = Object.values(state.payload.sources).map((source) => `${source.label}: ${source.status} (${relativeFreshness(source)})`);
  byId("reportContent").innerHTML = `
    <article class="report-cover">
      <p class="eyebrow">The Giving Table · Reporting period</p>
      <h3>${escapeHtml(periodLabel(state.range))}</h3>
      <p>Deterministic Phase 1 report generated from mock aggregate data. No live client analytics or personal information are present.</p>
    </article>
    <article class="report-section">
      <h3>1. Executive summary</h3>
      <p>This period recorded <strong>${formatValue(state.totals.reach)} reach</strong>, <strong>${formatValue(state.totals.engagements)} engagements</strong>, <strong>${formatSigned(follower.net)} net followers</strong>, <strong>${formatValue(state.totals.contacts_captured)} ManyChat contacts</strong> and <strong>${formatValue(state.totals.sessions)} tagged social sessions</strong>.</p>
      <div class="report-callout">Reach changed ${formatSigned(reachChange.percent ?? reachChange.absolute, reachChange.percent === null ? "number" : "percent")} and referral sessions changed ${formatSigned(sessionChange.percent ?? sessionChange.absolute, sessionChange.percent === null ? "number" : "percent")} versus the previous period.</div>
    </article>
    <div class="report-two-column">
      <article class="report-section"><h3>2. Strongest content</h3><p>${insights.topReach ? `<strong>${escapeHtml(insights.topReach.title)}</strong> led mature posts with ${formatValue(insights.topReach.reach)} reach and a ${formatValue(insights.topReach.engagement_rate, "percent")} engagement rate.` : "There are not enough mature posts to rank."}</p></article>
      <article class="report-section"><h3>3. Lowest mature post</h3><p>${insights.lowest ? `<strong>${escapeHtml(insights.lowest.title)}</strong> recorded the lowest mature-post engagement rate at ${formatValue(insights.lowest.engagement_rate, "percent")}. Treat this as a test signal, not a causal conclusion.` : "There are not enough mature posts to rank."}</p></article>
    </div>
    <article class="report-section"><h3>4. Pillar and format analysis</h3><p>${insights.strongestPillar ? `<strong>${escapeHtml(insights.strongestPillar.pillar)}</strong> generated the most reach among pillars meeting the ${DASHBOARD_CONFIG.insights.minimumPostsForPillarComparison}-post threshold.` : "No pillar meets the minimum sample threshold for a comparative callout."} ${insights.strongestFormat ? `${escapeHtml(insights.strongestFormat.format)} had the highest eligible mature-post median engagement rate (${formatValue(insights.strongestFormat.medianRate, "percent")}).` : "No format has enough mature posts for a median comparison."}</p></article>
    <div class="report-two-column">
      <article class="report-section"><h3>5. Traffic &amp; DMs</h3><p>ManyChat produced ${formatValue(state.totals.dm_interactions)} interactions, ${formatValue(state.totals.contacts_captured)} contacts and a ${formatValue(state.totals.manychat_ctr, "percent")} automation CTR. Tagged social links produced ${formatValue(state.totals.sessions)} sessions and ${formatValue(state.totals.conversions)} tracked conversions.</p></article>
      <article class="report-section"><h3>6. Paid performance</h3><p>${state.payload.ads_daily.length ? "Paid activity is available in the Paid Ads section." : "No active paid campaigns are present in this reporting period. No paid metrics have been mixed into organic performance."}</p></article>
    </div>
    <article class="report-section"><h3>7. Recommended next actions</h3><ol class="report-list">${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></article>
    <article class="report-section"><h3>8. Data quality and source notes</h3><ul class="report-list">${sourceNotes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}<li>Per-post follows remain N/A because no attributable provider value is supplied.</li><li>Video completion is calculated only where compatible starts and completions exist.</li><li>Young posts under 72 hours are excluded from mature-post rankings.</li></ul></article>
  `;
}

function renderCompetitor() {
  const { report, profiles } = state.competitor;
  const accountConfig = DASHBOARD_CONFIG.portfolioAccounts.find((account) => account.handle === state.selectedBrandHandle) ?? DASHBOARD_CONFIG.portfolioAccounts[0];
  const target = report.find((row) => row.handle === accountConfig.handle);
  const has = (value) => value !== null && value !== undefined && String(value).trim() !== "";
  const select = byId("brandAccountSelect");
  if (!select.options.length) {
    DASHBOARD_CONFIG.portfolioAccounts.forEach((account) => {
      const option = document.createElement("option");
      option.value = account.handle;
      option.textContent = account.name;
      select.appendChild(option);
    });
  }
  select.value = accountConfig.handle;
  const connectionState = byId("brandConnectionState");
  connectionState.textContent = target ? "Live public tracker" : "Not connected";
  connectionState.classList.toggle("is-connected", Boolean(target));
  const cards = [
    ["Followers", target?.current_followers, target ? "Latest public profile count" : "Account not in tracker"],
    ["Published posts", target?.current_total_posts, target ? "Latest public profile total" : "Account not in tracker"],
    ["New posts", target && has(target.posts_since_previous_snapshot) ? Number(target.posts_since_previous_snapshot) : null, target?.previous_post_snapshot_date ? `Since ${dateLabel(target.previous_post_snapshot_date)}` : "Previous snapshot unavailable"],
    ["30-day growth", target && has(target.growth_percent_30d_plus) ? Number(target.growth_percent_30d_plus) : null, target && has(target.comparison_days) ? `${target.comparison_days}-day comparison window` : "Collecting enough history", "percent"],
  ];
  byId("competitorKpis").innerHTML = cards.map(([label, value, note, style]) => `<article class="kpi-card"><span class="kpi-label">${escapeHtml(label)}</span><strong class="kpi-value">${typeof value === "string" && value.startsWith("#") ? escapeHtml(value) : formatValue(value, style)}</strong><div class="kpi-comparison"><span>${escapeHtml(note)}</span></div></article>`).join("");
  byId("competitorRows").replaceChildren();
  DASHBOARD_CONFIG.portfolioAccounts.forEach((configuredAccount) => {
    const account = report.find((row) => row.handle === configuredAccount.handle);
    const row = document.createElement("tr");
    const profile = profiles.get(configuredAccount.handle) ?? { name: configuredAccount.name };
    const values = [
      null,
      account ? "Live" : "Not connected",
      formatValue(account?.current_followers),
      formatValue(account?.current_total_posts),
      account && has(account.posts_since_previous_snapshot) ? formatValue(account.posts_since_previous_snapshot) : "N/A",
      account && has(account.growth_percent_30d_plus) ? formatValue(account.growth_percent_30d_plus, "percent") : "N/A",
    ];
    values.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 0) {
        const link = document.createElement("a");
        link.className = "post-link";
        link.href = `https://www.instagram.com/${encodeURIComponent(configuredAccount.handle)}/`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = configuredAccount.name;
        const name = document.createElement("span");
        name.className = "post-meta";
        name.textContent = `@${configuredAccount.handle}`;
        cell.append(link, name);
      } else if (index === 1) {
        cell.innerHTML = `<span class="connection-label${account ? " is-connected" : ""}">${escapeHtml(value)}</span>`;
      } else {
        cell.textContent = value;
        if (value === "N/A") cell.className = "unavailable";
      }
      row.appendChild(cell);
    });
    byId("competitorRows").appendChild(row);
  });
  const connectedCount = DASHBOARD_CONFIG.portfolioAccounts.filter((account) => report.some((row) => row.handle === account.handle)).length;
  byId("competitorCount").textContent = `${connectedCount} of ${DASHBOARD_CONFIG.portfolioAccounts.length} brands connected`;
  if (!target) {
    byId("competitorGrowth").innerHTML = `<p><strong>${escapeHtml(accountConfig.name)} is not connected yet.</strong></p><p>Add @${escapeHtml(accountConfig.handle)} to the automated Instagram collection workflow, then run a fresh snapshot.</p>`;
  } else if (has(target.growth_percent_30d_plus)) {
    byId("competitorGrowth").innerHTML = `<strong>${formatValue(target.growth_percent_30d_plus, "percent")}</strong><span>${escapeHtml(accountConfig.name)} follower growth across the available ${escapeHtml(target.comparison_days)}-day window.</span>`;
  } else {
    byId("competitorGrowth").innerHTML = "<p>The live tracker is connected. A 30-day growth figure will appear after enough exact history has been collected.</p>";
  }
  if (state.competitor.issues.length) {
    byId("competitorIssues").hidden = false;
    byId("competitorIssues").textContent = `${state.competitor.issues.map((issue) => `@${issue.handle}`).join(", ")} could not be fully collected in the latest run. Verified account data remains available.`;
  }
  byId("competitorStatus").hidden = true;
  byId("competitorDashboard").hidden = false;
  renderCompetitorChart();
}

function renderCompetitorChart() {
  const canvas = byId("competitorTrendChart");
  if (!state.competitor || !canvas || canvas.closest(".tab-panel").hidden) return;
  const seriesFor = (handle) => state.competitor.history.filter((point) => point.handle === handle).map((point) => ({ date: point.date, value: point.followers }));
  const account = DASHBOARD_CONFIG.portfolioAccounts.find((item) => item.handle === state.selectedBrandHandle) ?? DASHBOARD_CONFIG.portfolioAccounts[0];
  const series = [
    { name: account.name, colour: "#d61d24", points: seriesFor(account.handle) },
  ];
  byId("brandChartTitle").textContent = `${account.name} follower history`;
  renderLineChart(canvas, series, { startAtZero: false });
  byId("competitorChartSummary").textContent = series.map((item) => {
    const latest = item.points.at(-1);
    return latest ? `${item.name}: ${formatValue(latest.value)} followers` : `${item.name}: no history available`;
  }).join(". ");
}

function updateDashboard() {
  try {
    state.range = getPeriodRange(state.preset, state.payload.reference_date ?? state.payload.generated_at, state.customStart, state.customEnd);
  } catch (error) {
    byId("globalError").hidden = false;
    byId("globalError").textContent = error.message;
    return;
  }
  byId("globalError").hidden = true;
  state.rows = buildPostRows(state.payload, state.range, state.filters);
  state.previousRows = buildPostRows(state.payload, { start: state.range.previousStart, end: state.range.previousEnd }, state.filters);
  state.totals = aggregatePosts(state.rows);
  state.previousTotals = aggregatePosts(state.previousRows);
  byId("periodSummary").textContent = periodLabel(state.range);
  byId("filterSummary").textContent = periodLabel(state.range).split(" · ")[0];
  byId("customStart").value = state.customStart || state.range.start;
  byId("customEnd").value = state.customEnd || state.range.end;
  if (state.payload.mode === "skeleton") {
    byId("periodSummary").textContent = "Public Instagram brand totals are live. Detailed reporting is not connected.";
    renderOverview();
    persistUrlState();
    return;
  }
  renderOverview();
  renderContent();
  renderPillars();
  renderConversion();
  renderPaid();
  renderReport();
  persistUrlState();
}

function exportContentCsv() {
  const columns = CONTENT_COLUMNS.filter((column) => column.key !== "maturity");
  const blob = new Blob([buildCsv(contentRowsForDisplay(), columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `the-giving-table-posts-${state.range.start}-to-${state.range.end}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resetFilters() {
  state.preset = "30";
  state.filters = { platform: "all", pillar: "all", format: "all", campaign: "all" };
  state.includeYoungPosts = false;
  state.search = "";
  byId("periodPreset").value = "30";
  ["platform", "pillar", "format", "campaign"].forEach((key) => { byId(`${key}Filter`).value = "all"; });
  if (byId("includeYoungPosts")) byId("includeYoungPosts").checked = false;
  if (byId("postSearch")) byId("postSearch").value = "";
  byId("customRange").hidden = true;
  updateDashboard();
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab, true));
  });
  document.querySelectorAll("[data-open-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.openTab, true));
  });
  byId("periodPreset").addEventListener("change", (event) => {
    state.preset = event.target.value;
    byId("customRange").hidden = state.preset !== "custom";
    if (state.preset !== "custom") updateDashboard();
  });
  ["platform", "pillar", "format", "campaign"].forEach((key) => {
    byId(`${key}Filter`).addEventListener("change", (event) => {
      state.filters[key] = event.target.value;
      updateDashboard();
    });
  });
  byId("applyCustomRange").addEventListener("click", () => {
    state.customStart = byId("customStart").value;
    state.customEnd = byId("customEnd").value;
    updateDashboard();
  });
  byId("resetFilters").addEventListener("click", resetFilters);
  byId("includeYoungPosts")?.addEventListener("change", (event) => {
    state.includeYoungPosts = event.target.checked;
    renderContent();
  });
  byId("postSearch")?.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderContent();
  });
  byId("contentTableHead")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sort]");
    if (!button) return;
    const key = button.dataset.sort;
    state.sort = state.sort.key === key
      ? { key, direction: state.sort.direction === "asc" ? "desc" : "asc" }
      : { key, direction: ["title", "platform", "published_at", "maturity", "primary_pillar", "format", "campaign_slug", "cta_keyword"].includes(key) ? "asc" : "desc" };
    renderContent();
  });
  byId("exportContentCsv")?.addEventListener("click", exportContentCsv);
  byId("reportExportCsv")?.addEventListener("click", exportContentCsv);
  byId("printReport")?.addEventListener("click", () => window.print());
  byId("brandAccountSelect").addEventListener("change", (event) => {
    state.selectedBrandHandle = event.target.value;
    renderCompetitor();
  });
  const dialog = byId("definitionsDialog");
  byId("definitionsButton").addEventListener("click", () => dialog.showModal());
  byId("closeDefinitions").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  byId("tab-overview").closest('[role="tablist"]').addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...document.querySelectorAll(".tab-button")];
    const current = tabs.indexOf(document.activeElement);
    let next = current;
    if (["ArrowDown", "ArrowRight"].includes(event.key)) next = (current + 1) % tabs.length;
    if (["ArrowUp", "ArrowLeft"].includes(event.key)) next = (current - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    tabs[next].focus();
    setActiveTab(tabs[next].dataset.tab);
  });
  let resizeFrame;
  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      if (state.activeTab === "overview") renderOverviewChart();
      if (state.activeTab === "brands") renderCompetitorChart();
    });
  });
}

async function loadCompetitors() {
  try {
    state.competitor = await loadCompetitorData();
    renderCompetitor();
  } catch (error) {
    byId("competitorStatus").classList.add("notice-error");
    byId("competitorStatus").textContent = "The public brand account tracker could not be loaded. Other reporting sections remain available.";
    console.error("Brand tracker data failed:", error);
  }
}

async function initialise() {
  readUrlState();
  bindEvents();
  setActiveTab(state.activeTab);
  byId("periodPreset").value = state.preset;
  byId("customRange").hidden = state.preset !== "custom";
  try {
    state.payload = await loadReportingPayload();
    populateFilters();
    renderSourceStatus();
    byId("lastUpdated").textContent = state.payload.mode === "skeleton"
      ? "Verified sources only"
      : `Updated ${dateTimeFormat.format(new Date(state.payload.generated_at))}`;
    byId("loadingState").hidden = true;
    updateDashboard();
  } catch (error) {
    byId("loadingState").hidden = true;
    byId("globalError").hidden = false;
    byId("globalError").textContent = "The reporting payload could not be loaded. No values have been substituted. Check the console for the explicit error.";
    console.error("Reporting payload failed:", error);
  }
  loadCompetitors();
}

initialise();
