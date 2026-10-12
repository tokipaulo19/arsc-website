import { ENQUIRY_SERVICE_LABELS, validateEnquiry } from '../enquiry-validation.js';

const ORIGIN = 'https://arservicescollective.com';
const RECIPIENT = 'admin@arservicescollective.com';
const MAX_BYTES = 16 * 1024;
const reply = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
});
const configured = env => env.ENQUIRY_ENABLED === 'true'
  && typeof env.ENQUIRY_RESEND_API_KEY === 'string' && !!env.ENQUIRY_RESEND_API_KEY.trim()
  && /^[^\s@]+@arservicescollective\.com$/.test(env.ENQUIRY_FROM || '')
  && typeof env.ENQUIRY_TURNSTILE_SITEKEY === 'string' && !!env.ENQUIRY_TURNSTILE_SITEKEY
  && typeof env.ENQUIRY_TURNSTILE_SECRET === 'string' && !!env.ENQUIRY_TURNSTILE_SECRET;

export function enquiryConfig(request, env) {
  if (request.method !== 'GET') return reply({ ok: false }, 405, { Allow: 'GET' });
  // Only the widget's public key is returned; never a sender secret or token.
  return reply(configured(env) ? { enabled: true, sitekey: env.ENQUIRY_TURNSTILE_SITEKEY } : { enabled: false });
}

async function readBoundedJson(request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) throw new RangeError('Body too large');
  if (!request.body) return null;
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new RangeError('Body too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function handleEnquiry(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return reply({ ok: false, error: 'Method not allowed' }, 405, { Allow: 'POST' });
  if (!configured(env)) return reply({ ok: false, error: 'Email enquiries are not configured. Please use direct email.' }, 503);
  if (request.headers.get('origin') !== ORIGIN || new URL(request.url).origin !== ORIGIN) return reply({ ok: false, error: 'Origin not allowed' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({ ok: false, error: 'Use JSON' }, 415);
  let input;
  try { input = await readBoundedJson(request); }
  catch (error) { return reply({ ok: false, error: error instanceof RangeError ? 'Message too large' : 'Invalid request' }, error instanceof RangeError ? 413 : 400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ ok: false, error: 'Invalid request' }, 400);
  const { values, errors } = validateEnquiry(input);
  if (Object.keys(errors).length) return reply({ ok: false, errors }, 400);
  if (typeof input.token !== 'string' || !input.token || input.token.length > 2048) return reply({ ok: false, error: 'Security check required' }, 400);
  let verified;
  try {
    const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.ENQUIRY_TURNSTILE_SECRET, response: input.token }), signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('Unavailable');
    verified = await response.json();
  } catch { return reply({ ok: false, error: 'Security check unavailable' }, 503); }
  if (verified?.success !== true || verified.hostname !== 'arservicescollective.com' || verified.action !== 'enquiry') return reply({ ok: false, error: 'Please complete a fresh security check' }, 400);
  try {
    // Fixed destination, fixed verified sender, plain text. Visitors cannot
    // select recipients, inject email headers, or send client credentials.
    const response = await fetcher('https://api.resend.com/emails', {
      // Workers support manual/follow, not the browser's redirect:error mode.
      // Manual keeps credentials on this host; non-2xx responses reject below.
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(8000),
      headers: { Authorization: `Bearer ${env.ENQUIRY_RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `ARSC Website <${env.ENQUIRY_FROM}>`, to: [RECIPIENT], reply_to: values.email,
        subject: `ARSC enquiry — ${ENQUIRY_SERVICE_LABELS[values.support]}`,
        text: `New website enquiry\n\nName: ${values.name}\nEmail: ${values.email}\nBusiness: ${values.business || 'Not supplied'}\nSupport: ${ENQUIRY_SERVICE_LABELS[values.support]}\n\n${values.message}\n\nSent through the ARSC website. No marketing subscription was created.`
      })
    });
    if (response.status === 429) return reply({ ok: false, error: 'Please try later or use direct email' }, 429);
    if (!response.ok) return reply({ ok: false, error: 'Delivery could not be confirmed' }, 502);
    const result = await response.json();
    if (typeof result?.id !== 'string' || !result.id.trim()) return reply({ ok: false, error: 'Delivery could not be confirmed' }, 502);
    return reply({ ok: true, accepted: true }, 202);
  } catch {
    // Never expose provider responses, credentials or visitor details; no retries.
    return reply({ ok: false, error: 'Delivery could not be confirmed' }, 502);
  }
}
