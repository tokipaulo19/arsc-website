const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const analyticsDb = require('./helpers/analytics-db.cjs');
const load = () => import('../lib/analytics.js');
const origin = 'https://arservicescollective.com';
const payload = { consent: true, events: [{ name: 'page_view', path: '/' }] };
const request = (value = payload, headers = {}, method = 'POST') => new Request(origin + '/api/analytics/collect', { method, headers: { origin, referer: origin + '/', 'content-type': 'application/json', ...headers }, ...(method === 'POST' ? { body: JSON.stringify(value) } : {}) });
const environment = db => ({ ANALYTICS_ENABLED: 'true', ARSC_ANALYTICS: db, ANALYTICS_RATE_LIMITER: { limit: async () => ({ success: true }) }, ANALYTICS_ACCESS_TEAM: 'test-team', ANALYTICS_ACCESS_AUD: 'test-audience', ANALYTICS_OWNER_EMAIL: 'owner@example.com' });

test('analytics is disabled by default; config exposes no private configuration', async () => {
  const { analyticsConfig, collectAnalytics } = await load();
  assert.deepEqual(await analyticsConfig(new Request(origin), {}).json(), { enabled: false });
  assert.equal((await collectAnalytics(request(), {})).status, 503);
  assert.deepEqual(await analyticsConfig(new Request(origin), environment({})).json(), { enabled: true });
  for (const key of Object.keys(environment({}))) { const env = environment({}); delete env[key]; assert.equal((await analyticsConfig(new Request(origin), env).json()).enabled, false); }
});

test('rejects PII, URL queries/fragments, private paths, extra keys, duplicates and missing consent', async () => {
  const { validAnalyticsBatch } = await load();
  assert(validAnalyticsBatch(payload));
  for (const value of [null, [], {}, { ...payload, consent: false }, { ...payload, email: 'private@example.com' }, { ...payload, events: [{ name: 'page_view', path: '/?email=private' }] }, { ...payload, events: [{ name: 'page_view', path: '/#contact' }] }, { ...payload, events: [{ name: 'page_view', path: '/db/' }] }, { ...payload, events: [{ name: 'page_view', path: '/firefoxtraining/db/' }] }, { ...payload, events: [{ name: 'page_view', path: '/', nameOfVisitor: 'Private' }] }, { ...payload, events: [...payload.events, ...payload.events] }, { ...payload, events: [{ name: 'enquiry_start', path: '/services/social-media-graphics/' }] }]) assert(!validAnalyticsBatch(value));
});

test('collector rejects cross-origin, client-dashboard referers, bots, bad content type and methods before DB', async () => {
  const { collectAnalytics } = await load(); const env = environment({ prepare: () => assert.fail('Must not touch DB') });
  for (const [req, status] of [[request(payload, {}, 'GET'), 405], [request(payload, { origin: 'https://evil.example' }), 403], [request(payload, { referer: origin + '/db/' }), 403], [request(payload, { referer: 'invalid' }), 403], [request(payload, { 'sec-fetch-site': 'cross-site' }), 403], [request(payload, { 'user-agent': 'Crawler bot' }), 403], [request(payload, { 'content-type': 'text/plain' }), 415], [request({ ...payload, consent: false }), 400], [request(payload, { 'content-length': '2048' }), 413]]) assert.equal((await collectAnalytics(req, env)).status, status);
  const malformed = new Request(origin + '/api/analytics/collect', { method: 'POST', headers: { origin, referer: origin, 'content-type': 'application/json' }, body: '{' });
  assert.equal((await collectAnalytics(malformed, env)).status, 400);
});

function consentFixture({ saved = null, enabled = true, privacy = {}, storageBlocked = false } = {}) {
  const calls = [], listeners = new Map();
  const element = () => ({ children: [], listeners: new Map(), hidden: false, append(...items) { this.children.push(...items); }, setAttribute() {}, focus() {}, addEventListener(name, fn) { this.listeners.set(name, fn); } });
  const doc = { body: element(), createElement: element, addEventListener(name, fn) { listeners.set('doc:' + name, fn); }, visibilityState: 'visible' };
  const win = { location: { pathname: '/', origin }, navigator: privacy, localStorage: { getItem() { if (storageBlocked) throw Error('blocked'); return saved; }, setItem(key, value) { if (storageBlocked) throw Error('blocked'); saved = value; } }, addEventListener(name, fn) { listeners.set('win:' + name, fn); }, async fetch(url, options) { calls.push({ url, options }); return { ok: true, json: async () => ({ enabled }) }; } };
  return { win, doc, calls, listeners };
}

test('browser consent rejects privacy signals and disabled config without starting tracking', async () => {
  const { initAnalytics } = await import('../analytics-client.js');
  for (const privacy of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) {
    const fixture = consentFixture({ privacy }); assert.equal(await initAnalytics(fixture.win, fixture.doc), null); assert.equal(fixture.calls.length, 0); assert.equal(fixture.doc.body.children.length, 0);
  }
  const disabled = consentFixture({ enabled: false }); assert.equal(await initAnalytics(disabled.win, disabled.doc), null); assert.equal(disabled.calls.length, 1); assert.equal(disabled.doc.body.children.length, 0);
});

test('browser consent starts only after allowance, strips URL details and can revoke across tabs', async () => {
  const { initAnalytics } = await import('../analytics-client.js'); const f = consentFixture(); const tracker = await initAnalytics(f.win, f.doc);
  tracker.flush(); assert.equal(f.calls.length, 1);
  const box = f.doc.body.children[0], actions = box.children[2];
  actions.children[1].listeners.get('click')(); tracker.track('email_click'); tracker.flush(); assert.equal(f.calls.length, 1);
  actions.children[0].listeners.get('click')(); tracker.flush(); assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].options.referrer, origin + '/'); assert.deepEqual(JSON.parse(f.calls[1].options.body), payload);
  f.listeners.get('win:storage')({ key: 'arsc-analytics-consent-v1', newValue: null }); tracker.track('enquiry_start'); tracker.flush(); assert.equal(f.calls.length, 2);
});

test('expired preferences and unavailable storage never imply consent; saved allow can be withdrawn', async () => {
  const { initAnalytics } = await import('../analytics-client.js');
  for (const options of [{ saved: JSON.stringify({ value: 'allow', expires: 1 }) }, { storageBlocked: true }]) {
    const f = consentFixture(options); const tracker = await initAnalytics(f.win, f.doc); tracker.flush(); assert.equal(f.calls.length, 1); assert.equal(f.doc.body.children[0].hidden, false);
    f.doc.body.children[0].children[2].children[1].listeners.get('click')(); tracker.flush(); assert.equal(f.calls.length, 1);
  }
  const f = consentFixture({ saved: JSON.stringify({ value: 'allow', expires: Date.now() + 60000 }) }); const tracker = await initAnalytics(f.win, f.doc);
  assert.equal(f.doc.body.children[0].hidden, true); f.doc.body.children[0].children[2].children[1].listeners.get('click')(); tracker.flush(); assert.equal(f.calls.length, 1);
});

test('actual SQLite collector writes only aggregate counts and caps daily totals atomically', async () => {
  const { collectAnalytics, DAILY_EVENT_CAP } = await load(); const db = analyticsDb(), env = environment(db), today = new Date().toISOString().slice(0, 10);
  assert.equal((await collectAnalytics(request(), env)).status, 202);
  assert.equal((await collectAnalytics(request(), env)).status, 202);
  assert.deepEqual({ ...db.sqlite.prepare('SELECT * FROM analytics_daily').get() }, { day: today, path: '/', event: 'page_view', count: 2 });
  db.sqlite.prepare('UPDATE analytics_daily SET count = ?').run(DAILY_EVENT_CAP);
  assert.equal((await collectAnalytics(request(), env)).status, 429);
  assert.equal(db.sqlite.prepare('SELECT count FROM analytics_daily').get().count, DAILY_EVENT_CAP);
  db.sqlite.close();
});

test('quota, limiter and storage failures never leak details or make external provider calls', async () => {
  const { collectAnalytics } = await load(); const db = { prepare() { throw new Error('private-db-detail'); } };
  const limited = environment(db); limited.ANALYTICS_RATE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await collectAnalytics(request(), limited)).status, 429);
  const response = await collectAnalytics(request(), environment(db)); assert.equal(response.status, 503); assert(!((await response.text()).includes('private-db')));
});

test('daily retention and bounded reports use the real schema without any client bindings', async () => {
  const { collectAnalytics, readAnalyticsReport } = await load(); const db = analyticsDb();
  db.sqlite.prepare('INSERT INTO analytics_daily VALUES (?,?,?,?)').run('2020-01-01', '/', 'page_view', 9);
  await collectAnalytics(request(), environment(db));
  const report = await readAnalyticsReport(db, 30);
  assert.equal(report.rows.length, 1); assert.equal(report.rows[0].count, 1); assert.equal(report.timezone, 'UTC');
  assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM analytics_daily WHERE day = '2020-01-01'").get().n, 0);
  db.sqlite.close();
});

test('signed Access tokens enforce signature, expiry, issuer, audience and exact owner email', async () => {
  const { generateKeyPair, SignJWT } = await import('jose'); const { verifyAnalyticsOwner, handleAnalyticsPrivate } = await load();
  const { publicKey, privateKey } = await generateKeyPair('RS256'), env = environment(analyticsDb());
  const sign = changes => new SignJWT({ email: 'owner@example.com', ...changes }).setProtectedHeader({ alg: 'RS256' }).setIssuer('https://test-team.cloudflareaccess.com').setAudience('test-audience').setExpirationTime('5m').sign(privateKey);
  const req = token => new Request(origin + '/analytics/', { headers: { 'cf-access-jwt-assertion': token } });
  assert(await verifyAnalyticsOwner(req(await sign({})), env, publicKey));
  assert(!await verifyAnalyticsOwner(req(await sign({ email: 'stranger@example.com' })), env, publicKey));
  assert(!await verifyAnalyticsOwner(req(await sign({})), { ...env, ANALYTICS_ACCESS_AUD: 'wrong' }, publicKey));
  assert(!await verifyAnalyticsOwner(req(await sign({})), { ...env, ANALYTICS_ACCESS_TEAM: 'wrong-team' }, publicKey));
  const expired = await new SignJWT({ email: 'owner@example.com' }).setProtectedHeader({ alg: 'RS256' }).setIssuer('https://test-team.cloudflareaccess.com').setAudience('test-audience').setExpirationTime(1).sign(privateKey);
  assert(!await verifyAnalyticsOwner(req(expired), env, publicKey));
  const other = await generateKeyPair('RS256'); assert(!await verifyAnalyticsOwner(req(await sign({})), env, other.publicKey));
  assert(!await verifyAnalyticsOwner(new Request(origin + '/analytics/', { headers: { 'cf-access-authenticated-user-email': 'owner@example.com' } }), env, publicKey));
  const html = await handleAnalyticsPrivate(req(await sign({})), env, publicKey); assert.equal(html.status, 200); assert.equal(html.headers.get('cache-control'), 'no-store, private'); assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal((await handleAnalyticsPrivate(new Request(origin + '/analytics/'), env, publicKey)).status, 403);
  const token = await sign({});
  const exported = await handleAnalyticsPrivate(new Request(origin + '/analytics/export?days=30', { headers: { 'cf-access-jwt-assertion': token } }), env, publicKey);
  assert.equal(exported.status, 200); assert.equal(await exported.text(), 'day_utc,path,event,count');
  assert.equal((await handleAnalyticsPrivate(new Request(origin + '/analytics/report?days=9999', { headers: { 'cf-access-jwt-assertion': token } }), env, publicKey)).status, 400);
  env.ARSC_ANALYTICS.sqlite.close();
});

test('worker guards private routes without falling back to assets or reading client KV', async () => {
  const worker = (await import('../src/worker.js')).default;
  const env = { ASSETS: { fetch() { assert.fail('Private routes must not fall through'); } }, KAJABI_EVENTS: { get() { assert.fail('Unrelated'); } }, META_REPORTING: { get() { assert.fail('Unrelated'); } } };
  for (const path of ['/analytics', '/analytics/', '/analytics/report', '/analytics/export', '/analytics/unknown']) assert.equal((await worker.fetch(new Request(origin + path), env)).status, 403);
  const result = await worker.fetch(new Request(origin + '/samples/unchanged'), { ASSETS: { fetch: () => new Response('unchanged') } }); assert.equal(await result.text(), 'unchanged');
});

test('tracker has no frame/scroll observers or enquiry details; only marketing pages include it', () => {
  const source = fs.readFileSync('analytics-client.js', 'utf8');
  assert(!/requestAnimationFrame|MutationObserver|IntersectionObserver|addEventListener\(['"](?:scroll|wheel|touchmove|pointermove|resize)|event\.target\.value|document\.referrer|location\.search|location\.hash|userAgent/.test(source));
  assert(!/analytics-client/.test(fs.readFileSync('db/lilianasanelli/index.html', 'utf8')));
  assert.match(fs.readFileSync('enquiry-form.js', 'utf8'), /result\?\.ok === true && result\.accepted === true[\s\S]*arsc:enquiry-accepted/);
  assert.match(fs.readFileSync('.assetsignore', 'utf8'), /migrations\/\*\*/);
});

test('tracker opt-in, batching, event deduplication, revocation and silent failure', async () => {
  const { createAnalyticsTracker } = await import('../analytics-client.js'); let callback, cancelled = 0, sent = [];
  const tracker = createAnalyticsTracker({ path: '/', send: data => sent.push(data), schedule: fn => { callback = fn; return 1; }, cancel: () => cancelled++ });
  tracker.track('page_view'); tracker.flush(); assert.equal(sent.length, 0);
  tracker.allow(); tracker.track('enquiry_start'); tracker.track('enquiry_start'); tracker.track('unknown'); callback();
  assert.deepEqual(sent, [{ consent: true, events: [{ name: 'page_view', path: '/' }, { name: 'enquiry_start', path: '/' }] }]);
  tracker.track('enquiry_accepted'); tracker.deny(); tracker.flush(); assert.equal(sent.length, 1); assert(cancelled > 0);
  const failing = createAnalyticsTracker({ path: '/', send: () => { throw new Error('offline'); } }); failing.allow(); assert.doesNotThrow(() => failing.flush());
  const privateTracker = createAnalyticsTracker({ path: '/db/', send: () => assert.fail('No private-page events') }); privateTracker.allow(); privateTracker.flush();
});

test('annual dashboard charts are bounded to 30 groups and preserve all page-view totals', async () => {
  const vm = require('node:vm'), elements = new Map(); let signalLoaded;
  const loaded = new Promise(resolve => { signalLoaded = resolve; });
  const element = () => ({ children: [], style: {}, append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; }, setAttribute() {}, addEventListener() {}, set textContent(value) { this.text = value; if (value.startsWith('Updated just now')) signalLoaded(); } });
  const doc = { getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element };
  doc.getElementById('period').value = '365';
  const report = { from: '2025-10-13', to: '2026-10-12', days: 365, cap: 10000, rows: [{ day: '2026-10-12', path: '/', event: 'page_view', count: 7 }, { day: '2025-10-13', path: '/', event: 'page_view', count: 3 }] };
  vm.runInNewContext(fs.readFileSync('analytics-dashboard.js', 'utf8'), { document: doc, fetch: async () => ({ ok: true, json: async () => report }), setTimeout, clearTimeout, AbortController });
  await loaded;
  assert.equal(elements.get('page_view').text, '10');
  assert.equal(elements.get('chart').children.length, 29);
  assert.match(elements.get('range').text, /13-day groups/);
  assert.equal(elements.get('export').href, '/analytics/export?days=365');
});
