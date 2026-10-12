# ARSC enquiry form setup

Updated 12 October 2026. Status: tested form ready for the owner-authorised release. The owner confirmed the test email arrived, limited enquiry access to Nico and Caryl, and approved the 90-day manual inbox policy. Real-widget desktop/mobile tests pass; both temporary local hostnames have been removed. Separate Resend and Turnstile secrets remain encrypted in Cloudflare.

## Chosen direction

Use ARSC's existing GitHub and Cloudflare hosting, with a separate enquiry endpoint and an email notification to `admin@arservicescollective.com`. The owner requested this approach after discussing the Firefox enrolment system. Formspree setup has stopped; no Formspree account or subscription was created.

The Firefox interface has its own submission API, staff authentication, a dashboard and email delivery settings. ARSC does not need its agreements, signatures, PDFs or student records. Firefox uses Resend for email; ARSC will use a separate key, without changing Firefox data, source, credentials or settings.

The receiver uses Resend and Turnstile verification. It does not create an enquiry database or reuse existing reporting KV bindings. The receiving inbox is the record. The owner confirmed actual inbox delivery on 12 October and approved access for Nico and Caryl only. This is an operational policy, not a verified mailbox permission audit; no mailbox delegation, forwarding or account settings were changed. Cloudflare, Resend and the inbox provider process the information, so do not claim that data stays in Australia or that no provider retains any metadata. The notice reflects this setup, not Firefox's RTO privacy terms.

## Approved inbox policy

Delete closed enquiries that do not become client work from the ARSC inbox 90 days after the last correspondence. Active enquiries stay available while the conversation continues. Keep client-related messages with relevant business records for as long as needed, including any applicable recordkeeping obligation; the enquiry policy is not authority to delete contracts, invoices or dispute evidence. Spam can be deleted sooner. Nico and Caryl handle review and cleanup manually; no automatic email deletion, subscription or scheduled task was configured.

The 90-day period is ARSC's owner-approved practical choice, not a statutory retention period. Review closed enquiries regularly and avoid keeping unnecessary personal information. [OAIC information security and retention guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information). Provider metadata and backups have their own retention controls; this policy concerns ARSC's inbox records and does not promise deletion from every provider within 90 days.

Cloudflare's account screen requires a Workers Paid plan for native Email Sending. No plan was purchased. The selected alternative is Resend, where `arservicescollective.com` is already verified. Separate API keys share the team's email quota; they do not provide separate allowances. [Resend API keys](https://resend.com/docs/dashboard/api-keys/introduction), [Cloudflare Workers integration](https://resend.com/docs/send-with-cloudflare-workers).

## Completed credential setup

On 12 October 2026, the owner authorised creating and storing a separate ARSC key.

- Resend key: `ARSC Website Enquiries`, with Sending access restricted to `arservicescollective.com`.
- Storage: encrypted runtime secret `ENQUIRY_RESEND_API_KEY` in the `arsc-website` Worker, Production environment. The key value is not recorded in this guide or Git.
- Cloudflare saved version: `bdfb2797`, described as “Add secret: ENQUIRY_RESEND_API_KEY”. This version was saved, not deployed. Active version `fe697896` remained at 100% traffic.
- Firefox's Worker and key were left untouched. No billing, DNS or routing change was made.
- Turnstile widget: `ARSC Website Enquiries`, Managed mode, restricted to `arservicescollective.com`, without pre-clearance. Public sitekey: `0x4AAAAAAFUNc33Pl2bbQsZM`.
- Encrypted secret `ENQUIRY_TURNSTILE_SECRET` was saved in ARSC Production as version `f3d904de`. Public settings were saved as version `af223e57`: `ENQUIRY_TURNSTILE_SITEKEY`, `ENQUIRY_FROM=admin@arservicescollective.com`, and `ENQUIRY_ENABLED=false`. Neither version was deployed.

The Resend domain restriction controls the sending domain, not the receiving inbox. Keep the fixed recipient restriction in ARSC's server code when replacing the adapter.

## Implementation

- `index.html`, `enquiry-form.css` and `enquiry-form.js`: scoped contact-scene styling, labelled fields, inline errors, sending/accepted/failure states and email fallback. Smaller mobile padding increases usable field width.
- `enquiry-validation.js`: shared browser/server limits and supported services.
- `lib/enquiries.js`: same-origin JSON receiver, a streamed 16 KiB body limit, server validation, Turnstile hostname/action checks and fixed plain-text email delivery.
- `src/worker.js`: dispatch only `/api/enquiry/config` and `/api/enquiry`; all existing route handlers and assets remain unchanged.
- `tests/enquiry-form.test.cjs` and `tests/enquiry-api.test.cjs`: frontend state, abuse/validation, fixed-destination, failure and route-isolation regressions. Provider calls use fixtures, not real email.
- `tests/helpers/enquiry-preview.cjs`: local static preview using the real disabled configuration response. This helper cannot send email and is excluded from public assets.

The configuration endpoint exposes only enabled state and the widget's public sitekey. Delivery requires `ENQUIRY_ENABLED=true`, `ENQUIRY_RESEND_API_KEY`, `ENQUIRY_FROM`, `ENQUIRY_TURNSTILE_SITEKEY` and `ENQUIRY_TURNSTILE_SECRET`; partial setup rejects submissions. Tokens are verified with Cloudflare's Siteverify API before email sending, including hostname and the `enquiry` action. No visitor email or message is sent to Siteverify, logged by this code, put in URLs, or written to browser storage. [Mandatory server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

The sender and inbox are fixed by server configuration; visitors cannot select recipients or inject HTML email/header content. The visitor's validated email becomes the reply address. Email-service acceptance is distinct from confirmed inbox arrival: the form says “accepted for delivery”, not “delivered”. It suppresses requests while sending and repeated activation after acceptance, retains details on failure and never retries automatically. This is not durable exactly-once delivery; an uncertain network outcome followed by a manual resend could duplicate a message.

## Cloudflare activation

Cloudflare and Resend are signed in, and the dedicated key is saved as described above. The form is not ready to receive enquiries yet. Do not paste passwords or key values into chat.

1. Inspect the existing website Worker and email-domain configuration. Keep existing DNS, mailbox routing, client-reporting bindings and cron jobs intact. Do not enable Email Routing by replacing an existing mailbox provider's MX records. If native sending requires a disruptive mail change or paid setup, stop and agree an alternative before making it.
2. The Resend adapter and fixed ARSC sender/inbox are configured. Do not add a native `ENQUIRY_EMAIL` binding or change Firefox's key. Public enquiry settings are declared in wrangler.jsonc; keep_vars preserves other dashboard variables. Secret values remain encrypted and are never declared in the file.
3. The separate Turnstile widget and encrypted secret are configured. The owner authorised temporary localhost and 127.0.0.1 testing; successful real-widget desktop/mobile checks are complete and both hosts have been removed. Only arservicescollective.com remains permitted. Public preview URLs remain disabled. Never reuse Firefox's staff password or unrelated client secrets.
4. Review the draft notice and agree inbox access/retention. Add any further privacy detail needed for the actual provider setup. This guide is not a legal compliance certification.
5. Keep delivery disabled until configuration, real-widget checks, inbox verification and publication are authorized. The saved secret version is not an active deployment. Preserve the dedicated secret when publishing the scoped form changes; keep unrelated Worker configuration intact.

## Release checks

- Recheck desktop/mobile and Less motion with the real widget. Local preview checks now cover desktop validation and 390/320-width field fit, with mobile button feedback checked in Less motion mode. The earlier localhost block was resolved by using the available Codex preview panel and correcting the helper's root path. Disabled-preview checks are not a substitute for testing the configured widget or physical-device gestures.
- Verify expiry/replay, blocked widget, offline/network failure, quota/rejection, server validation and sending/accepted messages. Automated fixtures cover these response paths, not actual provider readiness.
- The authorised dummy enquiry is reported delivered by Resend; confirm its visibility in the receiving inbox before release. Disable delivery immediately if verification fails; keep native email available. Do not resend the same dummy message unnecessarily.
- Publish only the scoped form changes through the existing GitHub/Cloudflare workflow. Do not include unrelated files, change Firefox settings or modify client data.
- Recheck the deployed phone layout and cinematic transitions. Confirm the live page contains the approved privacy explanation and no draft-only messaging when enabled.

Local integration checks on 12 October 2026: all 19 focused form/API tests and all 158 repository tests pass. Resend HTTP fixtures cover the fixed inbox, plain-text payload, validated reply address, secret isolation, failed verification, malformed provider responses, rejection, quota limits and network failure without automatic retries. The enabled form's privacy explanation names Resend.

## Real service checks

The authorised temporary remote test used the actual `lib/enquiries.js` adapter and ARSC's encrypted runtime key without exporting either secret. Its successful security result was a fixture, not a real browser Turnstile token. The initial send failed before an outbound request because Workers do not support `redirect: 'error'`. Both server fetch calls now use `redirect: 'manual'` and reject non-success responses; tests cover redirects. The corrected test returned HTTP 202. Its fixed test idempotency key prevented duplicate provider sends.

Resend reports `[TEST — please ignore] ARSC enquiry — I'm not sure yet` delivered to `admin@arservicescollective.com`, email ID `01a12dd3-318c-775b-8c3f-49812847e194`. The name, business, message and reply address were fictional and clearly labelled. Proof: `D:/Work/ARSC/previews/arsc-dummy-enquiry-delivered.jpg`. This verifies provider-reported delivery, not a human inbox review.

A separate live Siteverify call using the real ARSC Turnstile secret rejected a deliberately invalid token with `invalid-input-response`, not an invalid-secret error. The temporary server was stopped and its test-only entry point/configuration removed; no test bypass is in production code.

## Desktop and mobile security checks

The owner authorised temporarily allowing localhost and 127.0.0.1 and completing the challenge checkboxes. Real Managed widgets issued browser tokens at desktop 1440 by 1000 and mobile 390 by 844 and 320 by 640. The actual Siteverify service accepted the local hostnames with action enquiry. Safe QA receipts confirmed HTTP 202 and valid verification for localhost and 127.0.0.1; the form showed accepted status and disabled repeated submission. No additional email was sent.

The isolated QA entrypoint checked the real local hostname/action before mapping the verified hostname and request origin to the canonical values required by the production adapter. Only its Resend response was a fixture. This tests browser security and form acceptance, not a live production-origin submission; actual provider delivery was verified separately above. Production origin and hostname restrictions were not relaxed.

Mobile QA caught a widget overflow: flexible Turnstile has a 300px minimum, wider than narrow form panels. The frontend now selects compact below 300px and recreates the widget only when resizing crosses that boundary. The desktop widget remains flexible. No horizontal page overflow was observed at the tested widths. A sizing regression was added; all 20 focused tests and all 159 repository tests pass. Physical device gestures and orientation testing remain separate follow-up checks.

Both temporary hosts were removed and Cloudflare returned to one allowed hostname, arservicescollective.com. Both owned servers were stopped, temporary entrypoint/configuration and proxy code were removed, and no secrets were written to source. Firefox, production traffic, DNS and billing are unchanged. Evidence: D:/Work/ARSC/previews/arsc-enquiry-desktop-qa.jpg, arsc-enquiry-mobile-qa.jpg and arsc-local-hosts-removed.jpg in the same directory.

Inbox review and policy approval are complete. Publication and final production checks are the remaining milestone 3 steps. Roll back to the prior release or set ENQUIRY_ENABLED=false if delivery verification fails; keep direct email available.
