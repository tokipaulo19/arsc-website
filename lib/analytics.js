import { createRemoteJWKSet, jwtVerify } from 'jose';
import { analyticsDashboard } from './analytics-dashboard.js';

export const ANALYTICS_PATHS = ['/', '/services/general-virtual-assistance/', '/services/social-media-management/', '/services/social-media-graphics/'];
export const ANALYTICS_EVENTS = ['page_view', 'enquiry_start', 'enquiry_accepted', 'email_click'];
export const DAILY_EVENT_CAP = 10000;
const ORIGIN = 'https://arservicescollective.com';
const keys = new Map();
const privateHeaders = { 'cache-control': 'no-store, private', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
const json = (value, status = 200) => Response.json(value, { status, headers: privateHeaders });

export function analyticsConfig(request, env) {
  if (request.method !== 'GET') return json({ enabled: false }, 405);
  return json({ enabled: env.ANALYTICS_ENABLED === 'true' && Boolean(env.ARSC_ANALYTICS && env.ANALYTICS_RATE_LIMITER && env.ANALYTICS_ACCESS_TEAM && env.ANALYTICS_ACCESS_AUD && env.ANALYTICS_OWNER_EMAIL) });
}

export function validAnalyticsBatch(value) {
  if (!value || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'consent,events' || value.consent !== true) return false;
  if (!Array.isArray(value.events) || !value.events.length || value.events.length > 4) return false;
  const seen = new Set();
  return value.events.every(item => {
    if (!item || Array.isArray(item) || Object.keys(item).sort().join(',') !== 'name,path') return false;
    if (!ANALYTICS_EVENTS.includes(item.name) || !ANALYTICS_PATHS.includes(item.path)) return false;
    if (item.name.startsWith('enquiry_') && item.path !== '/') return false;
    const key = item.path + item.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readBody(request) {
  if (Number(request.headers.get('content-length') || 0) > 1024) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let bytes = 0, chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1024) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(joined));
}

export async function collectAnalytics(request, env) {
  if (request.method !== 'POST') return json({ ok: false }, 405);
  if (!(await analyticsConfig(new Request(request.url), env).json()).enabled) return json({ ok: false }, 503);
  if (new URL(request.url).origin !== ORIGIN || request.headers.get('origin') !== ORIGIN) return json({ ok: false }, 403);
  if (request.headers.get('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin') return json({ ok: false }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ ok: false }, 415);
  if (/bot|spider|crawler|headless/i.test(request.headers.get('user-agent') || '')) return json({ ok: false }, 403);
  let referer;
  try { referer = new URL(request.headers.get('referer')); }
  catch { return json({ ok: false }, 403); }
  if (referer.origin !== ORIGIN || !ANALYTICS_PATHS.includes(referer.pathname)) return json({ ok: false }, 403);
  try {
    let payload;
    try { payload = await readBody(request); }
    catch (error) { return json({ ok: false }, error.message === 'size' ? 413 : 400); }
    if (!validAnalyticsBatch(payload) || payload.events.some(item => item.path !== referer.pathname)) return json({ ok: false }, 400);
    // A shared per-location guard needs no IP/visitor identifier. It limits DB work,
    // not account-wide Worker invocations, and is intentionally best-effort.
    if (!(await env.ANALYTICS_RATE_LIMITER.limit({ key: 'arsc-public-analytics' })).success) return json({ ok: false }, 429);
    const day = new Date().toISOString().slice(0, 10);
    const statements = payload.events.map(item => env.ARSC_ANALYTICS.prepare(`
      INSERT INTO analytics_daily (day, path, event, count)
      SELECT ?, ?, ?, 1 WHERE COALESCE((SELECT SUM(count) FROM analytics_daily WHERE day = ?), 0) < ?
      ON CONFLICT (day, path, event) DO UPDATE SET count = count + 1
    `).bind(day, item.path, item.name, day, DAILY_EVENT_CAP));
    const results = await env.ARSC_ANALYTICS.batch(statements);
    if (results.some(result => result.success === false)) return json({ ok: false }, 503);
    if (results.some(result => result.meta?.changes === 0)) return json({ ok: false, capped: true }, 429);
    return json({ ok: true }, 202);
  } catch { return json({ ok: false }, 503); }
}

export async function verifyAnalyticsOwner(request, env, keyResolver) {
  const team = env.ANALYTICS_ACCESS_TEAM;
  if (!/^[a-z0-9-]+$/.test(team || '') || !env.ANALYTICS_ACCESS_AUD || !env.ANALYTICS_OWNER_EMAIL) return false;
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token || token.length > 16384) return false;
  try {
    const issuer = `https://${team}.cloudflareaccess.com`;
    if (!keyResolver) {
      if (!keys.has(issuer)) {
        if (keys.size >= 2) keys.delete(keys.keys().next().value);
        keys.set(issuer, createRemoteJWKSet(new URL(issuer + '/cdn-cgi/access/certs'), { timeoutDuration: 3000 }));
      }
      keyResolver = keys.get(issuer);
    }
    const { payload } = await jwtVerify(token, keyResolver, { issuer, audience: env.ANALYTICS_ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp', 'iss', 'aud', 'email'] });
    return typeof payload.email === 'string' && payload.email.toLowerCase() === env.ANALYTICS_OWNER_EMAIL.toLowerCase();
  } catch { return false; }
}

export async function readAnalyticsReport(db, days, now = new Date()) {
  const start = new Date(now); start.setUTCDate(start.getUTCDate() - days + 1);
  const from = start.toISOString().slice(0, 10), to = now.toISOString().slice(0, 10);
  const { results } = await db.prepare('SELECT day, path, event, count FROM analytics_daily WHERE day >= ? AND day <= ? ORDER BY day, path, event').bind(from, to).all();
  const rows = results.filter(row => ANALYTICS_PATHS.includes(row.path) && ANALYTICS_EVENTS.includes(row.event));
  return { from, to, days, rows, cap: DAILY_EVENT_CAP, timezone: 'UTC', generated: now.toISOString() };
}

export async function handleAnalyticsPrivate(request, env, keyResolver) {
  if (!await verifyAnalyticsOwner(request, env, keyResolver)) return new Response('Private ARSC analytics. Sign in through Cloudflare Access with the authorised owner account.', { status: 403, headers: privateHeaders });
  if (request.method !== 'GET') return json({ ok: false }, 405);
  const url = new URL(request.url);
  if (url.pathname === '/analytics' || url.pathname === '/analytics/') return new Response(analyticsDashboard, { headers: {
    ...privateHeaders, 'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  } });
  if (url.pathname !== '/analytics/report' && url.pathname !== '/analytics/export') return json({ ok: false }, 404);
  const days = Number(url.searchParams.get('days') || 30);
  if (![7, 30, 90, 365].includes(days)) return json({ ok: false }, 400);
  if (!env.ARSC_ANALYTICS) return json({ ok: false }, 503);
  try {
    const report = await readAnalyticsReport(env.ARSC_ANALYTICS, days);
    if (url.pathname === '/analytics/report') return json(report);
    const csv = ['day_utc,path,event,count', ...report.rows.map(row => `${row.day},${row.path},${row.event},${Number(row.count)}`)].join('\r\n');
    return new Response(csv, { headers: { ...privateHeaders, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="arsc-analytics.csv"' } });
  } catch { return json({ ok: false }, 503); }
}
