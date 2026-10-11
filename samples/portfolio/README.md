# ARSC mixed-industry website portfolio

Six independent, buildless websites replace the beauty-only collection as the featured portfolio. The Sites design guidance informed separate visitor journeys rather than a shared commerce template.

| Website      | Industry               | Interactive experience                                                               |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------ |
| Aura         | Makeup artist          | Service selection, bridal-trial toggle, live estimate, consultation preview          |
| FORM         | Fitness coaching       | Goal and session selection, training-week builder, plan preview, demo enquiry        |
| June Vale    | Photography            | Category filters, story lightbox, previous/next and keyboard arrows, demo enquiry    |
| Hearth       | Café                   | Coffee/breakfast/lunch menu, vegan/vegetarian filters, table-request preview         |
| North Studio | Interiors              | Project selector, concept floorplans and materials, scope/area design-fee calculator |
| Tidehouse    | Boutique accommodation | Room capacity rules, live stay total, departure date, sample day planner             |

## Open and preview

Open `samples/portfolio/index.html`, then follow a brand link. Each brand has its own `index.html`, `styles.css` and `app.js`; classic scripts and explicit HTML links support local files and static hosting.

For browser testing, run `node samples/makeup-brands/preview.cjs` from the website root. Visit `http://127.0.0.1:4173/samples/portfolio/index.html`. Stop the server with Ctrl+C.

The original `samples/makeup-brands/index.html` entry also displays the new featured collection. The six previous makeup shops are preserved at their original URLs and linked from `samples/makeup-brands/archive.html`. Their legacy repeated product campaign images remain archival, not part of the featured six.

## Images

Twelve original images were made with the built-in Imagegen tool and saved as web-optimised WebP files in `assets/`. Full prompts and filenames are in [assets/prompts.json](assets/prompts.json). Fictional adult people and scenes are clearly identified as AI-generated, not real clients or commissioned photography.

Each static image has one role within its website. Hero images may appear as gallery thumbnails; photo lightboxes intentionally open the selected photo. No hero is reused to fill unrelated content sections, and no photo is shared between the six businesses. The complete featured image set is under 3 MB.

## Safety and limitations

These are fictional portfolio concepts, not real clients or venues. Prices, locations, services, interior plans and schedules are illustrative. Fitness content is a sample programme structure, not a prescription.

Enquiry forms prevent submission, show local demo feedback and never send or retain personal information. Native `method="dialog"` prevents default HTTP submission if JavaScript is unavailable. Calculators and forms require JavaScript. There are no payments, actual availability checks, bookings, accounts, analytics or backend services.

The pages are ready to host at `/samples/portfolio/<brand>/index.html`; a GitHub push does not itself verify production deployment.

## ARSC integration

Copy the six cards from `arsc-portfolio.html` into selected work when ready. They use the existing `work-card` and `work-caption` structure. The older snippet location also points to the mixed collection. The active ARSC homepage and unrelated work are untouched.

## Validation

Run `node --test tests/portfolio-sites.test.cjs tests/makeup-sites.test.cjs`, or `npm test` for the repository suite. Automated checks cover calculations, boundaries, invalid selections, dates, routes, safety and unique optimised assets. Browser checks cover the six distinct flows and desktop/mobile layouts.
