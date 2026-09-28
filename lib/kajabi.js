const SUPPORTED_EVENTS = new Set(["purchase-created", "payment-succeeded", "cart-purchase", "form-submission"]);
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
}

function safeInteger(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function safeText(value, maxLength = 120) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

export function secureStringEqual(left, right) {
  const leftBytes = new TextEncoder().encode(String(left ?? ""));
  const rightBytes = new TextEncoder().encode(String(right ?? ""));
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function parseWebhookRoute(urlValue) {
  const parts = new URL(urlValue).pathname.split("/").filter(Boolean);
  const marker = parts.findIndex((part) => part === "webhook");
  if (marker < 0 || parts.length !== marker + 3) return null;
  const secret = decodeURIComponent(parts[marker + 1]);
  const event = decodeURIComponent(parts[marker + 2]);
  if (!secret || !SUPPORTED_EVENTS.has(event)) return null;
  return { secret, event };
}

export async function eventFingerprint(rawBody) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function sanitizeKajabiEvent(event, payload, receivedAt, fallbackId) {
  if (!SUPPORTED_EVENTS.has(event)) throw new Error("Unsupported Kajabi event.");

  const transaction = firstValue(payload.payment_transaction, payload.transaction) ?? {};
  const order = payload.order ?? {};
  const offer = payload.offer ?? {};
  const form = payload.form ?? {};
  const rawId = firstValue(payload.id, transaction.id, order.id, fallbackId);
  const occurredAt = safeText(firstValue(transaction.created_at, order.created_at, payload.created_at, receivedAt), 40);

  const sanitized = {
    schema_version: "1.0.0",
    source: "kajabi",
    event,
    event_id: safeText(rawId, 180),
    occurred_at: occurredAt,
    received_at: receivedAt,
    transaction_id: safeText(transaction.id, 180),
    order_id: safeText(order.id, 180),
    currency: safeText(firstValue(transaction.currency, payload.currency), 8)?.toUpperCase() ?? null,
    amount_paid_minor: safeInteger(firstValue(transaction.amount_paid, payload.amount_paid)),
    offer_id: safeText(firstValue(offer.id, order.order_items?.[0]?.id), 180),
    offer_title: safeText(firstValue(offer.title, order.order_items?.[0]?.title), 180),
    order_item_count: Array.isArray(order.order_items) ? order.order_items.length : null,
    form_id: safeText(form.id, 180),
    form_title: safeText(form.title, 180),
  };

  // Kajabi sends member/contact details in the source payload. They are deliberately
  // omitted here so names, emails, phone numbers and addresses are never persisted.
  return sanitized;
}

export function sanitizeKajabiReferral(payload, receivedAt) {
  const siteId = safeText(payload.site_id, 40);
  const sessionId = safeText(payload.session_id, 180);
  if (!siteId || !sessionId) throw new Error("A site and anonymous session are required.");

  const referral = {
    schema_version: "1.0.0",
    source: "kajabi",
    event: "referral-session",
    site_id: siteId,
    received_at: receivedAt,
    date: receivedAt.slice(0, 10),
    page_path: safeText(payload.page_path, 300),
    referrer_host: safeText(payload.referrer_host, 180),
    session_id: sessionId,
  };
  UTM_FIELDS.forEach((field) => {
    referral[field] = safeText(payload[field], 180)?.toLowerCase() ?? null;
  });
  if (!referral.utm_source) throw new Error("utm_source is required.");
  return referral;
}

export function aggregateKajabiReferrals(records) {
  const grouped = new Map();
  records.forEach((record) => {
    if (!record?.date || !record?.utm_source) return;
    const key = [record.date, record.utm_source, record.utm_medium, record.utm_campaign, record.utm_content, record.utm_term].join("|");
    const existing = grouped.get(key) ?? {
      date: record.date,
      post_id: record.utm_content ?? null,
      utm_source: record.utm_source,
      utm_medium: record.utm_medium,
      utm_campaign: record.utm_campaign,
      utm_content: record.utm_content,
      utm_term: record.utm_term,
      sessions: 0,
      users: null,
      engaged_sessions: null,
      landing_page_views: 0,
      conversions: null,
    };
    existing.sessions += 1;
    existing.landing_page_views += 1;
    grouped.set(key, existing);
  });
  return [...grouped.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}
