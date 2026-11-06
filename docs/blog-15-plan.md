> **Last updated: 2026-10-29 17:10 IST (UTC+05:30)**

# 15-article Force Urbania / Kodaikanal content plan

Brief: [`prompts/blog.md`](../prompts/blog.md). Goal: local search relevance for **Force Urbania rental** in Dindigul, Oddanchatram and Palani, and destination authority for **Kodaikanal**.
Uses the existing pipeline only: Markdown in `content/blog/` → `npm run blog:import` → Supabase `blog_posts` → `/admin` approve + publish. No new tables, CMS or routes.

## Decisions (and why)

| Topic | Decision |
|---|---|
| Brand name | **OG Tours and Travels** in body copy (the verified name in `business.ts`); the brief's "OG Travels" is used only where it shortens an SEO title. |
| Internal URLs | Real routes only: `/`, `/#vehicle`, `/#services`, `/#enquire`, `/#contact`, `/#faq`, `/blog`, `/blog/<slug>`. There is **no** vehicle, services or contact page — the home-page anchors are the equivalents. |
| Links to existing posts | Only to the four **public** local guides (`dindigul-sightseeing-group-tour`, `oddanchatram-palani-kodaikanal-group-trip`, `madurai-airport-dindigul-oddanchatram-transfers`, `group-vehicle-weddings-temple-visits-dindigul-district`). The five starter posts are hidden drafts — linking to them would 404. |
| Facts | Nothing invented (CLAUDE.md rule 4): no seat count, fleet size, prices, years, driver credentials, certifications, branches, reviews. Seating is "confirm with us for your group". Distances are approximate and sources disagree (Dindigul–Kodaikanal ≈ 75–100 km, Palani–Kodaikanal ≈ 65–70 km), so articles give a range, say "check on a map", and give **no travel-time figures**. Berijam Lake: forest permit required, fee/timing "check locally". |
| Overlap with existing posts | `oddanchatram-palani-kodaikanal-group-trip` already covers a combined Palani + Kodaikanal day from Oddanchatram; the new Blogs 6/7 are Kodaikanal-only, transport-led and link to it. Blog 14 (check before booking) is about *vehicle/trip/document checks*; the hidden starter "what to ask" is about *questions to an operator* — different intent, no link needed. |
| Schema | The site already emits `BlogPosting` + `BreadcrumbList` per article and `TravelAgency`/Organization site-wide. `FAQPage` is **not** added to articles: Google limits FAQ rich results to well-known government/health sites, so the FAQ stays as visible on-page Q&A for AEO. No review schema. |
| Images | Only real vehicle photos exist; nothing is fabricated or stock. Registers the two unused-as-cover vehicle photos (`hero.jpg`, `front.jpg`) in `blog-covers.ts` → 7 covers for 15 posts, with Kodaikanal-neutral alt text. Real Kodaikanal photography would need to come from the owner. next/image serves WebP/AVIF automatically. |
| Publishing | Imported as **drafts, `needs-business-review`**. The brief says publish after validation, but the posts contain destination facts and brand claims the owner has not yet read; publishing is a separate explicit step (`npm run blog:status -- approve|publish <slug>`). The site is still `noindex` until the domain is set. |

## The 15 articles

| # | Slug | Primary keyword | Category | Type / words | Main links |
|---|---|---|---|---|---|
| 1 | `urbania-rental-in-dindigul` | Urbania rental in Dindigul | Vehicle Hire | commercial 1,000–1,400 | 15, 5, 14, 4, Dindigul sightseeing |
| 2 | `force-urbania-rental-in-oddanchatram` | Urbania rental in Oddanchatram | Vehicle Hire | commercial | 6, 9, Oddanchatram–Palani–Kodai, transfers |
| 3 | `urbania-rental-in-palani-for-family-and-group-trips` | Urbania rental in Palani | Vehicle Hire | commercial | 7, 12, 4, Oddanchatram–Palani–Kodai |
| 4 | `why-choose-force-urbania-for-family-trip` | Force Urbania rental | Vehicle Hire | informational 1,400+ | 12, 11, 9, 14 |
| 5 | `dindigul-to-kodaikanal-trip-guide` | Dindigul to Kodaikanal trip | Destinations | guide 1,500+ | 1, 15, 8, 10, 13, 9 |
| 6 | `oddanchatram-to-kodaikanal-group-travel-guide` | Oddanchatram to Kodaikanal travel | Destinations | guide | 2, 5, 7, 8, 9 |
| 7 | `palani-to-kodaikanal-family-trip-guide` | Palani to Kodaikanal trip | Destinations | guide | 3, 5, 6, 8, 13 |
| 8 | `best-places-to-visit-in-kodaikanal-with-family` | Kodaikanal sightseeing | Destinations | informational | 10, 13, 5, 6, 7, 9 |
| 9 | `urbania-for-kodaikanal-group-trip` | Urbania for Kodaikanal trip | Vehicle Hire | commercial | 1, 2, 3, 5, 6, 7, 11 |
| 10 | `kodaikanal-trip-planning-guide-for-families` | Kodaikanal tour packages | Travel Planning | guide | 8, 13, 5, 6, 7, 9 |
| 11 | `how-to-choose-the-right-vehicle-for-group-travel` | Urbania for group travel | Group Travel | informational | 9, 4, 12, 14, 15 |
| 12 | `benefits-of-private-urbania-for-outstation-trips` | Urbania outstation rental | Vehicle Hire | informational | 4, 9, 14, 11, 3 |
| 13 | `comfortable-weekend-trip-to-kodaikanal` | Kodaikanal weekend trip | Travel Planning | guide | 10, 8, 5, 6, 7, 9 |
| 14 | `things-to-check-before-booking-an-urbania` | Urbania booking | Vehicle Hire | commercial | 1, 2, 3, 11, 12 |
| 15 | `family-and-group-trip-from-dindigul-travel-guide` | Group travel vehicle Dindigul | Group Travel | commercial | 1, 5, 14, 11, public Dindigul guides |

Every article: unique SEO title (≤ ~60 chars) and meta description (≤ ~160), one H1 (= `title`), H2/H3 structure, question-style headings with a direct first-sentence answer, 4–6 FAQs under `## Frequently asked questions`,
3–6 contextual links, a closing enquiry CTA to `/#enquire`, no repeated paragraphs. Cluster rule: Kodaikanal articles link to the three origin guides (5/6/7) and to Blog 9; origin/rental articles link to their origin→Kodaikanal guide and Blog 9.

## Steps and status

| Step | Status |
|---|---|
| Inspect blog pipeline, routes, config, existing posts, DB state | done |
| Verify local facts from public sources; adopt ranges, no durations | done |
| Write plan (this file) | done |
| Register two extra covers in `src/lib/blog-covers.ts` | done |
| Write 15 Markdown files | done (970–1,700 words; guides in the 1,300–1,700 range, commercial 970–1,110) |
| Validate: import dry run, slug uniqueness, internal-link resolver (`tests/blog-links.test.ts`), heading hierarchy, FAQ counts, keyword placement, metadata uniqueness, banned patterns (prices, years, ratings, durations) | done |
| `npm run blog:import -- --apply` (hidden drafts; 24 posts, 4 public) | done |
| lint · typecheck · 227 tests · production build; render check of all 15 pages in dev | done |
| Refresh Supabase rows after the seoTitle fix (`blog:import -- --apply --overwrite`) | done 2026-10-29 |
| Approve + publish (owner approved 2026-10-29); sitemap/canonical/RSS checked on a local production build with a test domain | done; **redeploy needed** to refresh the live site |

## Known gaps

* Several guides are 100–300 words under the brief's "1,400+" range; padding was avoided on purpose. Extend with owner-supplied facts (real trip experience, verified local details) rather than filler.
* Covers are the existing vehicle photos reused across 15 posts (7 images). No Kodaikanal photographs exist in the repo; none were fabricated.
* "Best" in the Blog 1 title is the brief's wording; it is a superlative claim the owner should be comfortable with.
* `seoTitle` must **not** contain the brand: the site title template appends " | OG Tours and Travels".
* Sitemap inclusion and canonical tags can only be verified after publication and with `NEXT_PUBLIC_SITE_URL` set (drafts are excluded and the site is `noindex` until then).
