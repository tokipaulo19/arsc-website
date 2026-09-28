import {
  aggregateKajabiReferrals,
  eventFingerprint,
  jsonResponse,
  parseWebhookRoute,
  sanitizeKajabiEvent,
  sanitizeKajabiReferral,
  secureStringEqual,
} from "../lib/kajabi.js";
import { refreshMetaReporting } from "../lib/meta.js";

const MAX_BODY_BYTES = 128 * 1024;
const MAX_REFERRAL_BODY_BYTES = 4 * 1024;
const KAJABI_CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

async function listStoredJson(namespace, prefix, maximum = 5000) {
  if (!namespace) return [];
  const records = [];
  let cursor;
  do {
    const page = await namespace.list({ prefix, limit: Math.min(1000, maximum - records.length), cursor });
    const values = await Promise.all(page.keys.map((key) => namespace.get(key.name, { type: "json" })));
    records.push(...values.filter(Boolean));
    cursor = page.cursor;
    if (page.list_complete || records.length >= maximum) break;
  } while (cursor);
  return records;
}

function resolveReferralPostIds(rows, posts) {
  const identifiers = new Map();
  posts.forEach((post) => {
    [post.post_id, post.post_slug].filter(Boolean).forEach((value) => identifiers.set(String(value).toLowerCase(), post.post_id));
    if (post.permalink) {
      try {
        const parts = new URL(post.permalink).pathname.split("/").filter(Boolean);
        if (parts[1]) identifiers.set(parts[1].toLowerCase(), post.post_id);
      } catch {
        // Invalid source links are already excluded by the Meta collector.
      }
    }
  });
  return rows.map((row) => ({
    ...row,
    post_id: identifiers.get(String(row.utm_content ?? "").toLowerCase()) ?? null,
  }));
}

async function mergeKajabiReporting(payload, env) {
  if (!env.KAJABI_EVENTS || !env.KAJABI_WEBHOOK_SECRET) {
    return {
      ...payload,
      sources: {
        ...payload.sources,
        kajabi: { label: "Kajabi UTM referral tracking", status: "not_connected", refresh: null, collected_at: null, source_period_start: null, source_period_end: null, data_freshness_hours: null, error_message: null },
      },
    };
  }
  const [connection, referrals, events] = await Promise.all([
    env.KAJABI_EVENTS.get("kajabi:connection", { type: "json" }),
    listStoredJson(env.KAJABI_EVENTS, "kajabi:referral:"),
    listStoredJson(env.KAJABI_EVENTS, "kajabi:event:"),
  ]);
  const webDaily = resolveReferralPostIds(aggregateKajabiReferrals(referrals), payload.posts);
  const dates = referrals.map((record) => record.date).filter(Boolean).sort();
  const conversionIds = new Set(events
    .filter((event) => event.event !== "form-submission")
    .map((event) => event.transaction_id ?? event.order_id ?? event.event_id)
    .filter(Boolean));
  const collectedAt = connection?.last_referral_at ?? connection?.last_event_at ?? null;
  const freshness = collectedAt ? Math.max(0, (Date.now() - new Date(collectedAt).getTime()) / 3_600_000) : null;
  const status = referrals.length || events.length ? "ok" : "ready";
  return {
    ...payload,
    sources: {
      ...payload.sources,
      kajabi: {
        label: "Kajabi UTM referral tracking",
        status,
        refresh: "live_automated",
        collected_at: collectedAt,
        source_period_start: dates[0] ?? null,
        source_period_end: dates.at(-1) ?? null,
        data_freshness_hours: freshness,
        referral_sessions: referrals.length,
        conversions_received: conversionIds.size,
        error_message: null,
      },
    },
    web_daily: [...(payload.web_daily ?? []), ...webDaily],
    insights: [...(payload.insights ?? []), "Kajabi referral sessions are collected only from UTM-tagged visits; incomplete or untagged links are not attributed."],
  };
}

async function getMetaReporting(request, env) {
  let payload = await env.META_REPORTING?.get("meta:reporting:current", { type: "json" });
  if (!payload) {
    const fallbackUrl = new URL("/db/lilianasanelli/data/reporting_status.json", request.url);
    const fallbackResponse = await env.ASSETS.fetch(new Request(fallbackUrl, { headers: request.headers }));
    payload = await fallbackResponse.json();
  }
  const merged = await mergeKajabiReporting(payload, env);
  return new Response(JSON.stringify(merged), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

async function getMetaStatus(env) {
  const status = await env.META_REPORTING?.get("meta:reporting:status", { type: "json" });
  return jsonResponse(status ?? {
    status: env.META_ACCESS_TOKEN && env.META_IG_USER_ID ? "ready" : "not_connected",
    last_refresh_at: null,
    post_count: 0,
    error_message: null,
  });
}

export async function getKajabiStatus(env) {
  const configured = Boolean(env.KAJABI_EVENTS && env.KAJABI_WEBHOOK_SECRET);
  if (!configured) {
    return jsonResponse({
      source: "kajabi",
      status: "not_connected",
      coverage_start: null,
      last_event_at: null,
    });
  }

  const connection = await env.KAJABI_EVENTS.get("kajabi:connection", { type: "json" });
  return jsonResponse({
    source: "kajabi",
    status: connection ? "live" : "ready",
    coverage_start: connection?.connected_at ?? null,
    last_event_at: connection?.last_event_at ?? null,
    last_referral_at: connection?.last_referral_at ?? null,
  });
}

export async function handleKajabiReferral(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: KAJABI_CORS_HEADERS });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405, { ...KAJABI_CORS_HEADERS, allow: "POST, OPTIONS" });
  if (!env.KAJABI_EVENTS || !env.KAJABI_SITE_ID) return jsonResponse({ ok: false, error: "Kajabi referral tracking is not configured" }, 503, KAJABI_CORS_HEADERS);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REFERRAL_BODY_BYTES) return jsonResponse({ ok: false, error: "Payload too large" }, 413, KAJABI_CORS_HEADERS);
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_REFERRAL_BODY_BYTES) return jsonResponse({ ok: false, error: "Payload too large" }, 413, KAJABI_CORS_HEADERS);

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400, KAJABI_CORS_HEADERS);
  }
  if (String(payload.site_id ?? "") !== String(env.KAJABI_SITE_ID)) return jsonResponse({ ok: false, error: "Unknown Kajabi site" }, 403, KAJABI_CORS_HEADERS);

  const receivedAt = new Date().toISOString();
  let referral;
  try {
    referral = sanitizeKajabiReferral(payload, receivedAt);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message }, 400, KAJABI_CORS_HEADERS);
  }
  const sessionHash = await eventFingerprint([
    referral.site_id,
    referral.date,
    referral.session_id,
    referral.utm_source,
    referral.utm_medium,
    referral.utm_campaign,
    referral.utm_content,
  ].join("|"));
  const key = `kajabi:referral:${referral.date}:${sessionHash}`;
  const existing = await env.KAJABI_EVENTS.get(key);
  if (!existing) {
    const { session_id: _discardedSessionId, ...storedReferral } = referral;
    await env.KAJABI_EVENTS.put(key, JSON.stringify({ ...storedReferral, event_id: sessionHash }), { expirationTtl: 400 * 24 * 60 * 60 });
    const existingConnection = await env.KAJABI_EVENTS.get("kajabi:connection", { type: "json" });
    await env.KAJABI_EVENTS.put("kajabi:connection", JSON.stringify({
      connected_at: existingConnection?.connected_at ?? receivedAt,
      last_event_at: existingConnection?.last_event_at ?? null,
      last_event: existingConnection?.last_event ?? null,
      last_referral_at: receivedAt,
    }));
  }
  return jsonResponse({ ok: true, accepted: "referral-session", deduplicated: Boolean(existing) }, 202, KAJABI_CORS_HEADERS);
}

export async function handleKajabiWebhook(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, { allow: "POST" });
  }

  if (!env.KAJABI_EVENTS || !env.KAJABI_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, error: "Kajabi receiver is not configured" }, 503);
  }

  const route = parseWebhookRoute(request.url);
  if (!route || !secureStringEqual(route.secret, env.KAJABI_WEBHOOK_SECRET)) {
    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "Payload too large" }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "Payload too large" }, 413);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, 400);
  }

  const receivedAt = new Date().toISOString();
  const fingerprint = await eventFingerprint(rawBody);
  const event = sanitizeKajabiEvent(route.event, payload, receivedAt, fingerprint);
  const key = `kajabi:event:${route.event}:${event.event_id ?? fingerprint}`;

  await env.KAJABI_EVENTS.put(key, JSON.stringify(event));

  const existingConnection = await env.KAJABI_EVENTS.get("kajabi:connection", { type: "json" });
  const connection = {
    connected_at: existingConnection?.connected_at ?? receivedAt,
    last_event_at: receivedAt,
    last_event: route.event,
  };
  await env.KAJABI_EVENTS.put("kajabi:connection", JSON.stringify(connection));

  return jsonResponse({ ok: true, accepted: route.event }, 202);
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/meta/reporting" && request.method === "GET") {
      return getMetaReporting(request, env);
    }
    if (path === "/api/meta/status" && request.method === "GET") {
      return getMetaStatus(env);
    }
    if (path === "/api/kajabi/status" && request.method === "GET") {
      return getKajabiStatus(env);
    }
    if (path === "/api/kajabi/referral") {
      return handleKajabiReferral(request, env);
    }
    if (path.startsWith("/api/kajabi/webhook/")) {
      return handleKajabiWebhook(request, env);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_controller, env, context) {
    context.waitUntil(refreshMetaReporting(env));
  },
};
