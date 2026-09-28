import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
    } else {
      value += character;
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

function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFromMeta(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("reel")) return "reel";
  if (normalized.includes("carousel")) return "carousel";
  if (normalized.includes("image")) return "image";
  if (normalized.includes("video")) return "video";
  return normalized.replace(/^ig\s+/, "") || null;
}

function sourceTimestamp(value) {
  const match = String(value ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, month, day, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

function sourcePeriod(fileName, rows) {
  const month = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  const match = fileName.match(/([A-Z][a-z]{2})-(\d{2})-(\d{4})_([A-Z][a-z]{2})-(\d{2})-(\d{4})/);
  if (match) {
    return {
      start: `${match[3]}-${month[match[1]]}-${match[2]}`,
      end: `${match[6]}-${month[match[4]]}-${match[5]}`,
    };
  }
  const dates = rows.map((row) => sourceTimestamp(row["Publish time"])?.slice(0, 10)).filter(Boolean).sort();
  return { start: dates[0] ?? null, end: dates.at(-1) ?? null };
}

function postTitle(description, postId) {
  const firstLine = String(description ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (!firstLine) return `Instagram post ${postId}`;
  return firstLine.length > 150 ? `${firstLine.slice(0, 147).trim()}…` : firstLine;
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? path.resolve("db/lilianasanelli/data/reporting_status.json");

if (!inputPath) {
  throw new Error("Usage: node normalize-meta-export.mjs <meta-export.csv> [output.json]");
}

const records = parseCsv(await readFile(inputPath, "utf8"));
if (!records.length) throw new Error("The Meta export contains no records.");

const requiredHeaders = ["Post ID", "Publish time", "Permalink", "Post type", "Views", "Reach", "Likes", "Shares", "Follows", "Comments", "Saves"];
for (const header of requiredHeaders) {
  if (!(header in records[0])) throw new Error(`The Meta export is missing required column: ${header}`);
}

const collectedAt = new Date().toISOString();
const period = sourcePeriod(path.basename(inputPath), records);
const posts = [];
const postDaily = [];

for (const record of records) {
  const postId = String(record["Post ID"] ?? "").trim();
  const publishedAt = sourceTimestamp(record["Publish time"]);
  if (!postId || !publishedAt) continue;

  posts.push({
    post_id: postId,
    platform_post_id: postId,
    post_slug: postId,
    post_title: postTitle(record.Description, postId),
    platform: "instagram",
    account_username: record["Account username"] || null,
    account_name: record["Account name"] || null,
    published_at: publishedAt,
    permalink: record.Permalink || null,
    primary_pillar: null,
    secondary_pillars: [],
    format: formatFromMeta(record["Post type"]),
    campaign_slug: null,
    cta_keyword: null,
  });

  postDaily.push({
    post_id: postId,
    snapshot_date: period.end,
    metric_scope: record.Date || "Lifetime",
    views: numberOrNull(record.Views),
    reach: numberOrNull(record.Reach),
    likes: numberOrNull(record.Likes),
    shares: numberOrNull(record.Shares),
    follows_attributed: numberOrNull(record.Follows),
    comments: numberOrNull(record.Comments),
    saves: numberOrNull(record.Saves),
    reposts: null,
    impressions: null,
    video_views: null,
    video_starts: null,
    video_completions: null,
  });
}

if (!posts.length) throw new Error("No valid post rows were found in the Meta export.");

const payload = {
  schema_version: "1.0.0",
  generated_at: collectedAt,
  reference_date: period.end,
  timezone: "Australia/Melbourne",
  mode: "verified",
  sources: {
    meta: {
      label: "Meta / Instagram Insights",
      status: "ok",
      refresh: "manual_export",
      collected_at: collectedAt,
      source_period_start: period.start,
      source_period_end: period.end,
      data_freshness_hours: 0,
      error_message: null,
    },
    manychat: {
      label: "ManyChat",
      status: "not_connected",
      collected_at: null,
      source_period_start: null,
      source_period_end: null,
      data_freshness_hours: null,
      error_message: null,
    },
    kajabi: {
      label: "Kajabi UTM referral tracking",
      status: "not_connected",
      collected_at: null,
      source_period_start: null,
      source_period_end: null,
      data_freshness_hours: null,
      error_message: null,
    },
    ga4: {
      label: "Google Analytics (optional)",
      status: "not_connected",
      collected_at: null,
      source_period_start: null,
      source_period_end: null,
      data_freshness_hours: null,
      error_message: null,
    },
    meta_ads: {
      label: "Meta Ads",
      status: "not_connected",
      collected_at: null,
      source_period_start: null,
      source_period_end: null,
      data_freshness_hours: null,
      error_message: null,
    },
    competitors: {
      label: "Instagram brand tracker",
      status: "ok",
      refresh: "weekly_automated",
      collected_at: collectedAt,
      source_period_start: null,
      source_period_end: period.end,
      data_freshness_hours: 0,
      error_message: null,
    },
  },
  period_presets: {
    default: "30",
    supported: ["14", "30", "mtd", "previous-month", "custom"],
  },
  account_daily: [],
  posts: posts.sort((left, right) => right.published_at.localeCompare(left.published_at)),
  post_daily: postDaily,
  manychat_daily: [],
  web_daily: [],
  ads_daily: [],
  mentions_daily: [],
  insights: [
    "Meta values are lifetime post metrics captured in the named export period.",
    "Impressions and video completion are unavailable in this export and remain N/A.",
  ],
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Normalized ${posts.length} real Meta posts into ${outputPath}`);
