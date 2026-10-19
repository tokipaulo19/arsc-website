import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  aggregatePosts,
  aggregateWebActivity,
  buildCsv,
  buildPostRows,
  enrichRates,
  getPeriodRange,
  postMaturity,
  ratioPercent,
  sumAvailable,
  valueChange,
  selectAccountWebRows,
  reportingDate,
} from "../metrics.js";

const fixture = {
  schema_version: "1.0.0",
  timezone: "Australia/Melbourne",
  mode: "test",
  reference_date: "2026-09-28",
  sources: {
    meta: { status: "ok" },
    manychat: { status: "not_connected" },
    ga4: { status: "not_connected" },
    meta_ads: { status: "not_connected" },
  },
  account_daily: [],
  posts: [
    { post_id: "test-previous", published_at: "2026-08-10T00:00:00Z", platform: "instagram", primary_pillar: "Giving", secondary_pillars: [], format: "reel", campaign_slug: "test" },
    { post_id: "test-current", published_at: "2026-09-10T00:00:00Z", platform: "instagram", primary_pillar: "Connection", secondary_pillars: [], format: "carousel", campaign_slug: "test" },
  ],
  post_daily: [
    { post_id: "test-previous", snapshot_date: "2026-08-29", reach: 100, likes: 10, follows_attributed: null },
    { post_id: "test-current", snapshot_date: "2026-09-28", reach: 200, likes: 25, follows_attributed: null },
  ],
  manychat_daily: [],
  web_daily: [],
  ads_daily: [],
  mentions_daily: [],
  insights: [],
};

test("published reporting payload contains only verified Meta rows", async () => {
  const payload = JSON.parse(await readFile(new URL("../data/reporting_status.json", import.meta.url), "utf8"));
  assert.equal(payload.mode, "verified");
  assert.equal(payload.sources.meta.status, "ok");
  assert.equal(payload.sources.meta.refresh, "manual_export");
  assert.equal(payload.posts.length, 18);
  assert.equal(payload.post_daily.length, 18);
  assert.ok(payload.posts.every((post) => /^\d+$/.test(post.post_id)));
  assert.ok(payload.posts.every((post) => /^https:\/\/(www\.)?instagram\.com\//.test(post.permalink)));
  assert.ok(payload.post_daily.every((row) => row.impressions === null && row.video_completions === null));
  assert.equal(payload.posts.some((post) => String(post.post_title).includes("Community in action")), false);
});

test("fixture follows the normalized dashboard contract", () => {
  assert.equal(fixture.schema_version, "1.0.0");
  assert.equal(fixture.timezone, "Australia/Melbourne");
  assert.equal(fixture.mode, "test");
  for (const key of ["sources", "account_daily", "posts", "post_daily", "manychat_daily", "web_daily", "ads_daily", "mentions_daily", "insights"]) {
    assert.ok(fixture[key], `missing ${key}`);
  }
  assert.equal(fixture.sources.meta.status, "ok");
  assert.equal(fixture.sources.ga4.status, "not_connected");
  assert.equal(fixture.sources.meta_ads.status, "not_connected");
});

test("30-day range includes an equal-length previous period", () => {
  assert.deepEqual(getPeriodRange("30", "2026-09-28"), {
    start: "2026-08-30",
    end: "2026-09-28",
    previousStart: "2026-07-31",
    previousEnd: "2026-08-29",
    days: 30,
  });
});

test("custom range compares the immediately preceding equal-length period", () => {
  assert.deepEqual(getPeriodRange("custom", "2026-09-28", "2026-09-10", "2026-09-16"), {
    start: "2026-09-10",
    end: "2026-09-16",
    previousStart: "2026-09-03",
    previousEnd: "2026-09-09",
    days: 7,
  });
});

test("null is not converted to zero", () => {
  assert.equal(sumAvailable([null, undefined, ""]), null);
  assert.equal(ratioPercent(null, 100), null);
  assert.equal(ratioPercent(10, 0), null);
  assert.deepEqual(valueChange(null, 5), { absolute: null, percent: null });
});

test("canonical engagement and video formulas do not substitute metrics", () => {
  const enriched = enrichRates({
    likes: 10,
    comments: 2,
    shares: 3,
    reposts: null,
    saves: 5,
    reach: 200,
    video_views: 150,
    video_starts: null,
    video_completions: null,
  });
  assert.equal(enriched.engagements, 20);
  assert.equal(enriched.engagement_rate, 10);
  assert.equal(enriched.share_rate, 1.5);
  assert.equal(enriched.completion_rate, null);
});

test("fixture produces distinct current and previous reporting cohorts", () => {
  const range = getPeriodRange("30", fixture.reference_date);
  const filters = { platform: "all", pillar: "all", format: "all", campaign: "all" };
  const current = buildPostRows(fixture, range, filters);
  const previous = buildPostRows(fixture, { start: range.previousStart, end: range.previousEnd }, filters);
  assert.equal(current.length, 1);
  assert.equal(previous.length, 1);
  assert.ok(aggregatePosts(current).reach > aggregatePosts(previous).reach);
  assert.equal(aggregatePosts(current).follows_attributed, null);
});

test("maturity labels use the required thresholds", () => {
  assert.equal(postMaturity("2026-09-28T10:00:00Z", "2026-09-28").label, "Early");
  assert.equal(postMaturity("2026-09-26T10:00:00Z", "2026-09-28").label, "Developing");
  assert.equal(postMaturity("2026-09-24T10:00:00Z", "2026-09-28").label, "Maturing");
  assert.equal(postMaturity("2026-09-20T10:00:00Z", "2026-09-28").label, "Mature");
});

test("CSV export preserves headings, maturity and escaped content", () => {
  const csv = buildCsv([
    { title: 'A "quoted" title', secondary_pillars: ["Giving", "Connection"], maturity: { label: "Mature" } },
  ], [
    { key: "title", label: "Post" },
    { key: "secondary_pillars", label: "Secondary pillars" },
  ]);
  assert.equal(csv, '"Post","Secondary pillars","Maturity"\n"A ""quoted"" title","Giving|Connection","Mature"');
});

test("referrals include bio and story visits only in their owning account", () => {
  const posts = [
    { post_id: "tgt-post", account_username: "tgt" },
    { post_id: "peg-post", account_username: "peg" },
  ];
  const visits = [
    { date: "2026-10-17", post_id: null, utm_content: "bio", sessions: 2 },
    { date: "2026-10-17", post_id: null, utm_content: "story", sessions: 3, account_username: "tgt" },
    { date: "2026-10-17", post_id: "tgt-post", sessions: 4 },
    { date: "2026-10-17", post_id: "peg-post", sessions: 1 },
  ];
  const range = { start: "2026-10-01", end: "2026-10-19" };
  assert.equal(aggregateWebActivity(selectAccountWebRows(visits, posts, "tgt", "tgt"), range).sessions, 9);
  assert.equal(aggregateWebActivity(selectAccountWebRows(visits, posts, "peg", "tgt"), range).sessions, 1);
  assert.equal(aggregateWebActivity(selectAccountWebRows(visits, posts, "empowher", "tgt"), range).sessions, null);
});

test("referral totals use visit dates and respect platform and post-specific filters", () => {
  const visits = [
    { date: "2026-10-17", post_id: null, utm_source: "ig", sessions: 2, conversions: null },
    { date: "2026-10-18", post_id: "older-post", utm_source: "instagram", sessions: 3, conversions: null },
    { date: "2026-10-18", post_id: null, utm_source: "facebook", sessions: 4, conversions: null },
    { date: "2026-09-28", post_id: null, utm_source: "instagram", sessions: 20, conversions: null },
  ];
  const range = { start: "2026-10-01", end: "2026-10-19" };
  assert.equal(aggregateWebActivity(visits, range).sessions, 9);
  assert.equal(aggregateWebActivity(visits, range, { platform: "instagram" }).sessions, 5);
  assert.equal(aggregateWebActivity(visits, range, { format: "reel" }, new Set(["older-post"])).sessions, 3);
  assert.equal(aggregateWebActivity(visits, range).conversions, null);
});

test("reporting period follows today's reporting timezone even when Meta is stale", () => {
  const date = reportingDate("Australia/Melbourne", new Date("2026-10-18T14:30:00Z"));
  assert.equal(date, "2026-10-19");
  assert.equal(getPeriodRange("14", date).end, "2026-10-19");
  assert.equal(getPeriodRange("previous-month", date).end, "2026-09-30");
});
