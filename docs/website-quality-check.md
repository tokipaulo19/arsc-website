# ARSC website quality record

Checked 12 October 2026. Base release `26111da` is live and verified. The owner-authorised six-website extension is checked locally and awaiting publication. Existing unrelated portfolio work in the shared checkout is excluded from this release's staged files.

## Completed checks

- `npm test`: 139 tests passed, zero failed, at the final run. This includes backend, portfolio and homepage regressions; unrelated tests were run but their source was not edited or staged for this task. Other work in the shared checkout can change the overall count.
- JavaScript syntax: `page-film.js`, `showcase.js`, `cinematic.js` and `experience.js` passed. Scoped tracked diff whitespace checks passed; Git reported only expected LF/CRLF notices.
- Logo routes: automated forward/reverse tests verify every chapter boundary and exact opening handoff. Settled chapters no longer use a central logo dock. A side-to-side transit naturally crosses the centre; it does not stop or reset there.
- Galleries: sustained wheel updates and continued finger movement update fractional progress before the selected image finishes moving. Reverse input and partial-progress resize are covered in fixtures. Browser checks at 1440 by 1000 and 390 by 844 confirm continued movement, client/caption changes and no horizontal overflow. Caption selection does not reposition the artwork or resize the caption track.
- Chapter layouts: six chapter destinations checked at 1440 by 1000 and 320 by 640. No horizontal overflow or failed completed image loads were found. Compact service cards retain reading stops and 44px-high detail links.
- Service pages: all three direct paths rendered at widths 320, 390 and 1440 with one H1, loaded images and no horizontal overflow. The header brand uses the real 3:2 asset dimensions and crops only its transparent surrounding space, preserving the visible wordmark.
- Navigation: related-service link, native FAQ Space-key disclosure, homepage/service-page skip-link focus and Less motion were checked in the browser. The prior cinematic preference was restored afterwards. Contact is still a native email link; no test email was sent.
- Search: automated checks cover distinct static copy and metadata, accurate schema, discoverable internal links, local image/fragment targets and four marketing-only sitemap URLs. Service pages need no application JavaScript for content, navigation or FAQs.
- Readability: small team labels were darkened after inspecting the actual light-panel background. Palette regression tests check their 4.5:1 minimum and the new service pages' principal small-text/button colour pairs. This is not a full contrast or accessibility audit.
- Browser log snapshot: no warning/error entries observed during the final checks.

## Loading baseline and limits

The nine graphics total 1,319,880 bytes; all twelve work assets total 1,330,538 bytes. Public source PNG copies were not added. New service-page CSS is approximately 6 KB and brings no new JavaScript framework or application dependency. These are file-size observations, not measured download time or Core Web Vitals.

The final image-only revision was checked at 1440 by 1000, 390 by 844 and 320 by 640. All nine images loaded, no horizontal overflow was found, the ninth image was selectable and the Less motion fallback retained image controls. Automated tests cover all nine forward/reverse positions, continued input, bounded fractional artwork poses and separate reporting controls. Graphic names and descriptions are no longer displayed outside the artwork; reporting captions and fictional-data notices remain.

The six website screenshot previews add 239,758 bytes. They use the same gallery/controller and film timeline rather than live iframes. Local desktop and 390/320-width checks confirm selector/caption agreement, loaded images and no horizontal overflow. Regression tests cover continued wheel/touch input for the Websites gallery, all six forward/reverse positions and safe native links to existing concept sites. No sample source, store or form behavior is changed by this integration.

The preview ran against a local Python static server with no controlled CPU/network throttling. Browser performance timing APIs were unavailable through the preview inspection surface. LCP, INP and CLS have therefore not been measured in this pass. Local responsiveness cannot establish production performance. Physical iOS/Android touch behavior, orientation/browser-chrome changes, assistive-technology testing and field data still require follow-up. Continued touch behavior and system reduced-motion/storage changes were tested in automated fixtures, not physical devices. No-JavaScript browser mode was not exercised; service-page static markup and homepage fallback behavior were checked through source/regressions.

## Saved previews

- `D:/Work/ARSC/previews/services-graphics-desktop.jpg`
- `D:/Work/ARSC/previews/services-graphics-mobile.jpg`
- `D:/Work/ARSC/previews/continuous-creative-mobile.jpg`
- `D:/Work/ARSC/previews/continuous-reporting-desktop.jpg`
- `D:/Work/ARSC/previews/continuous-reporting-mobile.jpg`
- `D:/Work/ARSC/previews/services-home-mobile.jpg`

## Before and after publication

Base release verification: homepage, three service routes, robots and sitemap returned HTTP 200; all twenty release assets checked matched local content. Live mobile and Less motion checks passed; no warnings/errors were observed in the browser snapshot. Saved live proof: `D:/Work/ARSC/previews/live-nine-graphics-26111da.jpg`. The six Websites previews were captured from public routes that rendered successfully in the browser. Final extension verification remains to be recorded after its scoped release.

1. Publication authorisation received on 12 October 2026. Keep this release scoped to homepage motion/showcase/navigation, service/SEO files and their tests/documentation; do not include unrelated shared-checkout changes automatically.
2. Verify production HTTP responses for `/`, the three `/services/.../` paths, `/robots.txt` and `/sitemap.xml`. Verify stylesheet/image assets, production canonical URLs and the homepage-to-service-to-contact journey.
3. Repeat a short mobile and reduced-motion check on the deployed build; confirm no old cached motion assets remain.
4. Verify Search Console ownership and submit the sitemap through the authorised account. Inspect actual indexing; submission is not a guarantee of indexing or ranking.
5. Run a controlled production mobile/desktop performance baseline and check available field data. Record settings and results before claiming an improvement.
6. Configure form delivery only after receiving-service/storage/privacy decisions; verify actual acceptance and failure/retry behavior. Do not activate tracking until account/privacy choices are made. Keep email contact available.

`robots.txt` requests crawl exclusions for existing dashboard/API/sample prefixes. It does not make those paths private or de-index already indexed pages. No security or backend behavior was changed.
