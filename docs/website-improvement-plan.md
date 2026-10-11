# ARSC website improvement plan

Reviewed 11 October 2026. Target audience: Australian businesses seeking general virtual assistance, social media management and social media graphics.

Keep the cinematic experience and ARSC identity, while making the services easier to understand, the work easier to evaluate and enquiries easier to send. Complete one milestone at a time, record the checks below, and use verified content rather than invented results. This roadmap covers both website quality and SEO; the benchmarks are reference examples, not evidence that ARSC meets every standard.

## Current position

The homepage has a distinctive cinematic presentation, interruptible scroll transitions, mobile scene layouts and a system reduced-motion fallback. It already has a canonical URL and search and social metadata. The main service names are broad, the three partnership cards describe support without showing work, and contact currently opens an email app. The source assets contain team photos and logos, but no portfolio samples. No homepage analytics tag, enquiry form, structured data, robots file or sitemap was found in the reviewed source. Live indexing and real-user performance still need verification.

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

Status: Next, awaiting the Drive folder the owner will supply.

Use 3 to 6 approved samples to build a visually stronger showcase within Selected Partnerships, not another repetitive section. For each item show the client, what ARSC did, the sample, and a verified result only if evidence exists. A useful deliverable is sufficient when results are unavailable. Keep The Giving Table name and do not publish private personal names. Pair sample entrances with the existing shared scene choreography, keeping the logo behind content.

Inputs: Shared Drive link, permission to display each item, client attribution, ARSC's role, and any supported result with its period and baseline. Review images for private contact details; do not expose editable Drive folders on the public website. Use existing approved descriptions until the inputs arrive. No fabricated samples or borrowed competitor work.

Acceptance: Accurate attribution, mobile-friendly image sizes and alt text, accessible viewing controls if required, no external autoplay embeds, no crop errors, no new scroll traps, and no meaningful performance regression.

### 3 Make enquiries easy and dependable

Status: Planned, receiving service and privacy details required before activation.

Add a short enquiry form: name, email, support needed and message; business name optional. Keep direct email available. Agree how submissions reach `admin@arservicescollective.com`, using an existing approved provider or a narrowly scoped backend integration. Explain how enquiry information is used. Do not introduce marketing subscriptions or invent a response-time promise.

Acceptance: Accessible labels and errors, length limits, server-side validation, abuse protection, verified delivery, useful failure/retry state, no duplicate sends, and a privacy notice matching the actual storage and recipients. Never present a mailto fallback as a successfully submitted form. Do not reuse unrelated client-reporting data stores or alter their routes.

### 4 Let visitors choose their route and motion

Status: Planned.

Add a compact chapter navigator with clear labels and an accurate active state. Visitors can jump to services, work, team and contact. Add a Less motion choice that uses the existing readable fallback, respects the system setting and keeps the visitor near the same content when switching. Keep the full cinematic experience available.

Acceptance: Keyboard and touch friendly, visible focus, no overlap with text, all destinations reachable, predictable history and back behavior, storage failures handled, and no animation lock or new wheel interception. Check narrow screens and reduced motion separately.

### 5 Build useful service pages and technical SEO

Status: Planned, service scope to be confirmed before detailed copy.

Create one substantive page for each primary service. Explain suitable clients, practical tasks, how the partnership works, what is agreed in scope and how to enquire. Include related approved work and genuine FAQs. Use unique titles, descriptions, canonical URLs and internal links from the homepage. Add accurate organisation structured data and sitemap/robots configuration after checking public versus private routes. Verify Search Console ownership, indexing and sitemap submission through the authorised account.

Do not claim a physical Australian office, fabricate reviews, invent prices, create thin city pages or mark up unsupported ratings. Business Profile is a separate eligibility decision, not an automatic step for an online-only service. Structured data and new pages do not guarantee rankings or rich results.

Acceptance: Direct URLs work, meaningful content is present without JavaScript, semantic headings, correct metadata/schema, no orphan pages or broken links, and only intended public marketing pages are submitted. Client dashboards and APIs stay out of the sitemap; robots is not access control.

### 6 Measure and tune mobile quality

Status: Planned. Capture a baseline before adding heavy showcase assets.

Run repeatable mobile and desktop lab checks, then inspect available real-user data. Review asset dimensions/compression, fonts, initial loading, scroll main-thread work and layout movement. Optimise measured bottlenecks without replacing the cinematic design or adding a new animation framework unnecessarily. Perform a focused accessibility pass covering contrast, focus, reading order and forms.

Acceptance: Record tools, viewport/network settings, baseline and after measurements, remaining limitations and field-data availability. Recheck rapid forward/reverse gestures, long sections, orientation changes, menu/hash navigation, no-JavaScript access and reduced motion. Do not publish an unsupported 'fast' or 'fully accessible' claim.

### 7 Track enquiries and refine the site

Status: Planned, analytics setup and privacy choices required.

Choose a proportionate measurement setup. Track service-page visits, enquiry starts and confirmed submissions; track email clicks separately as contact intent, not delivered enquiries. Never include visitor email addresses or message text in analytics events. Check Search Console queries and indexing alongside enquiry quality before deciding which content to expand.

Acceptance: Event definitions agreed, one event per intended action, no personal data in URLs/events, required notices/consent implemented, no tracking activated without the selected account/configuration, and no false conversion on failure. Establish a baseline before claiming improvement. Use findings for later iterations; recurring monitoring is not enabled by this plan.

## Execution order and review

Complete milestone 1 now. Prepare milestone 2 when the Drive folder arrives; if it is delayed, progress independent measurement or navigation work without substituting fake proof. Resolve receiving-service choices before activating milestone 3. Build detailed service pages after the homepage offering and enquiry route are coherent. Validate each step before moving on.

Keep new dependencies and moving parts minimal. Do not copy competitor layouts, guarantees or pricing. Save milestone outcomes here, including tests, publication state and remaining inputs. Review the roadmap after the showcase and enquiry changes, and again after initial search/enquiry data is available.

## Progress log

- 11 October 2026: Business comparison and source review complete. Milestone 1 implemented locally in `index.html`, with four content regression tests added. All 45 content and cinematic tests pass; `git diff --check` passes. Browser checks at 1440 by 1000, 390 by 844 and 360 by 640 confirm the services shortcut, no horizontal overflow and access to every service card through reading stops. The scroll engines and unrelated Worker/dashboard files are unchanged. The live site has not been updated in this milestone.
- Owner will supply a shared Drive folder for milestone 2. No portfolio samples, new client results, analytics integrations or enquiry backend have been published. Real-user performance and formal accessibility conformance remain unverified.
- 11 October 2026: Owner authorised Step 1 publication. Release `2aacece` pushed through the existing GitHub and Cloudflare deployment. The live homepage returns HTTP 200 with the new title, service cards and services shortcut. All 45 focused tests pass. Root test files are excluded from public assets; the roadmap remains excluded by the existing Markdown rule. Milestone 2 is awaiting the owner's Drive folder.
