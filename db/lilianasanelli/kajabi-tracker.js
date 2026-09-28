(() => {
  "use strict";

  const endpoint = "https://arservicescollective.com/api/kajabi/referral";
  const siteId = "2148784918";
  const campaignKey = "arsc_kajabi_campaign";
  const sessionKey = "arsc_kajabi_session";
  const fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const parameters = new URLSearchParams(window.location.search);
  const incoming = Object.fromEntries(fields.map((field) => [field, parameters.get(field) || null]));

  let campaign = incoming;
  try {
    if (incoming.utm_source) sessionStorage.setItem(campaignKey, JSON.stringify(incoming));
    else campaign = JSON.parse(sessionStorage.getItem(campaignKey) || "null") || incoming;
  } catch {
    campaign = incoming;
  }
  if (!campaign.utm_source) return;

  let sessionId;
  try {
    sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(sessionKey, sessionId);
    }
  } catch {
    sessionId = crypto.randomUUID();
  }

  const sentKey = `arsc_kajabi_sent:${campaign.utm_source}:${campaign.utm_campaign || ""}:${campaign.utm_content || ""}`;
  try {
    if (sessionStorage.getItem(sentKey)) return;
  } catch {
    // The server also deduplicates by anonymous session, so storage failure is safe.
  }

  let referrerHost = null;
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    referrerHost = null;
  }

  fetch(endpoint, {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      site_id: siteId,
      session_id: sessionId,
      page_path: window.location.pathname,
      referrer_host: referrerHost,
      ...campaign,
    }),
  }).then((response) => {
    if (!response.ok) return;
    try {
      sessionStorage.setItem(sentKey, "1");
    } catch {
      // No persistent client identifier is required.
    }
  }).catch(() => {
    // Analytics must never interrupt the Kajabi visitor experience.
  });
})();
