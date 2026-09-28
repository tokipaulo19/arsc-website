import assert from "node:assert/strict";
import test from "node:test";
import {
  parseWebhookRoute,
  sanitizeKajabiEvent,
  secureStringEqual,
} from "../../../lib/kajabi.js";
import { handleKajabiWebhook } from "../../../src/worker.js";

test("webhook route accepts only supported event paths", () => {
  assert.deepEqual(
    parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/payment-succeeded"),
    { secret: "secret-value", event: "payment-succeeded" },
  );
  assert.equal(parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/unknown"), null);
  assert.equal(parseWebhookRoute("https://example.com/api/kajabi/webhook/secret-value/payment-succeeded/extra"), null);
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
