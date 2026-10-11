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
