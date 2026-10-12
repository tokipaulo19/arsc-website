const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const load = () => import('../enquiry-form.js');
const valid = { name: 'Example Owner', email: 'owner@example.com', business: '', support: 'not-sure', message: 'Please help with social content.' };

test('narrow form panels use the compact widget below its flexible 300px minimum', async () => {
  const { enquiryWidgetSize } = await load();
  for (const width of [0, 144, 175, 245, 299.9]) assert.equal(enquiryWidgetSize(width), 'compact');
  for (const width of [300, 400, 600]) assert.equal(enquiryWidgetSize(width), 'flexible');
});

test('validation trims input, allows optional business and uncertain service, and returns only intended fields', async () => {
  const { validateEnquiry, ENQUIRY_SERVICES } = await load();
  const result = validateEnquiry({ ...valid, name: '  Zoë O’Brien  ', token: 'not retained', message: ' Help please. ' });
  assert.deepEqual(result.errors, {});
  assert.equal(result.values.name, 'Zoë O’Brien');
  assert.equal(result.values.message, 'Help please.');
  assert(!('token' in result.values));
  for (const support of ENQUIRY_SERVICES) assert.deepEqual(validateEnquiry({ ...valid, support }).errors, {});
});

test('required fields, invalid types, unknown services and explicit limits are validated', async () => {
  const { validateEnquiry } = await load();
  assert.deepEqual(Object.keys(validateEnquiry(null).errors), ['name', 'email', 'support', 'message']);
  for (const [key, value] of [['name', ' '.repeat(3)], ['email', 'not-an-email'], ['support', 'other'], ['message', 5], ['name', 'n'.repeat(101)], ['business', 'b'.repeat(161)], ['email', 'e'.repeat(250) + '@example.com'], ['message', 'm'.repeat(2001)]]) {
    assert(validateEnquiry({ ...valid, [key]: value }).errors[key], `${key} must reject the invalid value`);
  }
  assert.deepEqual(validateEnquiry({ ...valid, name: 'n'.repeat(100), business: 'b'.repeat(160), message: 'm'.repeat(2000) }).errors, {});
});

function fixture(values = valid) {
  const nodes = {}, handlers = {}, buttonHandlers = {};
  for (const key of ['name', 'email', 'business', 'support', 'message']) {
    nodes[key] = { name: key, value: values[key] || '', attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, focus() { this.focused = true; } };
    nodes[`${key}-error`] = { textContent: '', hidden: true };
  }
  const fieldset = { disabled: true }, status = { hidden: true, focus() { this.focused = true; } };
  const button = { disabled: true, addEventListener(k, fn) { buttonHandlers[k] = fn; }, removeEventListener(k) { delete buttonHandlers[k]; } };
  const form = { attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, querySelector(selector) {
    if (selector === 'fieldset') return fieldset;
    if (selector === '.enquiry-check') return button;
    if (selector === '.enquiry-status') return status;
    const field = selector.match(/\[name="([^"]+)"\]/)?.[1];
    const error = selector.match(/\[data-error-for="([^"]+)"\]/)?.[1];
    return nodes[field || `${error}-error`];
  }, addEventListener(k, fn) { handlers[k] = fn; }, removeEventListener(k) { delete handlers[k]; } };
  return { form, nodes, fieldset, status, button, handlers, click() { const event = { prevented: false, preventDefault() { this.prevented = true; } }; event.completion = buttonHandlers.click(event); return event; } };
}

test('checking a valid preview reports no delivery, retains entries and does not submit', async () => {
  const { initEnquiryPreview } = await load(), f = fixture();
  const controller = initEnquiryPreview(f.form);
  assert(!f.fieldset.disabled && !f.button.disabled);
  assert(f.click().prevented);
  assert.match(f.status.textContent, /nothing has been sent/);
  assert(f.status.focused);
  assert.equal(f.nodes.message.value, valid.message);
  const submit = { preventDefault() { this.prevented = true; } };
  f.handlers.submit(submit);
  assert(submit.prevented);
  controller.destroy();
  assert(f.fieldset.disabled && f.button.disabled);
  assert.deepEqual(Object.keys(f.handlers), []);
});

test('errors are linked to fields, focus the first invalid entry, and clear without losing edited input', async () => {
  const { initEnquiryPreview } = await load(), f = fixture({ ...valid, name: '', email: '' });
  initEnquiryPreview(f.form);
  f.click();
  assert(f.nodes.name.focused);
  assert.equal(f.nodes.email.attributes['aria-invalid'], 'true');
  assert(!f.nodes['email-error'].hidden);
  f.nodes.email.value = valid.email;
  f.handlers.input({ target: f.nodes.email });
  assert(f.nodes['email-error'].hidden);
  assert(!('aria-invalid' in f.nodes.email.attributes));
  assert(f.status.hidden);
  assert.equal(f.nodes.email.value, valid.email);
});

test('unconfigured markup is safe without JavaScript and delivery uses only the same-origin receiver', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const form = html.match(/<form id="enquiry-form"[\s\S]*?<\/form>/)[0];
  const source = fs.readFileSync(path.join(root, 'enquiry-form.js'), 'utf8');
  assert.match(form, /<fieldset disabled>/);
  assert.match(form, /type="button" disabled>Check details/);
  assert(!/type="submit"|action=|https:\/\/formspree/.test(form));
  assert.match(form, /Loading the enquiry form/);
  assert(!/localStorage|sessionStorage|sendBeacon|console\.|\.submit\s*\(|location\./.test(source));
  assert.match(source, /fetcher\('\/api\/enquiry'/);
  assert.match(source, /fetch\('\/api\/enquiry\/config'/);
  assert(source.includes('config?.enabled !== true'));
  assert(html.includes('mailto:admin@arservicescollective.com?subject=ARSC%20Enquiry'));
  assert.match(html, /type="module" src="enquiry-form.js/);
  for (const key of ['name', 'email', 'business', 'support', 'message']) {
    assert(form.includes(`for="enquiry-${key}"`));
    assert(form.includes(`id="enquiry-${key}-error"`));
  }
});

test('published notice records owner-approved enquiry access and manual inbox retention without an automatic purge', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /Enquiries are handled by Nico and Caryl/);
  assert.match(html, /90 days after the last correspondence/);
  assert.match(html, /Client-related messages are kept with the relevant business records/);
  const config = JSON.parse(fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.vars.ENQUIRY_ENABLED, 'true');
  assert.equal(config.keep_vars, true);
  assert(!Object.keys(config.vars).some(key => /SECRET|API_KEY/.test(key)));
});

test('configured sending suppresses in-flight and repeated-success activation', async () => {
  const { initEnquiryPreview } = await load(), f = fixture();
  let finish, calls = 0, resets = 0;
  initEnquiryPreview(f.form, { getToken: () => 'test-token', resetToken: () => resets++, send: payload => {
    calls++;
    assert.equal(payload.token, 'test-token');
    return new Promise(resolve => { finish = resolve; });
  } });
  const first = f.click();
  assert(f.fieldset.disabled && f.button.disabled);
  assert.equal(f.form.attributes['aria-busy'], 'true');
  await f.click().completion;
  assert.equal(calls, 1);
  finish({ ok: true, accepted: true });
  await first.completion;
  assert.match(f.status.textContent, /accepted for delivery/);
  assert(!f.fieldset.disabled && f.button.disabled);
  assert.equal(resets, 1);
  await f.click().completion;
  assert.equal(calls, 1);
  assert.equal(f.nodes.message.value, valid.message);
});

test('delivery requires a token and does not claim success for ambiguous, rejected or offline responses', async () => {
  const { initEnquiryPreview } = await load();
  const missing = fixture();
  let calls = 0;
  initEnquiryPreview(missing.form, { send: async () => { calls++; } });
  await missing.click().completion;
  assert.equal(calls, 0);
  assert.match(missing.status.textContent, /security check/);
  for (const result of [{ ok: true }, { ok: false, status: 429 }, { ok: false, status: 400, errors: { email: 'Check email' } }, { ok: false, status: 502 }, null]) {
    const f = fixture();
    initEnquiryPreview(f.form, { getToken: () => 'token', send: async () => result });
    await f.click().completion;
    assert(!/Thanks/.test(f.status.textContent));
    assert.equal(f.nodes.email.value, valid.email);
    assert(!f.button.disabled && !f.fieldset.disabled);
    assert(!f.form.attributes['aria-busy']);
  }
  const offline = fixture();
  initEnquiryPreview(offline.form, { getToken: () => 'token', send: async () => { throw new Error('offline'); } });
  await offline.click().completion;
  assert.match(offline.status.textContent, /resending could send a duplicate/);
  assert(!offline.button.disabled);
});

test('the network adapter sends JSON only to the ARSC endpoint and respects HTTP rejection', async () => {
  const { postEnquiry } = await load();
  const result = await postEnquiry(valid, async (url, options) => {
    assert.equal(url, '/api/enquiry');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(JSON.parse(options.body), valid);
    return new Response(JSON.stringify({ ok: true, accepted: true }), { status: 429 });
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 429);
});

test('unavailable widget methods fail safely without losing an accepted status', async () => {
  const { initEnquiryPreview } = await load();
  const unavailable = fixture();
  let calls = 0;
  initEnquiryPreview(unavailable.form, { getToken: () => { throw new Error('widget removed'); }, send: async () => { calls++; } });
  await unavailable.click().completion;
  assert.equal(calls, 0);
  assert.match(unavailable.status.textContent, /security check is unavailable/);
  const accepted = fixture();
  initEnquiryPreview(accepted.form, { getToken: () => 'token', send: async () => ({ ok: true, accepted: true }), resetToken: () => { throw new Error('widget removed'); } });
  await accepted.click().completion;
  assert.match(accepted.status.textContent, /accepted for delivery/);
  assert(accepted.button.disabled && !accepted.fieldset.disabled);
  assert(!accepted.form.attributes['aria-busy']);
});

test('destroying an in-flight form leaves it disabled and ignores a late response', async () => {
  const { initEnquiryPreview } = await load(), f = fixture();
  let finish, resets = 0;
  const controller = initEnquiryPreview(f.form, { getToken: () => 'token', resetToken: () => resets++, send: () => new Promise(resolve => { finish = resolve; }) });
  const first = f.click();
  controller.destroy();
  finish({ ok: true, accepted: true });
  await first.completion;
  assert(f.button.disabled && f.fieldset.disabled);
  assert(!/Thanks/.test(f.status.textContent));
  assert.equal(resets, 0);
  assert(!f.form.attributes['aria-busy']);
});
