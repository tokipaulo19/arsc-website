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

[assets/prompts.json](assets/prompts.json) records all image prompts. Fifteen new WebP assets join the earlier set; the current six use 24 distinct images, with three additional images retained for archived concepts. Each photo has a separate section role. Gallery thumbnails and selected-item viewers intentionally show their associated image. Source aspect ratios are preserved to avoid clipped heads and clothing.

## Honest demo boundaries

These are fictional portfolio concepts, not real clients, venues, coaches or products. Prices, service policies, hardware specifications, locations, biographies and schedules are illustrative. Generated people do not represent actual clients or staff. No real awards, qualifications, certification or client results are claimed.

Forms show local feedback and never send or retain input. Native `method="dialog"` prevents default HTTP submission without JavaScript. The two new shopping bags stay in memory only and reset after a reload. They distinguish clothing sizes, enforce quantity limits and calculate subtotal plus sample delivery in integer cents. Order summaries stop before payment. The build planner calculates an illustrative price; it does not validate actual components. No payments, real bookings, live inventory, accounts, analytics or backend integrations exist.

## ARSC integration

The six cards in `arsc-portfolio.html` point to `/samples/portfolio/<brand>/index.html` and preserve image framing. Paste them into selected work when ready. The legacy snippet location mirrors these cards. The active ARSC homepage and unrelated working-tree changes are untouched. A GitHub push does not by itself verify production deployment.

## Validation

Run `node --test tests/portfolio-sites.test.cjs tests/makeup-sites.test.cjs`, or `npm test` for the repository suite. Tests cover routes, anchors, original images/provenance, content depth, product catalogue consistency, bag arithmetic and limits, delivery thresholds, build prices, service calculators, dates and safe form behaviour. Browser verification additionally covers desktop/mobile layout, natural image ratios, product selection, bag quantity/order flows, programme building, photo filtering/keyboard navigation, reservation and repair previews.
