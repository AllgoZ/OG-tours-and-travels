> **Last updated: 2026-10-23 16:25 IST (UTC+05:30)**

# Local SEO plan — Oddanchatram and Dindigul

Goal: rank for group-travel and vehicle-hire searches around **Oddanchatram** and **Dindigul** (Tamil Nadu) with useful, honest articles,
and make `robots.txt` / `sitemap.xml` as crawler-friendly as the safety rules allow.

Rules that shape the work (see `CLAUDE.md`): nothing invented (no prices, fleet size, years in business, reviews, addresses);
articles ship as **drafts needing business review** — the owner approves and publishes in `/admin`; the noindex-until-domain gate stays;
GA4/GTM stay in the GTM container.

## Plan

| # | Step | Status |
|---|---|---|
| 1 | Verify local facts (towns, distances, attractions, airports/rail) from public sources; use approximate distances and say "check on a map" | done |
| 2 | Pick four articles, one search intent each, cross-linked (below) | done |
| 3 | Write the four Markdown files in `content/blog/` (`draft: true`, `reviewStatus: needs-business-review`, existing bundled covers, no invented facts) | done |
| 4 | Validate with the import **dry run** (`npm run blog:import`); load into Supabase as unpublished drafts only if the dry run is clean | done |
| 5 | Sitemap: `lastModified` on static routes (newest-post date), keep unpublished/noindex pages out | done |
| 6 | robots.txt reviewed: already allow-all + `Disallow: /admin` + sitemap + host, CSS/JS/images not blocked, noindex gate intact — left unchanged (covered by tests) | done |
| 7 | Tests for sitemap/robots behaviour; lint, typecheck, build clean, 170 offline tests pass; live-DB tests pending (blocked by orphaned test sessions, see handover) | partly |
| 8 | Docs (`seo-aeo.md`, `handover.md`, README of `content/blog`), update this plan | done |

## Articles

| Slug | Search intent | Main places | Links to |
|---|---|---|---|
| `oddanchatram-palani-kodaikanal-group-trip` | Day trip / weekend from Oddanchatram | Palani, Kodaikanal | Dindigul sightseeing, transfers |
| `dindigul-sightseeing-group-tour` | What to see in Dindigul with a group | Rock Fort, Abirami Amman, Thadikombu, Sirumalai, Kamarajar lake | Oddanchatram trip, transfers |
| `madurai-airport-dindigul-oddanchatram-transfers` | Getting to Dindigul/Oddanchatram from airports and stations | Madurai, Tiruchirappalli, Coimbatore, Dindigul Junction | Both trip guides |
| `group-vehicle-weddings-temple-visits-dindigul-district` | Function and pilgrimage transport | Weddings, family functions, temple circuits | Existing events + Urbania posts |

## Open items for the owner

* Confirm that OG Tours and Travels is based at/serves Oddanchatram and Dindigul, then set `serviceArea` / `areaServed` in `src/config/business.ts`
  (this feeds the footer and `TravelAgency` JSON-LD — the strongest local-SEO signal, deliberately left empty until confirmed).
* Review every claim in the four drafts, then approve + publish in `/admin`. Replace the generic covers with real photos when available.
* Google Business Profile (`googleBusinessProfileUrl`) and genuine reviews.
