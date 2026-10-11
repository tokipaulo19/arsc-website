# ARSC website improvement plan

Updated 12 October 2026. Target audience: Australian businesses seeking general virtual assistance, social media management and social media graphics.

Keep the cinematic experience and ARSC identity, while making the services easier to understand, the work easier to evaluate and enquiries easier to send. Complete one milestone at a time, record the checks below, and use verified content rather than invented results. This roadmap covers both website quality and SEO; the benchmarks are reference examples, not evidence that ARSC meets every standard.

## Current position

The live homepage has a distinctive cinematic presentation, interruptible scroll transitions, mobile scene layouts, a system reduced-motion fallback and clear primary service names. The local version adds chapter navigation, a Less motion choice and nine work samples: six approved graphics and three clearly labelled dashboard design previews using fictional data. It now also includes three service pages, organisation/service structured data, a marketing-only sitemap and robots configuration. Contact still opens an email app; no enquiry form or analytics has been activated. Live indexing and real-user performance still need verification. See [the quality record](website-quality-check.md) for the latest checks and limitations.

## Business benchmarks

| Reference | Observed approach | Application to ARSC |
| --- | --- | --- |
| [Outsourcing Angel](https://outsourcingangel.com/) and its [Focus SME case study](https://outsourcingangel.com/client-case-study-jade-allerby-focus-sme/) | Specific service navigation, FAQs, discovery-call routes and a client case study explaining tasks and the client's experience. | Explain what gets done, show client-approved work, and give visitors a clear next step. Do not copy its staffing model or promises. |
| [South West Sydney Virtual Assistant](https://www.swsvirtualassistant.com/clients) | Named client examples describe the support supplied; navigation separates services, portfolio, pricing and testimonials. | Replace broad capability labels with understandable tasks. Build evidence for each ARSC partnership without adding unverified endorsements. |
| [Milkable contact page](https://www.milkable.com.au/contact-us/) | A short enquiry form sits alongside direct email and phone contact. | Offer a short form plus the existing email route; keep fields relevant and avoid demanding a phone number. |
| [Social Status](https://socialstatus.com.au/landing-page/) | Prominent social media positioning, visual examples, attributed testimonials and a call-booking route. | Put ARSC's actual work near the decision to enquire. Use only ARSC's verified results, not competitor guarantees or metrics. |

These examples suggest that clear services, visible proof and low-friction contact should be the next priorities. They are not a representative market survey or a formal accessibility audit.

## Quality targets

- A new visitor can identify the three primary services and Australia-wide audience from the first screen, without playing every animation.
- Every claim and portfolio item has a source, permission to display, and no exposed client data. Existing headline totals need their supporting records checked before becoming case-study claims.
- All content remains reachable on mobile, with keyboard navigation, without JavaScript, and with reduced motion. Target WCAG 2.2 AA, checked through focused automated and manual testing; do not claim certification. Offer an additional motion choice following [W3C interaction-motion guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions), which is an AAA criterion.
- Preserve existing anchors, scroll retargeting, team-photo cropping, mobile reading stops and unrelated dashboard/Worker functionality.
- Measure loading, interaction response and layout stability. Aim for LCP at most 2.5 seconds, INP at most 200 milliseconds and CLS at most 0.1 at the 75th percentile of real visits, separately for mobile and desktop. [Core Web Vitals guidance](https://web.dev/articles/vitals). A lab run is diagnostic, not a real-user pass.
- Search pages should answer real questions with useful content, not repeated city names or thin keyword pages. [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).
- Enquiry success means the receiving system accepted the message. Opening an email app or clicking a button is not proof of delivery or a completed lead.

## Milestones

### 1 Clarify the homepage services

Status: Complete and published on 11 October 2026. Live release: `2aacece`.

Name General Virtual Assistance, Social Media Management and Social Media Graphics in the hero, service cards and footer. Keep Website and Systems as an additional capability. Preserve the approved tagline and business identity; shorten the supporting copy rather than packing more into the hero. Make the secondary hero link go directly to services. Align search and social descriptions with the visible offering.

Why: Visitors should understand what they can hire ARSC for before evaluating the animation. This is also a prerequisite for useful service pages and a service-specific enquiry form.

Files: `index.html`; focused content regression tests. No scroll-engine changes planned.

Acceptance: One unchanged H1, three named priority services, matching descriptions, valid anchors, no invented promises, and no clipped or inaccessible content on desktop and mobile. Existing cinematic tests pass. Record local versus live verification explicitly.

### 2 Show real client work

Status: Published on 12 October 2026 in release `26111da`; owner-authorised six-website extension now in release preparation.

Present nine approved samples in two cinematic chapters following Proven Support. Creative Production uses a layered composition of six real graphics, with client controls bringing a selected piece to the foreground. Reporting shows all three dashboard illustrations together, with the selected one moving forward. Each selection keeps the client, description and visible preview together; native links open the original asset. NBA explains bodybuilding-account comparisons; Personalised Posing explains coaching-brand benchmarking; PEG explains account-based reporting. Include a verified result only if evidence exists; a useful deliverable is sufficient when results are unavailable. Keep The Giving Table name and do not publish private personal names. Keep the moving logo behind content and retain clear fictional-data notices.

Inputs: The owner supplied the graphics folder and confirmed public-display permission on 12 October 2026. The selected graphics are The Giving Table, AMPT Coaching, ON&T, Mel Green Movement, Fit Focus Media and Salt Sand Swim. The Salt Sand Swim artwork is labelled as a design concept because its supplied original contains placeholder copy. The owner also approved fictional demo data for NBA, Personalised Posing and PEG dashboard previews. These are simplified design illustrations based on the existing dashboards, not screenshots of real reporting. No real performance results are claimed. Keep original dashboard sources and data connections unchanged; do not expose editable Drive folders on the public website.

Acceptance: Accurate attribution, mobile-friendly image sizes and alt text, accessible viewing controls if required, no external autoplay embeds, no crop errors, no new scroll traps, and no meaningful performance regression.

### 3 Make enquiries easy and dependable

Status: Planned, receiving service and privacy details required before activation.

Add a short enquiry form: name, email, support needed and message; business name optional. Keep direct email available. Agree how submissions reach `admin@arservicescollective.com`, using an existing approved provider or a narrowly scoped backend integration. Explain how enquiry information is used. Do not introduce marketing subscriptions or invent a response-time promise.

Acceptance: Accessible labels and errors, length limits, server-side validation, abuse protection, verified delivery, useful failure/retry state, no duplicate sends, and a privacy notice matching the actual storage and recipients. Never present a mailto fallback as a successfully submitted form. Do not reuse unrelated client-reporting data stores or alter their routes.

### 4 Let visitors choose their route and motion

Status: Published on 12 October 2026 in release `26111da`. Websites adds a seventh navigation destination.

Add a compact chapter navigator with clear labels and an accurate active state. Visitors can jump to services, work, team and contact. Add a Less motion choice that uses the existing readable fallback, respects the system setting and keeps the visitor near the same content when switching. Keep the full cinematic experience available.

Acceptance: Keyboard and touch friendly, visible focus, no overlap with text, all destinations reachable, predictable history and back behavior, storage failures handled, and no animation lock or new wheel interception. Check narrow screens and reduced motion separately.

### 5 Build useful service pages and technical SEO

Status: Website implementation published and production routes verified on 12 October 2026 in release `26111da`; authorised Search Console checks remain outstanding.

Created `/services/general-virtual-assistance/`, `/services/social-media-management/` and `/services/social-media-graphics/` using the owner's approved three primary services and existing homepage task descriptions. Each page explains audience, practical work, scope agreement, FAQs and the existing email route. No fixed package, office, response-time, price or growth promise was added. Actual engagement details are agreed through the enquiry, not invented here. The homepage service cards and footer link to the pages; each page links to the other services and relevant approved work.

Unique titles, descriptions, canonicals, social metadata and accurate JSON-LD are present. `sitemap.xml` lists only the homepage and three service URLs. `robots.txt` requests that crawlers avoid dashboard, API and sample paths. This is not access control or a guarantee that previously indexed URLs disappear. The existing Worker asset fallback serves the new files without changes to backend routes. Production routes returned HTTP 200 and all three service-page canonical URLs were verified after release. Search Console ownership, submission and indexing have not been performed.

Create one substantive page for each primary service. Explain suitable clients, practical tasks, how the partnership works, what is agreed in scope and how to enquire. Include related approved work and genuine FAQs. Use unique titles, descriptions, canonical URLs and internal links from the homepage. Add accurate organisation structured data and sitemap/robots configuration after checking public versus private routes. Verify Search Console ownership, indexing and sitemap submission through the authorised account.

Do not claim a physical Australian office, fabricate reviews, invent prices, create thin city pages or mark up unsupported ratings. Business Profile is a separate eligibility decision, not an automatic step for an online-only service. Structured data and new pages do not guarantee rankings or rich results.

Acceptance: Direct URLs work, meaningful content is present without JavaScript, semantic headings, correct metadata/schema, no orphan pages or broken links, and only intended public marketing pages are submitted. Client dashboards and APIs stay out of the sitemap; robots is not access control.

### 6 Measure and tune mobile quality

Status: Local functional and readability checks complete on 12 October 2026; controlled performance measurements, physical-device checks and field data remain outstanding.

The latest motion revision removes the forced centre attraction from every logo handoff, keeping the established side docks and cinematic scale/rotation. Both galleries accept continuous wheel and continued touch input, including reversals, rather than gating each picture until its transition finishes. Captions reserve stable layout space; artwork interpolation no longer jumps when the nearest caption changes. No additional animation framework or independent scrolling engine was introduced. Homepage/service-page skip links, visible focus, larger service-link targets and darker small labels on the light team panel improve navigation and readability.

Run repeatable mobile and desktop lab checks, then inspect available real-user data. Review asset dimensions/compression, fonts, initial loading, scroll main-thread work and layout movement. Optimise measured bottlenecks without replacing the cinematic design or adding a new animation framework unnecessarily. Perform a focused accessibility pass covering contrast, focus, reading order and forms.

Acceptance: Record tools, viewport/network settings, baseline and after measurements, remaining limitations and field-data availability. Recheck rapid forward/reverse gestures, long sections, orientation changes, menu/hash navigation, no-JavaScript access and reduced motion. Do not publish an unsupported 'fast' or 'fully accessible' claim.

### 7 Track enquiries and refine the site

Status: Planned, analytics setup and privacy choices required.

Choose a proportionate measurement setup. Track service-page visits, enquiry starts and confirmed submissions; track email clicks separately as contact intent, not delivered enquiries. Never include visitor email addresses or message text in analytics events. Check Search Console queries and indexing alongside enquiry quality before deciding which content to expand.

Acceptance: Event definitions agreed, one event per intended action, no personal data in URLs/events, required notices/consent implemented, no tracking activated without the selected account/configuration, and no false conversion on failure. Establish a baseline before claiming improvement. Use findings for later iterations; recurring monitoring is not enabled by this plan.

## Execution order and review

Milestones 1, 2, 4 and the website portion of 5 are live. The functional portion of 6 is checked; it is not a performance or accessibility certification. Review found that service pages do not need to wait for a form provider: the approved service offering and functioning email route already provide a coherent starting point, so that work has proceeded.

Next: publish the owner's newly requested six-website showcase using already-public sample routes, without changing those sites or including unrelated edits. Then complete Search Console checks through the authorised account. Resolve receiving-service/privacy choices before activating milestone 3, and account/privacy choices before activating milestone 7. Obtain supporting records for headline proof totals before turning them into case-study results. Measure performance before adding further media or making speed claims. The owner approved homepage inclusion of Aura, FORM, June Vale, Hearth, OFFDAY and Circuit Bench on 12 October 2026; they remain explicitly labelled fictional concepts, not clients.

Remaining owner decisions: which approved service receives form enquiries; who receives/stores them and for how long; which analytics account/setup to use, if any; and authorised Search Console access. Existing email contact remains usable while these choices are pending. No automated recurring monitoring is enabled, and no production publication was made during the overnight work.

Keep new dependencies and moving parts minimal. Do not copy competitor layouts, guarantees or pricing. Save milestone outcomes here, including tests, publication state and remaining inputs. Review the roadmap after the showcase and enquiry changes, and again after initial search/enquiry data is available.

## Progress log

- 12 October 2026, publication: Scoped 35-file release `26111da` pushed through the existing GitHub-to-Cloudflare connection. Live homepage, three service pages, robots and sitemap returned HTTP 200; all twenty checked release assets matched local content. Live mobile checks confirmed all nine graphics loaded, selectable end artwork, no horizontal overflow and working Less motion controls. A live service page had one H1, the correct canonical and no narrow-screen overflow. Browser warning/error snapshot was empty. Unrelated portfolio edits were excluded. Saved proof: `D:/Work/ARSC/previews/live-nine-graphics-26111da.jpg`.
- 12 October 2026, owner-authorised extension: Added a single Websites showcase chapter for six already-published concepts: Aura, FORM, June Vale, Hearth, OFFDAY and Circuit Bench. Captured actual live homepage previews, compressed to six WebPs totalling 239,758 bytes, and linked to the existing public routes. The same film playhead drives all six previews; no iframe, additional scroll handler or framework was added. All 139 current tests pass, including six-site forward/reverse and continued-input checks. Local browser checks at desktop, 390 by 844 and 320 by 640 confirm selected-preview/caption agreement, image loading, native site links and no horizontal overflow. Publication of this extension is pending. Existing sample sources are not part of this scoped change.

- 12 October 2026, release preparation: Owner authorised publication and requested nine graphics without visible name panels. Added the remaining three cleared Drive images, removed creative name/description panels and added nine accessible dot controls. The first three remain Fit Focus, The Giving Table and SaltSandSwim; reporting remains three separate, labelled fictional-data previews. All 137 current repository tests pass. Browser checks at 1440 by 1000, 390 by 844 and 320 by 640 confirm nine loaded images, selectable end images, no horizontal overflow and working Less motion controls. Publication is pending the scoped commit and live verification. No unrelated portfolio files, client dashboards, backend routes, form delivery or analytics are part of this release.

- 11 October 2026: Business comparison and source review complete. Milestone 1 implemented locally in `index.html`, with four content regression tests added. All 45 content and cinematic tests pass; `git diff --check` passes. Browser checks at 1440 by 1000, 390 by 844 and 360 by 640 confirm the services shortcut, no horizontal overflow and access to every service card through reading stops. The scroll engines and unrelated Worker/dashboard files are unchanged. The live site has not been updated in this milestone.
- Owner will supply a shared Drive folder for milestone 2. No portfolio samples, new client results, analytics integrations or enquiry backend have been published. Real-user performance and formal accessibility conformance remain unverified.
- 11 October 2026: Owner authorised Step 1 publication. Release `2aacece` pushed through the existing GitHub and Cloudflare deployment. The live homepage returns HTTP 200 with the new title, service cards and services shortcut. All 45 focused tests pass. Root test files are excluded from public assets; the roadmap remains excluded by the existing Markdown rule. Milestone 2 is awaiting the owner's Drive folder.
- 11 October 2026: Milestone 4 implemented locally while showcase assets are being prepared. The header's Explore menu offers eleven native chapter links, an active chapter and a remembered Less motion choice. Device reduced-motion preferences take precedence; blocked storage uses a visit-only choice. Mode changes preserve the chapter/reading position and cancel unfinished playback. Menu gestures stay native, avoiding accidental scene changes. All 79 repository tests pass, including new preference, navigation and reading-position regressions; JavaScript syntax and diff checks pass. Browser checks at 1440 by 1000, 390 by 844 and 320 by 640 confirm header/menu fit, no horizontal overflow, keyboard opening/Escape focus, native history, preference persistence and mobile chapter playback. No browser errors were observed. No production deployment, analytics or enquiry backend was changed. OS reduced-motion changes and unavailable storage were verified in automated fixtures, not through browser device emulation. Formal accessibility and real-user performance remain unverified.
- 12 October 2026: Milestone 2 complete locally after the owner supplied and cleared the graphics folder. Three uncropped graphics and three simplified dashboard previews now appear within Selected Partnerships. The graphics total 455,946 bytes in WebP; SVG previews contain only fictional figures and visible demo-data notices. Original partnership descriptions remain available in a native disclosure. All 83 repository tests, syntax checks and diff checks pass. Browser checks at 1440 by 1000, 390 by 844 and 320 by 640 cover image loading, all six mobile reading stops, keyboard disclosure, Less motion, no horizontal overflow and opening a larger demo preview. No browser errors were observed. Client dashboard sources, data and backend routes are unchanged. Asset sources and approval notes are saved in `docs/showcase-assets.md`. These changes are not live; field performance remains unmeasured.
- 12 October 2026: Revised milestone 2 after owner feedback. Replaced the boxed six-card gallery with six full project scenes integrated into the shared film engine, with distinct headlines and client-specific reporting descriptions. Native project links, demo-data notices and the original graphics remain intact. All 85 current repository tests pass, including fifteen-scene forward/reverse and unique-copy regressions; syntax and scoped diff checks pass. Browser checks at 1440 by 1000, 390 by 844 and 320 by 640 confirm project routing, one-gesture scene changes, compact-screen reading stops, disclosure layout, reduced-motion fallback, contact routing and no horizontal overflow or invalid animation coordinates. No browser warnings or errors were observed. Physical-device performance and formal accessibility remain unverified. Saved screenshots are in `D:/Work/ARSC/previews/project-scenes-*.jpg`. No production publication or changes to client dashboards/backend were made.
- 12 October 2026: Replaced the six similar project slides with two art-directed showcase chapters after further owner feedback. Creative work now uses a layered, selectable composition; reporting uses a separate console-style presentation. All six original samples and distinct descriptions remain, with keyboard-operable controls, native larger views and demo-data notices. No new media downloads, animation framework or wheel controller were added. Fixed a viewport-resize jump and narrow-screen overflow in reduced-motion mode. All 88 repository tests pass, with new selection and resize regressions. Browser checks cover 1440 by 1000, 390 by 844 and 320 by 640, including project choices, chapter transition, compact reading access and reduced motion. Saved previews use `D:/Work/ARSC/previews/showcase-studio-*.jpg`. This version is local, not published; physical-device performance remains unverified.

- 12 October 2026: Expanded Creative Production to six cleared graphics and made all three reporting previews visible together. Reduced the homepage from thirteen main sections to eight by folding challenge, partnership and differentiator copy into Services, combining About with Team, and placing a three-step process beside Contact. Removed the duplicate partnership headline and retained all legacy fragment destinations. The chapter menu now has six concise destinations. The six WebP graphics total 1,046,958 bytes; original PNGs remain outside the public checkout. All 101 current repository tests pass, including six-layer selection, all-visible reporting, consolidated section count and legacy-anchor routing. Browser checks cover desktop, 390 by 844 and 320 by 640, project selection by pointer and keyboard, small-screen caption reading, forward scene flow, About routing and Less motion. No browser warnings or errors were observed. These changes remain local, not published. Physical-device performance and formal accessibility remain unverified.
- 12 October 2026, overnight continuation: Removed the centre magnet from every logo handoff and replaced both galleries' one-picture gesture gate with continuous, reversible input. Artwork follows fractional progress independently of caption selection, hides its wrap seam and preserves position through resize. Added three static service pages and discoverable links, structured data, sitemap and robots configuration. Added skip links, service-link touch targets and readable team labels. All 132 current repository tests pass, including five new SEO/readability tests and new motion regressions; syntax and scoped diff checks pass. Browser checks cover every chapter at desktop and compact widths, both galleries at 390 by 844, all three service pages at 320/390/1440 widths, native FAQ keyboard controls, cross-page navigation, skip-link focus and Less motion. No warning/error entries were observed. The preview does not provide a controlled performance baseline or physical-device touch measurement. Client dashboards, backend routes, form delivery, analytics and production remain unchanged by this continuation. Full evidence and remaining release checks are in `docs/website-quality-check.md`.
