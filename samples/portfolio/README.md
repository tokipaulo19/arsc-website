# ARSC six-industry website portfolio

Six independent, buildless websites, each with its own identity and substantial content. Sites guidance informed complete visitor journeys; Imagegen supplied original visuals with a broader mix of people and deliberate photographic framing.

| Website       | Industry         | Experience                                                                                                         |
| ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Aura          | Makeup artist    | Artist story, detailed services, preparation, FAQs, live estimate and consultation preview                         |
| FORM          | Fitness coaching | Three coaching formats, community, first-month process, field notes, week builder and enquiry                      |
| June Vale     | Photography      | Four curated studies, category filters, keyboard lightbox, collection details, prints and enquiry                  |
| Hearth        | Café             | Seasonal/dietary menu filters, coffee programme, team, gatherings, visit details and table preview                 |
| OFFDAY        | Clothing         | Four distinct products, fabric details, size guide, care, category/sort controls, size-aware bag and order preview |
| Circuit Bench | Parts & repair   | Four detailed components, parts bag, build planner, service scope, workshop story and repair-intake preview        |

## Open and preview

Open `samples/portfolio/index.html`, then follow a brand link. Each brand has its own `index.html`, `styles.css` and `app.js`. Classic scripts and explicit links support local files and static hosting. No framework build is required.

For browser testing, run `node samples/makeup-brands/preview.cjs` from the website root and visit `http://127.0.0.1:4173/samples/portfolio/index.html`. Stop the owned server with Ctrl+C.

The original `samples/makeup-brands/index.html` entry mirrors the featured collection. The six earlier makeup shops remain at their original URLs and in `samples/makeup-brands/archive.html`. North Studio interiors and Tidehouse accommodation also remain accessible, linked below the featured gallery. They are not deleted or counted among the current six.

## Research and images

[research.md](research.md) records first-party references and how each informed the content. No brand identity, source images or testimonials were copied.

[assets/prompts.json](assets/prompts.json) records all image prompts, created with built-in Imagegen. The current six use 28 distinct images, with three additional images retained for archived concepts. Four new FORM studies add two close-up portraits and a matched starting-point/finding-a-rhythm pair. Each photo has a separate section role. Gallery thumbnails and selected-item viewers intentionally show their associated image. Source aspect ratios are preserved to avoid clipped heads and clothing. Project image assets are saved in `samples/portfolio/assets/`.

## Motion and customer stories

Circuit Bench has a moving grid, floating PC presentation, animated signal traces, counter-rotating circuit rings, mouse-driven perspective and a three-option component explorer. A replayable terminal sequence introduces the workshop process; it never reads a visitor's hardware or presents actual telemetry.

Hearth has a native SVG latte illustration that travels and rotates through a sticky coffee-story scene as the visitor scrolls. The mobile version keeps the illustration in a dedicated artwork area instead of covering content or controls. Steam and offscreen effects pause when the scene leaves view.

FORM adds two photographic close-up studies and a keyboard-accessible before/after comparison. Its fictional Daniel story represents confidence and routine, not body-composition changes, weight loss or a guaranteed health result. The photographs preserve the same invented person's identity and body proportions.

All six have three customer-perspective examples (18 total), with brand-specific typography and layouts. A visible label beside each collection makes clear that these are authored fictional testimonials, not verified reviews or real customer results. No ratings, review totals or real endorsements are invented.

The three motion-enabled sites share a sticky pause/play control and respect the device's reduced-motion preference. Reduced motion cannot be overridden with the play button. Effects stop in hidden tabs, scroll updates are frame-coalesced, and no animation library or build dependency is required. With JavaScript unavailable, the motion control remains hidden, content stays visible and the CSS animations remain paused.

## Honest demo boundaries

These are fictional portfolio concepts, not real clients, venues, coaches or products. Prices, service policies, hardware specifications, locations, biographies and schedules are illustrative. Generated people do not represent actual clients or staff. No real awards, qualifications, certification or client results are claimed.

Forms show local feedback and never send or retain input. Native `method="dialog"` prevents default HTTP submission without JavaScript. The two new shopping bags stay in memory only and reset after a reload. They distinguish clothing sizes, enforce quantity limits and calculate subtotal plus sample delivery in integer cents. Order summaries stop before payment. The build planner calculates an illustrative price; it does not validate actual components. No payments, real bookings, live inventory, accounts, analytics or backend integrations exist.

## ARSC integration

The six cards in `arsc-portfolio.html` point to `/samples/portfolio/<brand>/index.html` and preserve image framing. Paste them into selected work when ready. The legacy snippet location mirrors these cards. The active ARSC homepage and unrelated working-tree changes are untouched. A GitHub push does not by itself verify production deployment.

## Validation

Run `node --test tests/portfolio-motion.test.cjs tests/portfolio-sites.test.cjs tests/makeup-sites.test.cjs`, or `npm test` for the repository suite. Tests cover routes, anchors, original images/provenance, content depth, product catalogue consistency, bag arithmetic and limits, delivery thresholds, build prices, service calculators, dates and safe form behaviour. Motion tests cover bounded geometry, manual pause, tab visibility, reduced-motion preference changes, comparator endpoints and visibly fictional feedback. Browser verification additionally covers desktop/mobile/tablet layouts, natural image ratios, component selection, boot replay, coffee movement, comparator keyboard use and existing local shopping/build flows.
