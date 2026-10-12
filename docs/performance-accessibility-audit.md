# Performance and accessibility audit — 12 October 2026

Status: source fixes complete locally; not published in this audit. Analytics was already published in `cf71375`, with live verification recorded in `477e0b8` and `docs/analytics-setup.txt`. Existing unrelated documentation edits were preserved.

## Scope and fixes

- Homepage and three public service pages only; no client dashboards, Firefox, Worker routes, secrets, account settings, enquiry delivery or analytics behaviour changed. No enquiry email was sent.
- Serve the existing Inter and Space Grotesk Latin variable WOFF2 fonts from ARSC, with preloads and swap fallback. Removed the external Google stylesheet/connection chain from these four pages. Original unmodified font files and SIL licences are retained in `assets/fonts`; combined font payload is 70,752 bytes. Non-covered glyphs retain the ordinary font fallback.
- Keep the four opening capability cards fully opaque while their existing transforms animate. Previously the whole-card opacity of 0.55 dimmed their orange identifiers and small descriptions below the contrast threshold. Motion, logo paths and transition timing are unchanged.
- The full-page reduced-motion audit also found footer headings/legal text slightly below 4.5:1 (#777570 on #080809, 4.34:1). Changed only these small-text colours to #aaa8a3 and updated the stylesheet cache version.
- Add native lazy loading to the two below-fold team portraits, preserving dimensions, transparency and cropping. Browser loading decisions still depend on proximity and fixed-scene layout; this is not a claim that every portrait request is deferred.
- Use the existing 38,266-byte WebP logo on service-page headers instead of the 83,064-byte PNG. Original PNG social metadata/icons remain unchanged.
- Update the local-only preview helper to serve WOFF2 with its correct MIME type, compress text responses like production, and serve committed cinematic sources for baseline comparisons. Helpers/tests remain excluded from public assets. No runtime framework or dependency added.

## Measurement conditions

Lighthouse 13.5.0 CLI, isolated headless installed Microsoft Edge. Anonymous public-page loads only, no consent granted or form submissions. Production before readings are diagnostic context, not directly comparable to a local after reading. Public PageSpeed API returned 429 (quota unavailable); no Google account/quota settings were changed.

The final paired local run used the same localhost preview with gzip, baseline marketing sources from committed HEAD versus working sources, mobile 412 × 823, 1.75 device scale, Lighthouse's default mobile throttling settings, and `throttling-method=devtools` (applied network/CPU throttling). The two final runs were sequential, not concurrent. This is one paired trial, not a repeated statistical benchmark, physical phone result or field Core Web Vitals pass.

| Measure | Local mobile before | Local mobile after |
| --- | ---: | ---: |
| Performance score | 83 | 87 |
| Automated accessibility score | 96 | 100 |
| First/Largest Contentful Paint | 2.723 s | 2.635 s |
| Total Blocking Time | 347.5 ms | 269.4 ms |
| Cumulative Layout Shift | 0.0615 | 0.0412 |
| Heading font request finished | 3.268 s | 1.608 s |
| Body font request finished | 3.402 s | 1.747 s |

Local desktop after, Lighthouse desktop preset with applied throttling: performance 99, accessibility 100, FCP/LCP 0.677 s, TBT 0 ms, CLS 0.0027. No matched applied-throttling desktop before trial is claimed. All three service pages scored 100 for automated accessibility. Opening-card contrast is now passing.

An additional full-page Lighthouse audit with the browser's forced system reduced-motion preference exposed the footer contrast issue (97 before that correction). Its corrected rerun scored 100 with no weighted automated accessibility failures. Report: `D:/Work/ARSC/previews/audit-less-motion-accessibility-final.json`. This complements the cinematic initial-state check; neither is a comprehensive WCAG certification.

Production before with default simulated throttling: mobile performance 68/accessibility 96, FCP 3.411 s, LCP 5.230 s, TBT 61.4 ms, CLS 0.0642; desktop performance 85/accessibility 96, FCP 1.027 s, LCP 2.328 s, TBT 0 ms, CLS 0.0569. These are not after-release results.

Important discrepancy: exploratory/default-simulation local after runs projected very slow LCP for the decorative COLLECTIVE text (final projection 12.917 s, score 69), while that run's observed LCP breakdown showed about 0.242 s before simulated extrapolation. Applied-throttling trials instead observed approximately 2.5–2.6 s. Different methods must not be merged or selectively presented as a production speed guarantee. Raw reports are retained, and production/physical-device checks are required before concluding that loading is reliably fast. The mobile applied-throttling LCP and TBT still miss the aspirational lab thresholds; no perfect-performance claim is made.

Raw JSON reports: `D:/Work/ARSC/previews/audit-mobile-before.json`, `audit-desktop-before.json`, `audit-sequential-mobile-before.json`, `audit-sequential-mobile-after.json`, `audit-controlled-desktop-after.json`, `audit-final-mobile-simulated.json`, and `audit-service-*.json` in the same directory. Earlier exploratory local reports are also retained.

## Functional and accessibility verification

- `npm test`: 203 passed, zero failures. New checks cover first-party licensed fonts, unchanged card transforms/full-strength text contrast, footer text colours, lazy portrait dimensions and the service-header WebP. Existing tests cover continuous/reversible cinematic gestures, retargeting, hidden-layer suspension, reduced-motion preferences, geometry budgets, enquiry validation/security and analytics isolation.
- Browser checks at 320 × 640, 390 × 844, 1440 × 1000 and the 844 × 390 landscape fallback found no horizontal overflow on the checked destinations. The short viewport returns to native reading; restoring desktop restores cinematic mode.
- Keyboard Explore opens, Escape closes and restores summary focus. Chapter links arrive at the requested content. Less motion toggles and restores normal reading. Homepage/service skip links focus main content. Service FAQ opens with Enter. All three service pages retain one H1 and native navigation.
- Creative first/ninth selectors are keyboard operable, have correct selected states after playback, remain one row and measure about 29 pixels wide by at least 44 high at 320 width. The gallery keeps the original nine images and continuous choreography. Website chapter and team/contact layouts fit narrow screens; lazy team images load when reached. Form fields retain associated labels and error-description references. Local sending stays disabled; validation/security behaviour was regression-tested, not used to send a live message.
- Static no-JavaScript content and native links were reviewed through source/tests; the browser's JavaScript was not disabled for a separate manual end-to-end trial. OS preference handling and blocked storage are covered by fixtures. No claim of a completed screen-reader or comprehensive WCAG audit.

Visual proof: `D:/Work/ARSC/previews/audit-opening-desktop.jpg` and `D:/Work/ARSC/previews/audit-creative-mobile.jpg`.

## Remaining release and quality gates

Publish only the scoped fixes when authorised; verify live asset content, font delivery, chapter/navigation behaviour and no accidental backend changes. Re-run production diagnostics and test an actual iOS/Android phone, including graphics, reverse gestures, browser chrome and soft keyboard. Field INP and physical-device frame rate are not measured by these load audits. Assistive-technology, zoom/text enlargement and a full WCAG 2.2 AA review remain separate work. Current scores are diagnostic, not certification. Avoid adding media/animation complexity until those checks and a useful consented analytics baseline exist.
