import assert from "node:assert/strict";
import test from "node:test";
import {
  collectMetaReporting,
  insightMap,
  normalizeMetaMedia,
  refreshMetaReporting,
} from "../../../lib/meta.js";

test("Meta insight values support both values and total_value responses", () => {
  assert.deepEqual(insightMap({ data: [
    { name: "reach", values: [{ value: 120 }] },
    { name: "views", total_value: { value: 450 } },
    { name: "saved", values: [] },
  ] }), { reach: 120, views: 450, saved: null });
});

test("Meta media normalization preserves real links and leaves unsupported metrics unavailable", () => {
  const normalized = normalizeMetaMedia({
    id: "123456",
    caption: "A real post\n\nMore caption text",
    comments_count: 6,
    like_count: 25,
    media_type: "CAROUSEL_ALBUM",
    media_product_type: "FEED",
    permalink: "https://www.instagram.com/p/example/",
    timestamp: "2026-09-20T04:00:00+0000",
    username: "givingtablebylilianasanelli",
  }, { data: [
    { name: "views", values: [{ value: 500 }] },
    { name: "reach", values: [{ value: 300 }] },
    { name: "saved", values: [{ value: 4 }] },
  ] }, "2026-09-28");

  assert.equal(normalized.post.post_title, "A real post");
  assert.equal(normalized.post.format, "carousel");
  assert.equal(normalized.post.permalink, "https://www.instagram.com/p/example/");
  assert.equal(normalized.snapshot.views, 500);
  assert.equal(normalized.snapshot.likes, 25);
  assert.equal(normalized.snapshot.comments, 6);
  assert.equal(normalized.snapshot.saves, 4);
  assert.equal(normalized.snapshot.impressions, null);
  assert.equal(normalized.snapshot.follows_attributed, null);
  assert.equal(normalized.snapshot.video_completions, null);
});

test("automatic collector fetches real media metrics and keeps daily account snapshots", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), authorization: options.headers.authorization });
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/17841441120721634/media")) {
      return Response.json({ data: [{
        id: "media-1",
        caption: "Connected post",
        media_type: "IMAGE",
        media_product_type: "FEED",
        permalink: "https://www.instagram.com/p/connected/",
        timestamp: "2026-09-27T02:00:00+0000",
        username: "givingtablebylilianasanelli",
      }] });
    }
    if (pathname.endsWith("/media-1/insights")) {
      return Response.json({ data: [
        { name: "views", values: [{ value: 90 }] },
        { name: "reach", values: [{ value: 70 }] },
        { name: "likes", values: [{ value: 8 }] },
        { name: "comments", values: [{ value: 2 }] },
        { name: "saved", values: [{ value: 1 }] },
        { name: "shares", values: [{ value: 3 }] },
      ] });
    }
    if (pathname.endsWith("/17841441120721634")) {
      return Response.json({ id: "17841441120721634", username: "givingtablebylilianasanelli", followers_count: 6123, media_count: 208 });
    }
    return Response.json({ error: { message: "Unexpected request" } }, { status: 404 });
  };

  const payload = await collectMetaReporting({
    META_ACCESS_TOKEN: "test-token",
    META_IG_USER_ID: "17841441120721634",
    META_GRAPH_VERSION: "v25.0",
  }, null, { fetchImpl, now: "2026-09-28T20:00:00Z" });

  assert.equal(payload.mode, "automatic");
  assert.equal(payload.sources.meta.refresh, "daily_automated");
  assert.equal(payload.posts.length, 1);
  assert.equal(payload.post_daily[0].reach, 70);
  assert.deepEqual(payload.account_daily, [{ date: "2026-09-28", followers: 6123, posts: 208 }]);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.authorization === "Bearer test-token"));
  assert.ok(calls.every((call) => !call.url.includes("test-token")));
});

test("scheduled refresh stores the current report and status", async () => {
  const values = new Map();
  const env = {
    META_ACCESS_TOKEN: "test-token",
    META_IG_USER_ID: "17841441120721634",
    META_GRAPH_VERSION: "v25.0",
    META_REPORTING: {
      async get(key, options) {
        const value = values.get(key) ?? null;
        return options?.type === "json" && value ? JSON.parse(value) : value;
      },
      async put(key, value) {
        values.set(key, value);
      },
    },
  };
  const fetchImpl = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/17841441120721634/media")) return Response.json({ data: [] });
    if (pathname.endsWith("/17841441120721634")) return Response.json({ followers_count: 6000, media_count: 200 });
    return Response.json({ error: { message: "Unexpected request" } }, { status: 404 });
  };

  await refreshMetaReporting(env, { fetchImpl, now: "2026-09-28T20:00:00Z" });
  const report = JSON.parse(values.get("meta:reporting:current"));
  const status = JSON.parse(values.get("meta:reporting:status"));
  assert.equal(report.mode, "automatic");
  assert.equal(status.status, "ok");
  assert.equal(status.last_refresh_at, "2026-09-28T20:00:00.000Z");
});
