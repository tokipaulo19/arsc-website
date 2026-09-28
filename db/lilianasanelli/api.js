import { DASHBOARD_CONFIG } from "./config.js?v=20260928-meta";

export function parseCSV(text) {
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

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), DASHBOARD_CONFIG.fetchTimeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
    return response;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function retry(operation, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

export async function loadReportingPayload() {
  const response = await retry(() => fetchWithTimeout(DASHBOARD_CONFIG.reportingEndpoint));
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.posts) || !payload.sources) {
    throw new Error("Reporting payload does not match the expected dashboard contract.");
  }
  return payload;
}

export async function loadKajabiStatus() {
  const response = await retry(() => fetchWithTimeout(DASHBOARD_CONFIG.kajabiStatusEndpoint));
  const status = await response.json();
  if (!status || status.source !== "kajabi" || !["not_connected", "ready", "live"].includes(status.status)) {
    throw new Error("Kajabi status does not match the expected contract.");
  }
  return status;
}

async function fetchCompetitorCSV(path, optional = false) {
  const cacheVersion = Date.now();
  const url = `${DASHBOARD_CONFIG.competitorDataRoot}/${path}?v=${cacheVersion}`;
  try {
    const response = await retry(() => fetchWithTimeout(url));
    return parseCSV(await response.text());
  } catch (error) {
    if (optional) return [];
    throw error;
  }
}

export async function loadCompetitorData() {
  const [report, profiles, historical, snapshots, issues] = await Promise.all([
    fetchCompetitorCSV("data/thegivingtable/weekly_report.csv"),
    fetchCompetitorCSV("config/thegivingtable_competitors.csv"),
    fetchCompetitorCSV("data/thegivingtable/historical.csv", true),
    fetchCompetitorCSV("data/thegivingtable/instagram_snapshots.csv"),
    fetchCompetitorCSV("data/thegivingtable/profile_validation_errors.csv", true),
  ]);
  const points = new Map();
  [...historical, ...snapshots].forEach((row) => {
    const followers = Number(row.followers);
    if (!row.date || !row.handle || !Number.isFinite(followers)) return;
    points.set(`${row.date}|${row.handle}`, { date: row.date, handle: row.handle, followers });
  });
  return {
    report: report.sort((a, b) => Number(a.rank) - Number(b.rank)),
    profiles: new Map(profiles.map((profile) => [profile.handle, profile])),
    history: [...points.values()].sort((a, b) => a.date.localeCompare(b.date)),
    issues,
  };
}
