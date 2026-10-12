const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const load = () => import('../lib/enquiries.js');
const origin = 'https://arservicescollective.com';
const valid = { name: 'Example Owner', email: 'owner@example.com', business: '', support: 'not-sure', message: 'Help with content.', token: 'test-token' };
const env = () => ({ ENQUIRY_ENABLED: 'true', ENQUIRY_RESEND_API_KEY: 'test-resend-private-key', ENQUIRY_FROM: 'admin@arservicescollective.com', ENQUIRY_TURNSTILE_SITEKEY: 'test-public-key', ENQUIRY_TURNSTILE_SECRET: 'test-private-key' });
const req = (payload = valid, options = {}) => new Request(origin + '/api/enquiry', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers }, body: JSON.stringify(payload) });
const verify = async () => Response.json({ success: true, hostname: 'arservicescollective.com', action: 'enquiry' });

test('configuration is off by default and exposes only a public sitekey when completely configured', async () => {
  const { enquiryConfig } = await load(), request = new Request(origin + '/api/enquiry/config');
  assert.deepEqual(await enquiryConfig(request, {}).json(), { enabled: false });
  for (const key of Object.keys(env())) {
    const partial = env(); delete partial[key];
    assert.deepEqual(await enquiryConfig(request, partial).json(), { enabled: false });
  }
  const response = enquiryConfig(request, env());
  assert.deepEqual(await response.json(), { enabled: true, sitekey: 'test-public-key' });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(enquiryConfig(new Request(request, { method: 'POST' }), env()).status, 405);
});

test('method, incomplete setup, origin and content type reject before outbound calls', async () => {
  const { handleEnquiry } = await load();
  const noFetch = async () => assert.fail('Must not call verification');
  assert.equal((await handleEnquiry(new Request(origin + '/api/enquiry'), env(), noFetch)).status, 405);
  assert.equal((await handleEnquiry(req(), {}, noFetch)).status, 503);
  assert.equal((await handleEnquiry(req(valid, { headers: { Origin: 'https://evil.example' } }), env(), noFetch)).status, 403);
  assert.equal((await handleEnquiry(req(valid, { headers: { Origin: '' } }), env(), noFetch)).status, 403);
  assert.equal((await handleEnquiry(req(valid, { headers: { 'Content-Type': 'text/plain' } }), env(), noFetch)).status, 415);
});

test('server revalidates required fields, limits and service values without trusting the browser', async () => {
  const { handleEnquiry } = await load();
  for (const [key, value] of [['name', ''], ['email', 'a@b.com\r\nBcc: evil@example.com'], ['business', 'a'.repeat(161)], ['support', '__proto__'], ['message', 'x'.repeat(2001)]]) {
    const response = await handleEnquiry(req({ ...valid, [key]: value }), env(), async () => assert.fail('No verification for invalid fields'));
    assert.equal(response.status, 400);
    assert((await response.json()).errors[key]);
  }
  for (const payload of [null, [], 'text']) assert.equal((await handleEnquiry(req(payload), env())).status, 400);
  const broken = new Request(origin + '/api/enquiry', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{' });
  assert.equal((await handleEnquiry(broken, env())).status, 400);
});

test('large bodies are rejected by declared and actual streamed byte counts', async () => {
  const { handleEnquiry } = await load();
  assert.equal((await handleEnquiry(req(valid, { headers: { 'Content-Length': '17000' } }), env())).status, 413);
  assert.equal((await handleEnquiry(req({ ...valid, extra: '界'.repeat(6000) }), env())).status, 413);
});

test('security tokens must validate once for the correct hostname and action', async () => {
  const { handleEnquiry } = await load();
  for (const token of ['', 3, 'x'.repeat(2049)]) assert.equal((await handleEnquiry(req({ ...valid, token }), env(), async () => assert.fail('Invalid token'))).status, 400);
  for (const result of [null, { success: false }, { success: true, hostname: 'evil.example', action: 'enquiry' }, { success: true, hostname: 'arservicescollective.com', action: 'login' }]) {
    let calls = 0;
    assert.equal((await handleEnquiry(req(), env(), async url => {
      calls++;
      assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
      return Response.json(result);
    })).status, 400);
    assert.equal(calls, 1);
  }
});

test('accepted enquiries use a fixed inbox, plain text and validated reply address with no database writes', async () => {
  const { handleEnquiry } = await load();
  let emails = 0;
  const config = env();
  const response = await handleEnquiry(req({ ...valid, to: 'evil@example.com', extra: 'private-extra' }), config, async (url, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'manual');
    assert(options.signal instanceof AbortSignal);
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      assert.deepEqual(JSON.parse(options.body), { secret: 'test-private-key', response: 'test-token' });
      return verify();
    }
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer test-resend-private-key');
    assert.equal(options.headers['Content-Type'], 'application/json');
    emails++;
    const message = JSON.parse(options.body);
    assert.deepEqual(message.to, ['admin@arservicescollective.com']);
    assert.equal(message.reply_to, 'owner@example.com');
    assert.equal(message.from, 'ARSC Website <admin@arservicescollective.com>');
    assert(!message.html);
    assert(!message.cc && !message.bcc && !message.headers && !message.attachments);
    assert.match(message.text, /Example Owner/);
    assert(!message.text.includes('private-extra'));
    return Response.json({ id: 'test-message' });
  });
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true, accepted: true });
  assert.equal(emails, 1);
  assert(!/console\.|\.put\(|\.insert\(|\.prepare\(/.test(readFileSync(require('node:path').join(__dirname, '../lib/enquiries.js'), 'utf8')));
});

test('verification failure and email rejection never report success or expose provider errors', async () => {
  const { handleEnquiry } = await load();
  for (const fetcher of [async () => { throw new Error('network'); }, async () => new Response('bad', { status: 503 }), async () => new Response('not-json')]) {
    assert.equal((await handleEnquiry(req(), env(), fetcher)).status, 503);
  }
  for (const status of [301, 302, 307, 400, 401, 403, 429, 500, 503]) {
    let emails = 0;
    const response = await handleEnquiry(req(), env(), async url => {
      if (url.includes('siteverify')) return verify();
      emails++;
      return Response.json({ message: 'private-provider-details', id: 'misleading-id' }, { status });
    });
    assert.equal(response.status, status === 429 ? 429 : 502);
    assert(!(await response.text()).includes('private-provider-details'));
    assert.equal(emails, 1, 'No automatic retries');
  }
  for (const provider of [async () => { throw new Error('private-provider-details'); }, async () => new Response('not-json'), async () => Response.json({}), async () => Response.json({ id: '' })]) {
    const response = await handleEnquiry(req(), env(), url => url.includes('siteverify') ? verify() : provider());
    assert.equal(response.status, 502);
    assert(!(await response.text()).includes('private-provider-details'));
  }
});

test('invalid sender or blank secrets disable delivery without exposing private configuration', async () => {
  const { enquiryConfig, handleEnquiry } = await load();
  for (const extra of [{ ENQUIRY_FROM: 'sender@evil.example' }, { ENQUIRY_FROM: 'admin@arservicescollective.com\r\nBcc: evil@example.com' }, { ENQUIRY_RESEND_API_KEY: ' ' }]) {
    const config = { ...env(), ...extra };
    assert.deepEqual(await enquiryConfig(new Request(origin + '/api/enquiry/config'), config).json(), { enabled: false });
    assert.equal((await handleEnquiry(req(), config, async () => assert.fail('No external call'))).status, 503);
  }
});

test('only new exact enquiry paths are intercepted; Firefox and existing asset routing stay unchanged', async () => {
  const worker = (await import('../src/worker.js')).default;
  let assets = 0;
  const config = { ASSETS: { fetch: async () => { assets++; return new Response('asset'); } } };
  assert.deepEqual(await (await worker.fetch(new Request(origin + '/api/enquiry/config'), config)).json(), { enabled: false });
  assert.equal((await worker.fetch(new Request(origin + '/api/enquiry', { method: 'POST' }), config)).status, 503);
  for (const path of ['/forms/firefox/enrollmentform/admin', '/firefoxtraining/db/', '/services/social-media-graphics/', '/api/enquiry-other']) assert.equal(await (await worker.fetch(new Request(origin + path), config)).text(), 'asset');
  assert.equal(assets, 4);
});
