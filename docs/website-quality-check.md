# ARSC website quality record

Checked 12 October 2026. Base release `26111da` and six-website extension `a311a0f` are live and verified. Existing unrelated portfolio work was excluded from both releases' changes. This verification receipt was updated locally after deployment.

## Completed checks

- `npm test`: 157 tests passed, zero failed, after the custom enquiry implementation; the previous published showcase run had 139. This includes backend, portfolio and homepage regressions; unrelated tests were run but their source was not edited or staged for this task. Other work in the shared checkout can change the overall count.
- JavaScript syntax: the prior motion/showcase sources passed; latest checks also passed for `enquiry-form.js`, `enquiry-validation.js`, `lib/enquiries.js` and `src/worker.js`. Scoped tracked diff whitespace checks passed; Git reported only expected LF/CRLF notices.
- Logo routes: automated forward/reverse tests verify every chapter boundary and exact opening handoff. Settled chapters no longer use a central logo dock. A side-to-side transit naturally crosses the centre; it does not stop or reset there.
- Galleries: sustained wheel updates and continued finger movement update fractional progress before the selected image finishes moving. Reverse input and partial-progress resize are covered in fixtures. Browser checks at 1440 by 1000 and 390 by 844 confirm continued movement, client/caption changes and no horizontal overflow. Caption selection does not reposition the artwork or resize the caption track.
- Chapter layouts: six chapter destinations checked at 1440 by 1000 and 320 by 640. No horizontal overflow or failed completed image loads were found. Compact service cards retain reading stops and 44px-high detail links.
- Service pages: all three direct paths rendered at widths 320, 390 and 1440 with one H1, loaded images and no horizontal overflow. The header brand uses the real 3:2 asset dimensions and crops only its transparent surrounding space, preserving the visible wordmark.
- Navigation: related-service link, native FAQ Space-key disclosure, homepage/service-page skip-link focus and Less motion were checked in the browser. The prior cinematic preference was restored afterwards. Contact is still a native email link; no test email was sent.
- Search: automated checks cover distinct static copy and metadata, accurate schema, discoverable internal links, local image/fragment targets and four marketing-only sitemap URLs. Service pages need no application JavaScript for content, navigation or FAQs.
- Readability: small team labels were darkened after inspecting the actual light-panel background. Palette regression tests check their 4.5:1 minimum and the new service pages' principal small-text/button colour pairs. This is not a full contrast or accessibility audit.
- Browser log snapshot: no warning/error entries observed during the final checks.

## Custom enquiry-form checks

The next-priority form and Cloudflare receiver are local and unpublished. All 157 repository tests pass, including eighteen focused form/API tests. These cover field limits, allowed services, trimming, inline errors/focus, preserved entries, in-flight duplicate suppression, ambiguous network outcomes, widget-method failures, late responses after controller destruction, bounded body size, origin checks, server validation, verified hostname/action, fixed email destination and route isolation. Outbound provider calls are fixtures, not live verification. The unconfigured markup is disabled without JavaScript and preserves the native email link. No new account, database, email binding, widget, tracking or production configuration was activated.

Earlier preview checks covered mobile reading stops, input-key isolation and Less motion. The latest preview initially failed, then became accessible through the Codex panel after correcting the local helper's root path. Latest 1440-wide checks confirmed inline-error focus, retained values and truthful no-delivery feedback. At 390 by 844 and 320 by 640 the fields fit without horizontal overflow and use 16px input text; the 390-width Less motion check reached the button and displayed no-delivery feedback. Cinematic contact navigation was inspected, but configured-widget layout and physical-device gesture behavior remain unverified. The motion preference and viewport override were restored. The local warning/error snapshot was empty. These checks are not an accessibility certification or proof of actual email delivery.

Local HTTP checks returned 200 for the homepage, new client JavaScript/CSS, shared validation module and configuration endpoint. Configuration reports `enabled: false`; a POST to the unconfigured receiver returns 503. Actual sender acceptance, inbox arrival, Turnstile expiry/replay and configured-widget failure states still need authorized integration testing. Cloudflare is signed out; existing DNS, mailbox routing, Firefox and reporting bindings remain untouched.

Latest local previews, captured in Less motion mode: `D:/Work/ARSC/previews/enquiry-cloudflare-desktop.jpg` and `D:/Work/ARSC/previews/enquiry-cloudflare-mobile.jpg`. Earlier draft proof remains at `D:/Work/ARSC/previews/enquiry-form-desktop-draft.jpg`. Provider details and activation checks: [enquiry setup guide](enquiry-form-setup.md).

## Loading baseline and limits

The nine graphics total 1,319,880 bytes; all twelve work assets total 1,330,538 bytes. Public source PNG copies were not added. New service-page CSS is approximately 6 KB and brings no new JavaScript framework or application dependency. These are file-size observations, not measured download time or Core Web Vitals.

The final image-only revision was checked at 1440 by 1000, 390 by 844 and 320 by 640. All nine images loaded, no horizontal overflow was found, the ninth image was selectable and the Less motion fallback retained image controls. Automated tests cover all nine forward/reverse positions, continued input, bounded fractional artwork poses and separate reporting controls. Graphic names and descriptions are no longer displayed outside the artwork; reporting captions and fictional-data notices remain.

The six website screenshot previews add 239,758 bytes. They use the same gallery/controller and film timeline rather than live iframes. Local desktop and 390/320-width checks confirm selector/caption agreement, loaded images and no horizontal overflow. Regression tests cover continued wheel/touch input for the Websites gallery, all six forward/reverse positions and safe native links to existing concept sites. No sample source, store or form behavior is changed by this integration.

The preview ran against a local Python static server with no controlled CPU/network throttling. Browser performance timing APIs were unavailable through the preview inspection surface. LCP, INP and CLS have therefore not been measured in this pass. Local responsiveness cannot establish production performance. Physical iOS/Android touch behavior, orientation/browser-chrome changes, assistive-technology testing and field data still require follow-up. Continued touch behavior and system reduced-motion/storage changes were tested in automated fixtures, not physical devices. No-JavaScript browser mode was not exercised; service-page static markup and homepage fallback behavior were checked through source/regressions.

## Saved previews

Enquiry security QA on 12 October 2026: real Turnstile checks passed at desktop 1440 by 1000 and mobile 390 by 844 and 320 by 640. Real Siteverify accepted localhost and 127.0.0.1 with action enquiry. The isolated QA helper adapted verified local origins to the unchanged canonical production checks and used a Resend fixture, so no extra email was sent. Acceptance UI and repeated-submit suppression passed. Narrow panels now use compact Turnstile below its 300px flexible minimum; no horizontal page overflow was observed. All 159 repository tests pass, including the sizing regression. Temporary hosts, proxy and test-only entrypoint were removed and owned servers stopped. Only arservicescollective.com remains allowed; Firefox and production were unchanged. Inbox review and access/retention decisions remain before activation. Details are in enquiry-form-setup.md.

- `D:/Work/ARSC/previews/services-graphics-desktop.jpg`
- `D:/Work/ARSC/previews/services-graphics-mobile.jpg`
- `D:/Work/ARSC/previews/continuous-creative-mobile.jpg`
- `D:/Work/ARSC/previews/continuous-reporting-desktop.jpg`
- `D:/Work/ARSC/previews/continuous-reporting-mobile.jpg`
- `D:/Work/ARSC/previews/services-home-mobile.jpg`

## Before and after publication

Base release verification: homepage, three service routes, robots and sitemap returned HTTP 200; all twenty release assets checked matched local content. Live mobile and Less motion checks passed; no warnings/errors were observed in the browser snapshot. Saved live proof: `D:/Work/ARSC/previews/live-nine-graphics-26111da.jpg`. Websites extension: all six public concept routes returned HTTP 200, six screenshot assets and both showcase runtime files matched local content, and the homepage still contains nine graphic controls. Live mobile selection/image loading and overflow checks passed. No warning/error entries were observed. Saved proof: `D:/Work/ARSC/previews/live-websites-a311a0f.jpg`.

1. Publication authorisation received on 12 October 2026. Keep this release scoped to homepage motion/showcase/navigation, service/SEO files and their tests/documentation; do not include unrelated shared-checkout changes automatically.
2. Verify production HTTP responses for `/`, the three `/services/.../` paths, `/robots.txt` and `/sitemap.xml`. Verify stylesheet/image assets, production canonical URLs and the homepage-to-service-to-contact journey.
3. Repeat a short mobile and reduced-motion check on the deployed build; confirm no old cached motion assets remain.
4. Verify Search Console ownership and submit the sitemap through the authorised account. Inspect actual indexing; submission is not a guarantee of indexing or ranking.
5. Run a controlled production mobile/desktop performance baseline and check available field data. Record settings and results before claiming an improvement.
6. Configure form delivery only after receiving-service/storage/privacy decisions; verify actual acceptance and failure/retry behavior. Do not activate tracking until account/privacy choices are made. Keep email contact available.

`robots.txt` requests crawl exclusions for existing dashboard/API/sample prefixes. It does not make those paths private or de-index already indexed pages. No security or backend behavior was changed.
