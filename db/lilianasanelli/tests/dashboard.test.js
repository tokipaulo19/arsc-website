import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  aggregatePosts,
  buildCsv,
  buildPostRows,
  enrichRates,
  getPeriodRange,
  postMaturity,
  ratioPercent,
  sumAvailable,
  valueChange,
} from "../metrics.js";

const fixture = JSON.parse(readFileSync(new URL("../fixtures/sample_dashboard_payload.json", import.meta.url), "utf8"));

test("fixture follows the normalized dashboard contract", () => {
  assert.equal(fixture.schema_version, "1.0.0");
  assert.equal(fixture.timezone, "Australia/Melbourne");
  assert.equal(fixture.mode, "mock");
  for (const key of ["sources", "account_daily", "posts", "post_daily", "manychat_daily", "web_daily", "ads_daily", "mentions_daily", "insights"]) {
    assert.ok(fixture[key], `missing ${key}`);
  }
  assert.equal(fixture.sources.meta.status, "ok");
  assert.equal(fixture.sources.ga4.status, "error");
  assert.equal(fixture.sources.meta_ads.status, "inactive");
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
  assert.equal(current.length, 9);
  assert.equal(previous.length, 9);
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
