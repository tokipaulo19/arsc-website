# Archived ARSC beauty website portfolio

Six fictional makeup brands, each with an independent static page, stylesheet and script.

These shops are now archived concepts. The featured collection is the mixed-industry portfolio at `../portfolio/index.html`. This folder's `index.html` also points visitors to that new collection. Open `archive.html` to browse the six original beauty shops.

| Website | Route | Design | Signature interactions |
| --- | --- | --- | --- |
| Veloura | `veloura/index.html` | Cream and burgundy boutique, centred typography, staggered catalog | Collection filters, mood-based two-product edit |
| Mizu | `mizu/index.html` | Aqua product lab, split screen, restrained technical typography | Keyboard-accessible formula tabs, routine builder with live total |
| Poplash! | `poplash/index.html` | Coral pop collage, bold type, outlined cards and clashing colour | Category filters, price sorting, illustrated look mixer, shuffle |
| Terra Tone | `terra-tone/index.html` | Earthy studio, sidebar navigation, product index | Two-step depth and undertone finder, shade recommendation and add |
| Nocturne | `nocturne/index.html` | Dark experimental archive, oversized type, fixed narrow rail | Object selector, flash/studio preview, editorial reading dialogs |
| Sunday Studio | `sunday-studio/index.html` | Warm lifestyle journal, soft green, arched photography | Bundle calculator, routine duration, timer, checklist, journal dialogs |

## Open or host

Open `archive.html` for this collection, or any brand's `index.html` directly. Explicit HTML links and classic scripts also work from a local file URL. Use a static server for browser testing, or serve the folder under the existing ARSC assets deployment.

For local browser testing, run `node samples/makeup-brands/preview.cjs` from the website root, then open `http://127.0.0.1:4173/samples/makeup-brands/index.html`. Stop the server with Ctrl+C when finished.

Each page is visitable at `/samples/makeup-brands/<brand>/index.html` once deployed through the ARSC hosting workflow. This repository update does not by itself prove production deployment.

## Add to ARSC selected work

The existing ARSC home page has ongoing edits. The integration snippet in `arsc-portfolio.html` now features the six mixed-industry websites. It matches the canonical snippet at `../portfolio/arsc-portfolio.html` and reuses the current `work-card` / `work-caption` conventions.

The gallery and all six pages have links back to ARSC or the portfolio collection.

## Shared shopping flow

The shared files contain only small accessibility and shopping utilities, not a shared page template. Each brand supplies its own catalog and design:

- Real product dialogs with shade choices and add-to-bag actions.
- Product search with matching products and shades.
- Independent saved bags per brand, quantity controls and exact AUD totals.
- A final demo order summary. No payments, orders or network form submissions.
- Honest form feedback; a demo email is never sent or retained.

Campaign images are original AI-generated concept artwork from the initial collection. All brand stories, product descriptions and prices are illustrative portfolio content.

## Validation

Run `node --test tests/makeup-sites.test.cjs` from the ARSC website root. The tests cover shopping arithmetic, variants, removal, safe restoration, explicit entry points and local links/assets. Browser QA covers the six distinct tools and responsive layouts.

