import { ENQUIRY_FIELDS, validateEnquiry } from './enquiry-validation.js';
export { ENQUIRY_SERVICES, validateEnquiry } from './enquiry-validation.js';

export const enquiryWidgetSize = width => width >= 300 ? 'flexible' : 'compact';

// Delivery remains off unless the same-origin receiver reports complete setup.
export function initEnquiryPreview(form, { send = null, getToken = () => '', resetToken = () => {} } = {}) {
  if (!form) return null;
  const fieldset = form.querySelector('fieldset');
  const button = form.querySelector('.enquiry-check');
  const status = form.querySelector('.enquiry-status');
  const keys = ENQUIRY_FIELDS;
  const fields = Object.fromEntries(keys.map(key => [key, form.querySelector(`[name="${key}"]`)]));
  if (!fieldset || !button || !status || keys.some(key => !fields[key])) return null;
  const errorNodes = Object.fromEntries(keys.map(key => [key, form.querySelector(`[data-error-for="${key}"]`)]));
  if (keys.some(key => !errorNodes[key])) return null;
  let busy = false, destroyed = false, accepted = false;
  const readValues = () => Object.fromEntries(keys.map(key => [key, fields[key].value]));
  const renderError = (key, message) => {
    errorNodes[key].textContent = message || '';
    errorNodes[key].hidden = !message;
    if (message) fields[key].setAttribute('aria-invalid', 'true');
    else fields[key].removeAttribute('aria-invalid');
  };
  const announce = (message, focus = false) => {
    status.textContent = message;
    status.hidden = false;
    if (focus) status.focus();
  };
  const idleLabel = send ? 'Send enquiry →' : 'Check details →';
  const check = async event => {
    event.preventDefault();
    if (busy || destroyed || accepted) return;
    const { values, errors } = validateEnquiry(readValues());
    keys.forEach(key => renderError(key, errors[key]));
    const firstInvalid = keys.find(key => errors[key]);
    if (firstInvalid) {
      announce('Please check the highlighted details. Nothing has been sent.');
      fields[firstInvalid].focus();
      return;
    }
    if (!send) return announce('Details checked. This is a preview—nothing has been sent. Use the email link for now.', true);
    let token;
    try { token = getToken(); }
    catch { return announce('The security check is unavailable. Please use the email link.', true); }
    if (!token) return announce('Please complete the security check before sending. You can also use the email link.', true);
    busy = true;
    fieldset.disabled = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    announce('Sending your enquiry…');
    try {
      const result = await send({ ...values, token });
      if (destroyed) return;
      if (result?.ok === true && result.accepted === true) {
        accepted = true;
        announce('Thanks—your enquiry has been accepted for delivery to ARSC. Your email address lets us reply.', true);
      } else {
        const serverErrors = result?.errors || {};
        keys.forEach(key => renderError(key, typeof serverErrors[key] === 'string' ? serverErrors[key] : ''));
        announce(result?.status === 429 ? 'Too many requests right now. Please wait a little or use the email link. Your details are still here.'
          : result?.status === 400 ? 'Please check your details and complete a fresh security check. Your details are still here.'
          : 'We could not confirm delivery. Your details are still here; please use the email link if needed. We have not retried automatically.', true);
      }
    } catch {
      if (!destroyed) announce('We could not confirm whether your enquiry was accepted. Your details are still here. Please check your connection or use the email link; resending could send a duplicate.', true);
    } finally {
      busy = false;
      if (!destroyed) {
        fieldset.disabled = false;
        button.disabled = accepted;
        button.textContent = accepted ? 'Enquiry accepted ✓' : idleLabel;
        form.removeAttribute('aria-busy');
        // Widget cleanup must not turn an accepted enquiry into an error.
        try { resetToken(); } catch { /* A fresh check is required before another send. */ }
      }
    }
  };
  const edit = event => {
    const key = event.target?.name;
    if (!keys.includes(key) || busy) return;
    const { errors } = validateEnquiry(readValues());
    if (!errors[key]) renderError(key);
    accepted = false;
    button.disabled = false;
    button.textContent = idleLabel;
    status.hidden = true;
  };
  fieldset.disabled = false;
  button.disabled = false;
  button.textContent = idleLabel;
  button.addEventListener('click', check);
  form.addEventListener('submit', check);
  form.addEventListener('input', edit);
  form.addEventListener('change', edit);
  return { destroy() {
    destroyed = true;
    button.removeEventListener('click', check);
    form.removeEventListener('submit', check);
    form.removeEventListener('input', edit);
    form.removeEventListener('change', edit);
    form.removeAttribute('aria-busy');
    fieldset.disabled = true;
    button.disabled = true;
  } };
}

export async function postEnquiry(payload, fetcher = fetch) {
  const response = await fetcher('/api/enquiry', {
    method: 'POST', credentials: 'same-origin', redirect: 'error',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(20000)
  });
  const result = await response.json();
  return { ...result, ok: response.ok && result.ok === true, status: response.status };
}

async function enableConfiguredForm(form) {
  if (!form) return;
  let config;
  try {
    const response = await fetch('/api/enquiry/config', { credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Not configured');
    config = await response.json();
  } catch { return initEnquiryPreview(form); }
  if (config?.enabled !== true || typeof config.sitekey !== 'string' || !config.sitekey) return initEnquiryPreview(form);
  const note = form.querySelector('.enquiry-preview-note'), safety = document.getElementById('enquiry-safety-note');
  const widget = form.querySelector('.enquiry-security');
  if (!widget || !note || !safety) return;
  note.textContent = 'Send a quick overview. We’ll use your details to respond to this enquiry—not sign you up for marketing.';
  note.classList.add('enquiry-live-note');
  safety.textContent = 'Your details are emailed to ARSC through Resend. Cloudflare hosts the form and processes the security check; no separate enquiry database is created. Please don’t include passwords, payment details or confidential client information.';
  widget.hidden = false;
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.addEventListener('load', () => {
    try {
      let id, size;
      const renderWidget = () => {
        // Recreate only when crossing the size boundary, including orientation changes.
        const nextSize = enquiryWidgetSize(widget.getBoundingClientRect().width);
        if (id !== undefined && size === nextSize) return;
        if (id !== undefined) window.turnstile.remove(id);
        size = nextSize;
        id = window.turnstile.render(widget, {
          sitekey: config.sitekey, action: 'enquiry', theme: 'dark', size,
          'error-callback': () => { note.textContent = 'The security check could not load. Please use the email link below.'; },
          'expired-callback': () => window.turnstile.reset(id)
        });
      };
      renderWidget();
      initEnquiryPreview(form, { send: postEnquiry, getToken: () => window.turnstile.getResponse(id), resetToken: () => window.turnstile.reset(id) });
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => {
        try { renderWidget(); }
        catch { note.textContent = 'The security check is unavailable. Please use the email link below.'; }
      }).observe(widget);
    } catch { note.textContent = 'The security check is unavailable. Please use the email link below.'; }
  }, { once: true });
  script.addEventListener('error', () => { note.textContent = 'The security check is unavailable. Please use the email link below.'; }, { once: true });
  document.head.append(script);
}

if (typeof document !== 'undefined') void enableConfiguredForm(document.getElementById('enquiry-form'));
