const MEDIA_LIMIT = 40;
const HISTORY_DAYS = 120;
const MEDIA_LOOKBACK_DAYS = 62;
const MEDIA_FIELDS = [
  "id",
  "caption",
  "comments_count",
  "like_count",
  "media_type",
  "media_product_type",
  "permalink",
  "timestamp",
  "username",
].join(",");
const MEDIA_METRICS = "views,reach,saved,shares,total_interactions";

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function titleFromCaption(caption, mediaId) {
  const firstLine = String(caption ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (!firstLine) return `Instagram post ${mediaId}`;
  return firstLine.length > 150 ? `${firstLine.slice(0, 147).trim()}…` : firstLine;
}

function formatFromMedia(media) {
  const product = String(media.media_product_type ?? "").toLowerCase();
  const type = String(media.media_type ?? "").toLowerCase();
  if (product === "reels" || type === "reel") return "reel";
  if (type === "carousel_album") return "carousel";
  if (type === "image") return "image";
  if (type === "video") return "video";
  return type || product || null;
}

function insightValue(entry) {
  if (entry?.total_value && typeof entry.total_value === "object") {
    return numberOrNull(entry.total_value.value);
  }
  const values = Array.isArray(entry?.values) ? entry.values : [];
  return numberOrNull(values.at(-1)?.value);
}

export function insightMap(payload) {
  return Object.fromEntries((payload?.data ?? []).map((entry) => [entry.name, insightValue(entry)]));
}

export function normalizeMetaMedia(media, insights, snapshotDate) {
  const metrics = insightMap(insights);
  const mediaId = String(media.id);
  return {
    post: {
      post_id: mediaId,
      platform_post_id: mediaId,
      post_slug: mediaId,
      post_title: titleFromCaption(media.caption, mediaId),
      platform: "instagram",
      account_username: media.username || null,
      account_name: null,
      published_at: media.timestamp,
      permalink: media.permalink || null,
      primary_pillar: null,
      secondary_pillars: [],
      format: formatFromMedia(media),
      campaign_slug: null,
      cta_keyword: null,
    },
    snapshot: {
      post_id: mediaId,
      snapshot_date: snapshotDate,
      metric_scope: "Lifetime",
      views: metrics.views ?? null,
      reach: metrics.reach ?? null,
      likes: metrics.likes ?? numberOrNull(media.like_count),
      shares: metrics.shares ?? null,
      follows_attributed: null,
      comments: metrics.comments ?? numberOrNull(media.comments_count),
      saves: metrics.saved ?? null,
      reposts: null,
      impressions: null,
      video_views: null,
      video_starts: null,
      video_completions: null,
    },
  };
}

function graphUrl(env, path, parameters = {}) {
  const version = env.META_GRAPH_VERSION || "v26.0";
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  return url;
}

async function fetchGraph(env, path, parameters, fetchImpl) {
  const response = await fetchImpl(graphUrl(env, path, parameters), {
    headers: { authorization: `Bearer ${env.META_ACCESS_TOKEN}` },
  });
  const payload = await response.json();
  if (!response.ok || payload?.error) {
    const message = payload?.error?.message || `Meta API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysBefore(date, days) {
  return new Date(date.getTime() - (days * 86400000));
}

function mergeByKey(previous, current, keySelector, cutoff) {
  const merged = new Map();
  [...previous, ...current].forEach((item) => {
    if (cutoff && keySelector(item).date < cutoff) return;
    merged.set(keySelector(item).key, item);
  });
  return [...merged.values()];
}

export async function collectMetaReporting(env, previousPayload = null, options = {}) {
  if (!env.META_ACCESS_TOKEN || !env.META_IG_USER_ID) {
    throw new Error("Meta reporting credentials are not configured.");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ? new Date(options.now) : new Date();
  const snapshotDate = isoDate(now);
  const mediaSince = Math.floor(daysBefore(now, MEDIA_LOOKBACK_DAYS).getTime() / 1000);
  const mediaPayload = await fetchGraph(env, `${env.META_IG_USER_ID}/media`, {
    fields: MEDIA_FIELDS,
    limit: MEDIA_LIMIT,
    since: mediaSince,
  }, fetchImpl);
  const media = Array.isArray(mediaPayload.data) ? mediaPayload.data : [];

  const normalized = await Promise.all(media.map(async (item) => {
    try {
      const insights = await fetchGraph(env, `${item.id}/insights`, { metric: MEDIA_METRICS }, fetchImpl);
      return normalizeMetaMedia(item, insights, snapshotDate);
    } catch (error) {
      return {
        ...normalizeMetaMedia(item, { data: [] }, snapshotDate),
        error: `${item.id}: ${error.message}`,
      };
    }
  }));

  let profile = null;
  try {
    profile = await fetchGraph(env, env.META_IG_USER_ID, {
      fields: "id,username,name,followers_count,media_count",
    }, fetchImpl);
  } catch {
    profile = null;
  }

  const cutoff = isoDate(daysBefore(now, HISTORY_DAYS));
  const currentPosts = normalized.map((entry) => entry.post);
  const currentSnapshots = normalized.map((entry) => entry.snapshot);
  const previousPosts = previousPayload?.posts ?? [];
  const previousSnapshots = previousPayload?.post_daily ?? [];
  const posts = mergeByKey(previousPosts, currentPosts, (item) => ({
    key: item.post_id,
    date: String(item.published_at ?? "").slice(0, 10),
  }), cutoff).sort((left, right) => right.published_at.localeCompare(left.published_at));
  const postDaily = mergeByKey(previousSnapshots, currentSnapshots, (item) => ({
    key: `${item.post_id}|${item.snapshot_date}`,
    date: item.snapshot_date,
  }), cutoff).sort((left, right) => left.snapshot_date.localeCompare(right.snapshot_date));
  const currentAccountSnapshot = profile ? [{
    date: snapshotDate,
    followers: numberOrNull(profile.followers_count),
    posts: numberOrNull(profile.media_count),
  }] : [];
  const accountDaily = mergeByKey(previousPayload?.account_daily ?? [], currentAccountSnapshot, (item) => ({
    key: item.date,
    date: item.date,
  }), cutoff).sort((left, right) => left.date.localeCompare(right.date));
  const errors = normalized.map((entry) => entry.error).filter(Boolean);

  return {
    schema_version: "1.0.0",
    generated_at: now.toISOString(),
    reference_date: snapshotDate,
    timezone: "Australia/Melbourne",
    mode: "automatic",
    sources: {
      ...(previousPayload?.sources ?? {}),
      meta: {
        label: "Meta / Instagram Insights",
        status: errors.length === media.length && media.length ? "error" : errors.length ? "partial" : "ok",
        refresh: "daily_automated",
        collected_at: now.toISOString(),
        source_period_start: posts.at(-1)?.published_at?.slice(0, 10) ?? null,
        source_period_end: snapshotDate,
        data_freshness_hours: 0,
        error_message: errors.length ? `${errors.length} post insight request(s) failed.` : media.length === MEDIA_LIMIT ? `Only the ${MEDIA_LIMIT} most recent posts in the lookback window were collected.` : null,
      },
    },
    period_presets: previousPayload?.period_presets ?? {
      default: "30",
      supported: ["14", "30", "mtd", "previous-month", "custom"],
    },
    account_daily: accountDaily,
    posts,
    post_daily: postDaily,
    manychat_daily: previousPayload?.manychat_daily ?? [],
    web_daily: previousPayload?.web_daily ?? [],
    ads_daily: previousPayload?.ads_daily ?? [],
    mentions_daily: previousPayload?.mentions_daily ?? [],
    insights: [
      "Meta post metrics refresh automatically each day.",
      "Impressions, per-post follows and video completion are unavailable from this connector and remain N/A.",
    ],
  };
}

export async function refreshMetaReporting(env, options = {}) {
  if (!env.META_REPORTING) throw new Error("META_REPORTING storage is not configured.");
  const previous = await env.META_REPORTING.get("meta:reporting:current", { type: "json" });
  const payload = await collectMetaReporting(env, previous, options);
  await env.META_REPORTING.put("meta:reporting:current", JSON.stringify(payload));
  await env.META_REPORTING.put("meta:reporting:status", JSON.stringify({
    status: payload.sources.meta.status,
    last_refresh_at: payload.generated_at,
    post_count: payload.posts.length,
    error_message: payload.sources.meta.error_message,
  }));
  return payload;
}
