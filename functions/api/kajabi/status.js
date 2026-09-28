import { jsonResponse } from "../../../lib/kajabi.js";

export async function onRequestGet(context) {
  const configured = Boolean(context.env.KAJABI_EVENTS && context.env.KAJABI_WEBHOOK_SECRET);
  if (!configured) {
    return jsonResponse({
      source: "kajabi",
      status: "not_connected",
      coverage_start: null,
      last_event_at: null,
    });
  }

  const connection = await context.env.KAJABI_EVENTS.get("kajabi:connection", { type: "json" });
  return jsonResponse({
    source: "kajabi",
    status: connection ? "live" : "ready",
    coverage_start: connection?.connected_at ?? null,
    last_event_at: connection?.last_event_at ?? null,
  });
}
