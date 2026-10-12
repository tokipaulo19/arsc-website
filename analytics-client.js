const PATHS = ['/', '/services/general-virtual-assistance/', '/services/social-media-management/', '/services/social-media-graphics/'];
const EVENTS = ['page_view', 'enquiry_start', 'enquiry_accepted', 'email_click'];
const PREFERENCE = 'arsc-analytics-consent-v1';

export function createAnalyticsTracker({ path, send, schedule = setTimeout, cancel = clearTimeout }) {
  let allowed = false, queue = [], timer;
  const seen = new Set();
  const flush = () => {
    if (timer) cancel(timer); timer = undefined;
    if (!allowed || !queue.length) return;
    const batch = queue; queue = [];
    try { Promise.resolve(send({ consent: true, events: batch })).catch(() => {}); } catch { /* Never affect browsing or enquiry delivery. */ }
  };
  return {
    track(name) {
      if (!allowed || !PATHS.includes(path) || !EVENTS.includes(name) || seen.has(name)) return;
      if (name.startsWith('enquiry_') && path !== '/') return;
      seen.add(name); queue.push({ name, path });
      if (!timer) timer = schedule(flush, 800);
    },
    allow() { allowed = true; this.track('page_view'); },
    deny() { allowed = false; queue = []; if (timer) cancel(timer); timer = undefined; },
    flush
  };
}

export async function initAnalytics(win = window, doc = document) {
  if (!PATHS.includes(win.location.pathname)) return null;
  // Privacy signals override a previously saved choice.
  if (win.navigator.globalPrivacyControl || win.navigator.doNotTrack === '1' || win.doNotTrack === '1') return null;
  let config;
  try {
    const response = await win.fetch('/api/analytics/config', { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    config = await response.json();
  } catch { return null; }
  if (config.enabled !== true) return null;
  let choice = null;
  try { const saved = JSON.parse(win.localStorage.getItem(PREFERENCE)); if (saved?.expires > Date.now() && ['allow', 'deny'].includes(saved.value)) choice = saved.value; } catch { /* Use a visit-only choice. */ }
  const inFlight = new Set();
  const tracker = createAnalyticsTracker({ path: win.location.pathname, send: async payload => {
    const controller = new AbortController(); inFlight.add(controller);
    const timeout = setTimeout(() => controller.abort(), 3000);
    try { await win.fetch('/api/analytics/collect', { method: 'POST', credentials: 'same-origin', redirect: 'error', referrer: win.location.origin + win.location.pathname, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal, keepalive: true }); }
    finally { clearTimeout(timeout); inFlight.delete(controller); }
  } });
  const box = doc.createElement('section'); box.className = 'analytics-choice'; box.setAttribute('aria-label', 'Optional analytics');
  const heading = doc.createElement('strong'); heading.textContent = 'Help us improve ARSC?';
  const explanation = doc.createElement('p'); explanation.textContent = 'Allow simple page and enquiry-action counts. No visitor IDs or form details are stored. Reports cover one year; older totals are cleaned when new activity is recorded. Cloudflare processes requests. Your choice is saved on this device for 180 days.';
  const actions = doc.createElement('div');
  const allow = doc.createElement('button'); allow.type = 'button'; allow.textContent = 'Allow analytics';
  const deny = doc.createElement('button'); deny.type = 'button'; deny.textContent = 'No thanks';
  const close = doc.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.hidden = true;
  actions.append(allow, deny, close); box.append(heading, explanation, actions);
  const settings = doc.createElement('button'); settings.type = 'button'; settings.className = 'analytics-settings'; settings.textContent = 'Analytics privacy'; settings.hidden = !choice;
  doc.body.append(box, settings); box.hidden = Boolean(choice);
  const apply = value => {
    choice = value;
    if (value === 'allow') tracker.allow();
    else { tracker.deny(); for (const controller of inFlight) controller.abort(); }
    try { win.localStorage.setItem(PREFERENCE, JSON.stringify({ value, expires: Date.now() + 180 * 86400000 })); } catch { /* No tracking identifiers are saved. */ }
    box.hidden = true; settings.hidden = false; settings.focus();
  };
  allow.addEventListener('click', () => apply('allow')); deny.addEventListener('click', () => apply('deny'));
  settings.addEventListener('click', () => { box.hidden = false; settings.hidden = true; close.hidden = false; allow.focus(); });
  close.addEventListener('click', () => { box.hidden = true; settings.hidden = false; settings.focus(); });
  box.addEventListener('keydown', event => { if (event.key === 'Escape' && choice) { box.hidden = true; settings.hidden = false; settings.focus(); } });
  // Discrete actions only: no scroll, frame, pointermove, resize or replay observers.
  doc.addEventListener('input', event => { if (event.target?.closest?.('#enquiry-form')) tracker.track('enquiry_start'); });
  doc.addEventListener('click', event => { if (event.target?.closest?.('a[href^="mailto:"]')) tracker.track('email_click'); });
  win.addEventListener('arsc:enquiry-accepted', () => tracker.track('enquiry_accepted'));
  win.addEventListener('pagehide', () => tracker.flush());
  doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') tracker.flush(); });
  win.addEventListener('storage', event => {
    if (event.key !== PREFERENCE) return;
    try { const saved = JSON.parse(event.newValue); choice = saved?.value === 'allow' && saved.expires > Date.now() ? 'allow' : 'deny'; }
    catch { choice = 'deny'; }
    if (choice === 'allow') tracker.allow();
    else { tracker.deny(); for (const controller of inFlight) controller.abort(); }
  });
  if (choice === 'allow') tracker.allow();
  return tracker;
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') void initAnalytics();
