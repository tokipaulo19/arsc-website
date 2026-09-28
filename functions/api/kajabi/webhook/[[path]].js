import {
  eventFingerprint,
  jsonResponse,
  parseWebhookRoute,
  sanitizeKajabiEvent,
  secureStringEqual,
} from "../../../../lib/kajabi.js";

const MAX_BODY_BYTES = 128 * 1024;

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, { allow: "POST" });
  }

  if (!context.env.KAJABI_EVENTS || !context.env.KAJABI_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, error: "Kajabi receiver is not configured" }, 503);
  }

  const route = parseWebhookRoute(context.request.url);
  if (!route || !secureStringEqual(route.secret, context.env.KAJABI_WEBHOOK_SECRET)) {
    return jsonResponse({ ok: false, error: "Not found" }, 404);
  }

  const declaredLength = Number(context.request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "Payload too large" }, 413);
  }

  const rawBody = await context.request.text();
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

  await context.env.KAJABI_EVENTS.put(key, JSON.stringify(event));

  const existingConnection = await context.env.KAJABI_EVENTS.get("kajabi:connection", { type: "json" });
  const connection = {
    connected_at: existingConnection?.connected_at ?? receivedAt,
    last_event_at: receivedAt,
    last_event: route.event,
  };
  await context.env.KAJABI_EVENTS.put("kajabi:connection", JSON.stringify(connection));

  return jsonResponse({ ok: true, accepted: route.event }, 202);
}
