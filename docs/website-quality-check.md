# ARSC website quality record

## Mobile optimisation on 12 October 2026

This focused pass is local and unpublished. All 164 repository tests pass, including new checks for retired parallax work, cached hidden panels, image dimensions/byte savings and 44-pixel artwork controls. Earlier records below describe their respective releases and test dates, not the current local test count. Enquiry delivery remains verified by the owner's replacement test-email receipt; this pass sent no email and changed no enquiry or production configuration.

The cinematic section/large-logo choreography and transition durations are unchanged. In film mode the legacy routine measures only the hero, hidden panels stop receiving pose writes, and gallery poses skip repeated values. The film now supplies the chapter dock label directly. Less motion still restores native reading and controls. Four compressed WebP images preserve their original dimensions and transparency; PNG sources remain intact. Explicit image dimensions have matching automatic-height CSS so the logo and portraits retain their aspect ratio. Artwork controls wrap with 44 by 44 pixel targets. Changed runtime/style includes have new cache versions.

### Local performance comparison

Conditions: Codex in-app Chromium browser, 390 by 844 viewport, local Node preview with no-store responses, no CPU/network throttling, warm external font cache. An opt-in, local-only probe wraps geometry/style writes and observes LCP, CLS, long tasks and animation frames. It has no storage, telemetry or outbound calls. The preview serves committed HEAD marketing sources when `qa-baseline` is set; normal preview serves working files. Both use the same probe. All helpers are excluded from public assets. Frame sampling adds a small shared overhead.

One paired trial used direct `#services` navigation, then one downward reading gesture and the completed 620-millisecond playback. Counts exclude initial navigation/reflow. Before: 544 geometry reads and 1,454 style-property writes. After: 34 reads and 510 writes. Both runs sampled 38 animation-frame intervals, no intervals above 34 milliseconds, and a maximum sampled interval of 17 milliseconds. This demonstrates less work in this local interaction, not a faster frame-rate claim across devices.

The observed page image transfer was 3,217,000 bytes before and 1,755,166 after, about 45% less. The four replaced files alone fell from 1,640,104 to 178,270 bytes, about 89% less. This pass did not change the nine artwork files, dashboard SVGs or six website previews. The paired local LCP observations were 232 and 152 milliseconds; CLS was 0.0254 and 0.0427. These single, warm-cache local observations are diagnostic only; they do not establish a repeatable speed improvement, INP or a Core Web Vitals pass. Google's public PageSpeed API returned HTTP 429, so no Lighthouse score or throttled production baseline is claimed.

### Usability verification

Every main chapter was reached at 320 by 640 and 1440 by 1000 with no horizontal overflow or completed broken-image loads. At 390 by 844, creative/reporting layouts and native controls were checked; all nine graphics loaded and the ninth was keyboard-selectable. Reporting selected PEG with the correct copy. The nine artwork controls measured 44 by 44 pixels at 320 width. Less motion retained the selected report and native controls with no overflow; switching back restored cinematic mode. Resizing to 844 by 390 activated the existing short-viewport native fallback without overflow. Team portraits retain square proportions and their established lower clipping; desktop visual review confirms the original shared frame. Browser warning/error snapshot was empty.

Proof: `D:/Work/ARSC/previews/mobile-performance-creative-390.jpg` and `D:/Work/ARSC/previews/mobile-performance-team-desktop.jpg`.

Remaining: authorised publication and live asset checks; repeated throttled lab runs; physical iOS/Android gestures, browser-chrome and soft-keyboard checks; real-user INP/loading data; assistive-technology and full contrast verification. This is not a formal accessibility certification. No new analytics, dependency, provider, account or motion framework was added. Worker routes, bindings, form delivery, Firefox, client dashboard sources and service pages remain untouched.

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

Enquiry release 44c1511 on 12 October 2026: Cloudflare 40e6ebb6 Ready at 100% traffic, public configuration enabled with only a public sitekey, homepage and form assets HTTP 200. Invalid security token rejects 400; wrong origin rejects 403. The owner confirmed earlier test-email inbox receipt and approved Nico/Caryl-only access and manual 90-day cleanup of closed non-client enquiries. All 160 tests pass. Live desktop and 390-width mobile fields, notices and email fallback work without horizontal overflow; no ARSC-page warning/error entries were observed. No additional positive production submission or email send was performed. No unrelated source or Firefox change was included. Current setup and proof paths are in enquiry-form-setup.md.

Base release verification: homepage, three service routes, robots and sitemap returned HTTP 200; all twenty release assets checked matched local content. Live mobile and Less motion checks passed; no warnings/errors were observed in the browser snapshot. Saved live proof: `D:/Work/ARSC/previews/live-nine-graphics-26111da.jpg`. Websites extension: all six public concept routes returned HTTP 200, six screenshot assets and both showcase runtime files matched local content, and the homepage still contains nine graphic controls. Live mobile selection/image loading and overflow checks passed. No warning/error entries were observed. Saved proof: `D:/Work/ARSC/previews/live-websites-a311a0f.jpg`.

1. Publication authorisation received on 12 October 2026. Keep this release scoped to homepage motion/showcase/navigation, service/SEO files and their tests/documentation; do not include unrelated shared-checkout changes automatically.
2. Verify production HTTP responses for `/`, the three `/services/.../` paths, `/robots.txt` and `/sitemap.xml`. Verify stylesheet/image assets, production canonical URLs and the homepage-to-service-to-contact journey.
3. Repeat a short mobile and reduced-motion check on the deployed build; confirm no old cached motion assets remain.
4. Verify Search Console ownership and submit the sitemap through the authorised account. Inspect actual indexing; submission is not a guarantee of indexing or ranking.
5. Run a controlled production mobile/desktop performance baseline and check available field data. Record settings and results before claiming an improvement.
6. Configure form delivery only after receiving-service/storage/privacy decisions; verify actual acceptance and failure/retry behavior. Do not activate tracking until account/privacy choices are made. Keep email contact available.

`robots.txt` requests crawl exclusions for existing dashboard/API/sample prefixes. It does not make those paths private or de-index already indexed pages. No security or backend behavior was changed.
