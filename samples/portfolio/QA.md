# Expanded six-site validation

Verified locally on 12 October 2026, before the GitHub push. This is not production-deployment verification.

## Automated

- Focused portfolio/legacy suite: **17 passed**, none failed.
- Complete repository suite: **112 passed**, none failed.
- Local links, section anchors, styles, scripts and images resolve for all six featured sites.
- Each website has 9–11 substantive sections, detailed FAQs and its own footer navigation. The source contains approximately 1,185–1,548 words per website, including labels and supporting content.
- All 24 featured images have distinct file hashes and recorded generation prompts. Three additional images remain with the older interior/accommodation concepts; all 27 WebP assets total 3,850,140 bytes.
- Tests cover product/card consistency, exact-cent bag totals, size variants, quantity removal and limits, delivery thresholds, build upgrades, existing service calculators, date boundaries and non-submitting forms.

## Browser

Desktop: default browser viewport, 1,265 px document width. Mobile: 390 × 844 viewport override, 375 px document width after scrollbar. All six sites and the gallery were checked for horizontal overflow and visible image failures. No overflow was found. Loaded main photos retained their natural aspect ratios; the previously clipped June/Hearth gallery photos now show the complete composition.

| Journey                  | Observed result                                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OFFDAY category/sort     | Tops returns two pieces; low-to-high puts the $49 tee before the $89 shirt.                                                                                                                              |
| OFFDAY product/bag       | Add is disabled until a size is chosen. One M tee totals $59 with delivery; four total $196 with delivery waived. The order preview lists the selection and confirms no purchase. Reload resets the bag. |
| Circuit parts bag        | G8 graphics adds at $349 with delivery waived; decreasing its last unit returns the empty-bag state.                                                                                                     |
| Circuit build planner    | Creator, 32 GB and 2 TB produces $2,369; the review distinguishes a sample price from component compatibility or a real quote.                                                                           |
| Circuit repair intake    | Laptop + slow/unstable returns the selected device, issue and description. Script-like sample input is displayed as literal text, not executed. No request is sent.                                      |
| FORM programme/enquiry   | Return-to-training + four sessions produces four named sessions at $149/month. Enquiry confirms no data sent or saved.                                                                                   |
| Aura bridal consultation | Three people plus a trial produces $770 and the correct date/service summary.                                                                                                                            |
| Hearth menu/table        | Vegan breakfast shows Green morning toast. Four guests produces the correct date/time request preview without a reservation.                                                                             |
| June stories             | Weddings returns two stories; next and keyboard arrows cycle between them, and Escape dismisses the dialog. Viewer order matches the page order.                                                         |
| Mobile product dialog    | Component image, specifications and controls fit the dialog without horizontal overflow.                                                                                                                 |

Captured browser error logs for the tested shopping, repair and photography flows were empty. Screenshots were saved in the local ARSC previews folder for handoff. The original user browser tab was not changed.

## Boundaries

Forms and bags are deliberately local demonstrations. There are no actual orders, payments, appointment bookings, inventory checks, memberships, email delivery or repair jobs. The active ARSC homepage and unrelated local edits were not included in this change. Earlier concepts remain at their original routes.

## Motion and customer-story expansion

Verified locally on 12 October 2026 after the content expansion above. This remains local verification, not a production deployment check.

- Focused portfolio/motion/legacy suite: **24 passed**, none failed.
- Repository suite: **131 passed**, none failed, including unrelated existing working-tree tests.
- All six customer-story sections were checked at the default desktop width (1,265 px) and at 390 × 844 mobile (375 px content width). Each has three quotes and a visible fictional-testimonial label; no horizontal overflow or failed loaded images was observed.
- The motion-enabled FORM, Hearth and Circuit pages also passed overflow checks at 768 × 1,024 tablet (753 px content width).
- The collection now has 28 distinct featured photographs and three archive images. All 31 WebP files total **4,227,074 bytes**; generation prompts and the paired-photo reference are recorded in `assets/prompts.json`.

| Interaction                           | Observed result                                                                                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Circuit component explorer            | Core, memory and storage buttons update selected styling, description and pressed state. Signal dash offsets and circuit-ring rotation change while visible.                                                    |
| Circuit motion pause                  | Body state becomes stopped, rings/traces pause, boot replay disables, and effects resume with play. The hardware explorer remains usable.                                                                       |
| Circuit terminal replay               | Four lines enter with staggered opacity. Text identifies a visual workshop sequence, not actual device boot, telemetry or diagnosis.                                                                            |
| Circuit shop/build with motion paused | Empty bag dialog opens and closes normally. Creator + 32 GB + 2 TB still calculates $2,369.00; pause does not disable commerce controls.                                                                        |
| Hearth scroll                         | Cup transform changes position and angle through the coffee-story scene. The desktop artwork stays in its dedicated sticky column; mobile uses an in-flow scene, not an overlay on menu controls.               |
| Hearth pause                          | Cup settles to a static -18° composition, steam pauses, and play restores scroll-linked positioning.                                                                                                            |
| FORM comparison                       | Keyboard Home/End reach 0/100; arrows adjust one step, Page Up adjusts ten. The midpoint is 50/50. Output, clip position and accessible value description agree. A pointer click also updates the native range. |
| New FORM photographs                  | Two close-up studies and both story photographs load at 1,400 × 1,050. Comparison and close-up layouts preserve their 4:3 source ratio; labels do not overlap on mobile.                                        |

Manual pause/resume was exercised in the actual browser. OS reduced-motion changes, hidden-tab state, frame coalescing and offscreen cancellation are covered by automated fixtures; the user's OS setting was not changed. CSS also pauses animated descendant pseudo-elements. Without JavaScript, controls stay hidden and content remains visible.

Browser error logs for the exercised Circuit, FORM and Hearth flows were empty. Updated screenshots are in the local ARSC previews folder. Temporary viewport overrides were reset; the original user tab was not altered. Customer stories are invented sample copy, and the before/after is a fictional confidence/routine study rather than evidence of body transformation or training effectiveness.

## Fitness photo and Shopify-style storefront revision

Verified locally on 12 October 2026. This supersedes the earlier FORM comparison rows: the complete section, its JavaScript, CSS and two paired image files have been removed. They remain recoverable from Git history.

- Focused portfolio/storefront/motion/legacy suite: **28 passed**, none failed.
- Complete repository suite: **137 passed**, none failed, including unrelated existing working-tree tests.
- FORM hero is real licensed stock photography by Airam Dato-on, with source and license recorded in `assets/prompts.json` and a visible footer credit. Its 1200 × 1800 full frame is preserved; the athlete is not identified as the fictional coach, a client or an endorser. No new AI image was generated.
- The six sites now use 26 distinct featured images. All 29 WebP assets, including three archive images, total **3,966,780 bytes**.
- OFFDAY was checked at default desktop (1265 px document), mobile 390 × 844 (375 px document) and tablet 768 × 1024 (753 px document). No horizontal overflow was observed. Hero and product photos preserve source ratios. The mobile headline was corrected after browser inspection; product-dialog titles match the shop typography.
- Header Search focuses the collection field. `NAVY shirt` returns the shirt; choosing Bottoms then shows the empty-results feedback. All pieces plus an empty query restores four items. Low-price sorting gives tee, shirt, trouser, overshirt.
- Add remains disabled until a size is selected. An M tee produces a $59 total with delivery; increasing it to two gives $108 and the correct order summary. An L tee also adds successfully on mobile. The mobile dialog is 324 px wide, with an equal scroll width and no horizontal clipping.
- FORM has zero comparator elements and retains three visibly fictional customer quotes. It has no overflow at desktop or mobile, and its hero ratio stays 2:3.
- Circuit shared-shop regression check: Storage returns one item, its detail view opens and the $99 NV1 drive produces a $114 bag total including delivery. Browser error logs for the exercised flows were empty.

The original user browser tab was untouched. Testing tabs were closed, viewport overrides reset and the owned preview server stopped. ARSC homepage changes and other unrelated local edits are excluded from this update. GitHub publication is not proof of production deployment.
