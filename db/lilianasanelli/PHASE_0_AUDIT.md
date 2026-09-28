# The Giving Table Reporting Dashboard — Phase 0 Audit

Audit date: 28 September 2026

Repositories reviewed:

- tokipaulo19/arsc-website
- tokipaulo19/arsc-instagram-benchmarking

## Current frontend

The existing Giving Table dashboard was a static, framework-free HTML/CSS/JavaScript implementation in db/thegivingtable/. The expanded reporting dashboard now lives in db/lilianasanelli/, with the former route retained as a compatibility redirect. Before this feature branch, it provided:

- The Giving Table follower count and rank
- Public post count and post-count change
- 30-day+ follower growth once enough history exists
- The Giving Table vs Perfect Events follower-history chart
- A two-account comparison table
- A collection-warning state

It fetched public CSV files directly from the main branch of tokipaulo19/arsc-instagram-benchmarking. The NBA Australia and Personalised Posing dashboards use the same lightweight pattern, with the latter two having extra table filtering/sorting controls.

The pre-change competitor view can always be restored from commit 5d2288631b3bf015d25baa463a45e5339432fea3.

## Competitor pipeline

The Giving Table workflow is .github/workflows/the-giving-table-instagram-tracker.yml in the benchmarking repository.

- Schedule: Monday at 00:00 UTC, documented as 10:00 AM Brisbane time
- Manual refresh: workflow_dispatch
- Configuration-change refresh: pushes affecting the Giving Table config, collector, report generator, or workflow
- Collection: Apify Instagram scraper with APIFY_TOKEN supplied through a GitHub Actions secret
- Outputs: data/thegivingtable/instagram_snapshots.csv, weekly_report.csv, and an optional validation-error file
- Report logic: latest exact snapshot, current ranking, post-count change from the preceding automated snapshot, and follower growth against the newest observation at least 30 days old

The collector writes public profile aggregates only. It does not collect or expose internal Meta insights, ManyChat conversations, GA4 data, customer data, or credentials.

Current Giving Table data contains two tracked accounts and exact weekly snapshots from 13–28 September 2026. The 30-day+ fields are correctly blank because the exact history is not yet old enough.

## Deployment and authentication

The website repository is public. The latest main commit has a successful “Workers Builds: arsc-website” check from the Cloudflare Workers and Pages GitHub App, whose production details identify the arsc-website Worker/service. Live response headers are served by Cloudflare.

The live dashboard route returns HTTP 200 without an access challenge or authentication redirect. No route-level authentication, server-side session logic, client-side password, deployment manifest, or secret-bearing frontend code exists in the repository.

Conclusion:

- The public repository can remain the frontend source.
- The live first-party reporting route and/or its protected API must be placed behind Cloudflare Access or an equivalent server-side identity gate before real internal analytics are connected.
- A browser-held reusable API secret would not be a safe substitute for access control.

## Architecture boundary

Safe to remain public:

- Static dashboard HTML/CSS/JavaScript
- Metric definitions and calculation utilities
- Non-sensitive UI configuration
- A synthetic fixture clearly marked as mock data
- Existing public competitor aggregates and their public GitHub data URL

Must move to private infrastructure in Phase 2:

- Provider credentials and refresh tokens
- Raw Meta/Instagram insights
- GA4 credentials and internal referral/conversion aggregates
- ManyChat exports or API responses
- Meta Ads data and credentials
- Post/provider mapping files when they expose internal campaign planning
- Raw responses, validation quarantine, collection logs, and last-known-good private payloads

Recommended boundary: private arsc-thegivingtable-reporting collectors and storage feeding a protected Cloudflare Worker endpoint, with Cloudflare Access protecting the dashboard route and/or API. Each provider adapter must publish its own health state so one failure cannot blank the full dashboard.

## Conflicts and risks found

1. **Public route vs confidential metrics:** the current deployment is intentionally public. Real first-party analytics cannot be added to public JSON/CSV or bundled into browser JavaScript.
2. **No existing authentication:** production auth is an infrastructure task, not a frontend password task.
3. **Competitor error-path mismatch:** the old frontend requested data/thegivingtable/profile_validation_errors.csv, while the current repository has no such file for The Giving Table. It was optional, so the dashboard continued to work.
4. **Timezone distinction:** the competitor workflow is documented in Brisbane time; client-facing reports must display Australia/Melbourne. UTC should remain the storage standard.
5. **Sparse competitor history:** 30-day+ competitor growth is legitimately unavailable today and must remain N/A rather than zero.
6. **Provider semantic drift:** Meta metrics and video definitions can change. A versioned private metric dictionary and contract tests are required.
7. **Partial-source truthfulness:** stale or failed provider data needs a visible status and must not be silently replaced with zero.
8. **UTM consistency:** referral attribution depends on enforcing the agreed source/medium/campaign/content convention.

## Phase 1 implementation decision

The feature branch keeps vanilla HTML/CSS/JavaScript and preserves the public competitor URL/data contract. First-party reporting uses fixtures/sample_dashboard_payload.json, a normalized synthetic payload that includes deliberate healthy, stale, error, inactive, missing-metric, young-post, and UTM-quality scenarios.

No live credentials, internal analytics, personal data, or client secrets are included.

## Phase 1 verification

Completed before commit:

- JavaScript syntax checks for all modules
- Eight Node tests covering contract shape, reporting periods, null handling, metric formulas, cohort selection, maturity thresholds, and CSV escaping
- JSON parsing of the normalized fixture
- Duplicate-ID and single-H1 checks for the dashboard document
- Secret-pattern scan of the implementation
- Browser console check with no warnings or errors
- Desktop, tablet (768 × 1024), and mobile (390 × 844) visual checks
- Keyboard navigation across tabs
- 14-day and custom-period controls with URL persistence
- Pillar filtering, sortable content table, and young-post toggle
- Missing-metric N/A rendering
- Healthy, stale, failed, and inactive source-state rendering
- Paid Ads inactive empty state
- Live public competitor data, ranking, history, and comparison table
- Metric definitions dialog and deterministic report view

The local in-app browser could not observe the programmatic Blob download event, so CSV serialization is covered by an explicit unit test. The visible export controls invoke that tested serializer.
