> **Last updated: 2026-11-05 11:00 IST (UTC+05:30)**

# 15-article Dindigul-focused content plan (batch 2)

Follows [`blog-15-plan.md`](blog-15-plan.md) and the brief [`prompts/blog.md`](../prompts/blog.md). Goal: deepen local search relevance for **Force Urbania / Urbania rental in Dindigul** and its
adjacent intents (van hire, outstation, travels in Dindigul, Dindigul→Kodaikanal/Palani/Sirumalai), without duplicating batch 1. Same pipeline: Markdown in `content/blog/` →
`npm run blog:import` → Supabase `blog_posts` → `blog:status approve|publish`. No new tables, routes or CMS.

## Decisions

| Topic | Decision |
|---|---|
| Overlap with batch 1 | Batch 1 already owns "Urbania rental in Dindigul", "Dindigul to Kodaikanal trip" and "Group travel vehicle Dindigul". Each new post takes a **different intent**: transport-led vs destination-led, one-day vs two-day, family vs team vs elders, FAQ hub, comparison. Every new post links to the batch-1 guide it complements. |
| Locations | Dindigul is the origin in all 15; destinations are Kodaikanal, Palani and Sirumalai. Madurai and Dharapuram are not targeted (Madurai appears only through the existing airport-transfer link). |
| Facts | Nothing invented (CLAUDE.md rule 4): no seat counts, fleet size, prices, years, driver credentials, certifications, branches or reviews. Public-source facts used, all hedged ("sources differ, check on a map"): Dindigul–Kodaikanal ≈ 75–100 km via Batlagundu and the SH-156 ghat; Dindigul–Palani ≈ 58 km; Sirumalai ≈ 25 km with ≈ 18 hairpin bends; Palani has steps, a winch railway and a ropeway (timings and fares: check locally); Kodaikanal flower show in May at Bryant Park; no fuel on the ghat stretch; winter Nov–Feb, summer Mar–Jun, monsoon Jun–Sep. No journey-time or fare figures anywhere. |
| Comparison post | The Urbania/Tempo Traveller/cars article is qualitative only; it states that Force Motors makes both models, that seating differs by configuration and that the operator must confirm the exact vehicle. It makes no feature claims about OG Tours and Travels' vehicle beyond what the site already shows. |
| Links | Real routes only (`/#enquire`, `/#vehicle`, `/blog/<slug>`), each target a published post. `tests/blog-links.test.ts` checks every link. Hidden starter posts are never linked. |
| Back-links | Three public batch-1 posts gained a "more guides" block/sentence linking to the new cluster, so the new posts have inbound links (every new post has at least one inbound link from another new or batch-1 post). |
| Schema | Unchanged: the site emits `BlogPosting` + `BreadcrumbList` per article and the `TravelAgency` site-wide. No `FAQPage` (Google limits it to government/health sites) and no review schema. |
| Images | The seven existing real vehicle photos are reused with honest alt text; no stock or fabricated images. |
| Style | `seoTitle` excludes the brand (the template appends ` | OG Tours and Travels`). No Markdown task lists (the sanitiser strips checkboxes). |

## The 15 articles

| # | Slug | Primary keyword | Category | Complements (batch 1) |
|---|---|---|---|---|
| 1 | `force-urbania-van-hire-dindigul-for-family-trips` | Force Urbania van hire Dindigul | Vehicle Hire | `urbania-rental-in-dindigul` |
| 2 | `outstation-van-rental-dindigul-how-it-works` | Outstation van rental Dindigul | Vehicle Hire | `benefits-of-private-urbania-for-outstation-trips` |
| 3 | `how-to-choose-travels-in-dindigul` | Travels in Dindigul | Group Travel | `things-to-check-before-booking-an-urbania` |
| 4 | `dindigul-to-kodaikanal-travels-by-urbania` | Dindigul to Kodaikanal travels | Destinations | `dindigul-to-kodaikanal-trip-guide` |
| 5 | `dindigul-to-palani-temple-trip-by-urbania` | Dindigul to Palani trip | Destinations | `palani-to-kodaikanal-family-trip-guide` |
| 6 | `dindigul-to-sirumalai-day-trip-by-van` | Sirumalai day trip from Dindigul | Destinations | `dindigul-sightseeing-group-tour` |
| 7 | `urbania-for-office-and-college-outings-dindigul` | Group tour vehicle Dindigul | Group Travel | `how-to-choose-the-right-vehicle-for-group-travel` |
| 8 | `urbania-for-senior-citizens-trips-from-dindigul` | Dindigul senior citizens trip vehicle | Travel Planning | `why-choose-force-urbania-for-family-trip` |
| 9 | `one-day-kodaikanal-trip-from-dindigul` | One-day Kodaikanal trip from Dindigul | Travel Planning | `best-places-to-visit-in-kodaikanal-with-family` |
| 10 | `two-day-kodaikanal-trip-from-dindigul` | Two-day Kodaikanal trip from Dindigul | Travel Planning | `comfortable-weekend-trip-to-kodaikanal` |
| 11 | `kodaikanal-ghat-road-tips-for-group-travel` | Kodaikanal ghat road | Travel Planning | `urbania-for-kodaikanal-group-trip` |
| 12 | `best-time-to-visit-kodaikanal-from-dindigul` | Best time to visit Kodaikanal | Travel Planning | `kodaikanal-trip-planning-guide-for-families` |
| 13 | `urbania-vs-tempo-traveller-vs-cars-for-dindigul-groups` | Urbania vs Tempo Traveller | Group Travel | `how-to-choose-the-right-vehicle-for-group-travel` |
| 14 | `dindigul-urbania-booking-faq` | Urbania booking Dindigul | Vehicle Hire | `urbania-rental-in-dindigul` |
| 15 | `dindigul-railway-station-group-pickup-urbania` | Dindigul railway station pickup | Airport Transfers | `madurai-airport-dindigul-oddanchatram-transfers` |

Every article: unique SEO title and description, one H1 (= `title`), question-style H2s, five FAQs, 5–16 internal links, a closing enquiry CTA to `/#enquire`.

## Steps and status

| Step | Status |
|---|---|
| Read brief, batch-1 plan, 9 related published posts; research Dindigul/Sirumalai/Palani/Kodaikanal facts (public sources) | done |
| Write 15 Markdown files (910–1,040 words each) | done |
| Validate: slug uniqueness, link resolver test, H1 count, FAQ count, metadata lengths, banned patterns (prices, years, durations, ratings), inbound links | done |
| Back-links in three batch-1 posts | done |
| `blog:import -- --apply --overwrite` (15 inserted, 3 updated, 0 failed) | done 2026-11-05 |
| `blog:status approve` + `publish` for each of the 15 | done 2026-11-05 (34 public) |
| lint · typecheck · 257 tests · production build; HTTP check of all 15 pages (status, H1, canonical, robots, JSON-LD, alt, sitemap, RSS, listing, 30 links) | done |
| Redeploy on Vercel; set `NEXT_PUBLIC_SITE_URL`; Search Console | **owner** |

## Known gaps

* Articles are 910–1,040 words, under the brief's 1,000–1,400 (commercial) and 1,400+ (guides) ranges. Extend with owner-supplied facts (real trips, verified local details), not filler.
* Cover images are the same seven vehicle photos reused across 34 posts; no Kodaikanal/Sirumalai/Palani photography exists in the repo.
* Facts about Sirumalai, Palani arrangements and Kodaikanal seasons come from public web sources that disagree; the owner should read them before relying on them.
* The page `<title>` is the `seoTitle` plus the site suffix, so some are 70–80 characters; Google may truncate the longest in results.
* Mobile rendering and axe were not re-run (the QA runner kills all node processes). Indexing is unverified.
