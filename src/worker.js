import {
  eventFingerprint,
  jsonResponse,
  parseWebhookRoute,
  sanitizeKajabiEvent,
  secureStringEqual,
} from "../lib/kajabi.js";

const MAX_BODY_BYTES = 128 * 1024;

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
  });
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
    if (path === "/api/kajabi/status" && request.method === "GET") {
      return getKajabiStatus(env);
    }
    if (path.startsWith("/api/kajabi/webhook/")) {
      return handleKajabiWebhook(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
