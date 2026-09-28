import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateKajabiReferrals,
  parseWebhookRoute,
  sanitizeKajabiEvent,
  sanitizeKajabiReferral,
  secureStringEqual,
} from "../../../lib/kajabi.js";
import { handleKajabiReferral, handleKajabiWebhook } from "../../../src/worker.js";

test("webhook route accepts only supported event paths", () => {
  assert.deepEqual(
    parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/payment-succeeded"),
    { secret: "secret-value", event: "payment-succeeded" },
  );
  assert.equal(parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/purchase-created")?.event, "purchase-created");
  assert.equal(parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/form-submission")?.event, "form-submission");
  assert.equal(parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/unknown"), null);
  assert.equal(parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/payment-succeeded/extra"), null);
});

test("referral sessions retain only anonymous UTM reporting fields", () => {
  const referral = sanitizeKajabiReferral({
    site_id: "2148784918",
    session_id: "anonymous-session",
    page_path: "/giving-table",
    referrer_host: "instagram.com",
    utm_source: "Instagram",
    utm_medium: "Social",
    utm_campaign: "Giving_Table",
    utm_content: "Dd0tpaSCflZ",
    email: "must-not-store@example.com",
  }, "2026-09-29T01:02:03Z");

  assert.equal(referral.utm_source, "instagram");
  assert.equal(referral.utm_content, "dd0tpascflz");
  assert.equal(referral.date, "2026-09-29");
  assert.doesNotMatch(JSON.stringify(referral), /must-not-store@example\.com/);
});

test("referral aggregation produces per-campaign daily sessions", () => {
  const rows = aggregateKajabiReferrals([
    { date: "2026-09-29", utm_source: "instagram", utm_medium: "social", utm_campaign: "launch", utm_content: "post-a" },
    { date: "2026-09-29", utm_source: "instagram", utm_medium: "social", utm_campaign: "launch", utm_content: "post-a" },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sessions, 2);
  assert.equal(rows[0].landing_page_views, 2);
  assert.equal(rows[0].post_id, "post-a");
});

test("secret comparison is exact", () => {
  assert.equal(secureStringEqual("abc", "abc"), true);
  assert.equal(secureStringEqual("abc", "abd"), false);
  assert.equal(secureStringEqual("abc", "abc0"), false);
});

test("payment webhook persists aggregate fields but no personal data", () => {
  const event = sanitizeKajabiEvent("payment-succeeded", {
    id: "evt_123",
    member: { name: "Private Person", email: "private@example.com", phone_number: "0400000000" },
    offer: { id: "offer_1", title: "Giving Table Membership" },
    payment_transaction: {
      id: "txn_1",
      created_at: "2026-09-28T02:00:00Z",
      currency: "aud",
      amount_paid: 14900,
    },
  }, "2026-09-28T02:00:01Z", "fallback");

  assert.equal(event.event_id, "evt_123");
  assert.equal(event.amount_paid_minor, 14900);
  assert.equal(event.currency, "AUD");
  assert.equal(event.offer_title, "Giving Table Membership");
  const serialized = JSON.stringify(event);
  assert.doesNotMatch(serialized, /Private Person|private@example\.com|0400000000/);
});

test("cart webhook stores order facts without the member payload", () => {
  const event = sanitizeKajabiEvent("cart-purchase", {
    order: {
      id: "order_1",
      order_items: [
        { id: "offer_1", title: "Seat", quantity: 1 },
        { id: "offer_2", title: "Donation", quantity: 1 },
      ],
    },
    payment_transaction: { id: "txn_2", currency: "AUD", amount_paid: 20000 },
    member: { email: "never-store@example.com" },
  }, "2026-09-28T03:00:00Z", "fallback");

  assert.equal(event.order_id, "order_1");
  assert.equal(event.order_item_count, 2);
  assert.equal(event.amount_paid_minor, 20000);
  assert.doesNotMatch(JSON.stringify(event), /never-store@example\.com/);
});

test("receiver rejects a bad secret and stores only sanitized events", async () => {
  const values = new Map();
  const kv = {
    async get(key, options) {
      const value = values.get(key) ?? null;
      return options?.type === "json" && value ? JSON.parse(value) : value;
    },
    async put(key, value) {
      values.set(key, value);
    },
  };
  const payload = JSON.stringify({
    id: "evt_test",
    member: { email: "private@example.com" },
    payment_transaction: { id: "txn_test", currency: "AUD", amount_paid: 9900 },
  });
  const makeRequest = (secret) => new Request(`https://example.com/api/kajabi/webhook/${secret}/payment-succeeded`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
  const env = { KAJABI_EVENTS: kv, KAJABI_WEBHOOK_SECRET: "correct-secret" };

  const rejected = await handleKajabiWebhook(makeRequest("wrong-secret"), env);
  assert.equal(rejected.status, 404);
  assert.equal(values.size, 0);

  const accepted = await handleKajabiWebhook(makeRequest("correct-secret"), env);
  assert.equal(accepted.status, 202);
  const storedEvent = values.get("kajabi:event:payment-succeeded:evt_test");
  assert.ok(storedEvent);
  assert.doesNotMatch(storedEvent, /private@example\.com/);
  assert.ok(values.has("kajabi:connection"));
});

test("referral receiver deduplicates sessions and never stores the browser session id", async () => {
  const values = new Map();
  const kv = {
    async get(key, options) {
      const value = values.get(key) ?? null;
      return options?.type === "json" && value ? JSON.parse(value) : value;
    },
    async put(key, value) {
      values.set(key, value);
    },
  };
  const request = () => new Request("https://example.com/api/kajabi/referral", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      site_id: "2148784918",
      session_id: "do-not-persist-this-id",
      page_path: "/event",
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "giving-table",
      utm_content: "Dd0tpaSCflZ",
    }),
  });
  const env = { KAJABI_EVENTS: kv, KAJABI_SITE_ID: "2148784918" };

  const first = await handleKajabiReferral(request(), env);
  const second = await handleKajabiReferral(request(), env);
  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  assert.equal((await second.json()).deduplicated, true);
  const stored = [...values.entries()].find(([key]) => key.startsWith("kajabi:referral:"))?.[1];
  assert.ok(stored);
  assert.doesNotMatch(stored, /do-not-persist-this-id/);
});
