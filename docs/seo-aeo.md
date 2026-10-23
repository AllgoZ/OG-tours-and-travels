# SEO and AEO — audit, changes and decisions

No rankings, citations or traffic are promised here. These are technical-quality and clarity measures.

## Initial audit (before this work)

Already good: per-page titles/descriptions via a template; canonical/OG/Twitter metadata; production-domain
safety gate (no `siteUrl` ⇒ `noindex`, `robots: disallow /`, empty sitemap); `TravelAgency` + `WebSite` JSON-LD with only
confirmed data; `BlogPosting` + `BreadcrumbList` on articles; RSS; one H1 per page; alt text; real 404s; content in server HTML.

Issues found:

1. JSON-LD serializer escaped only `<` (not `>`, `&`, U+2028/2029).
2. Paginated blog pages (`/blog/page/n`) were `noindex` **and** carried a self-canonical, while a comment claimed the canonical
   pointed at `/blog` — contradictory signals.
3. The visible FAQ had no matching `FAQPage` structured data.
4. Twitter card had no explicit image on articles.
5. YAML dates from front matter reached the UI as `Date` objects (inconsistent serialisation); `formatDate` depended on the
   server timezone.
6. Article HTML was injected unsanitised — acceptable for repo-authored files only, **not** for database content.
7. The blog index was always in the sitemap and indexable even with zero articles (thin page).
8. A stray `# ` in a post body would create a second H1.

## Implemented

| Area | Change |
|---|---|
| Content source | Supabase-backed blog (see `docs/supabase-blog.md`); drafts / unreviewed / future posts can never reach HTML, JSON-LD, RSS or the sitemap (enforced by RLS **and** re-checked in code) |
| Security of content | Allow-list HTML sanitiser for article bodies; H1 demotion; heading ids from plain text |
| JSON-LD | Builders extracted to `src/lib/seo.ts` and unit-tested; serializer escapes `< > &` and U+2028/2029; article schema generated from the same record that is rendered; added `inLanguage`; `FAQPage` added for the visible FAQ (answers are identical to the page copy) |
| Pagination | `/blog/page/n` is `noindex, follow` with no conflicting canonical |
| Empty journal | `/blog` is `noindex` and omitted from the sitemap until an approved article exists; page shows a friendly note |
| Metadata | Article Twitter card now includes the image; dates normalised to ISO and formatted in IST deterministically |
| Safeguards kept | No-domain `noindex`/robots/sitemap gate unchanged and covered by tests |
| Quality gates | `check:launch` now verifies Supabase config and reports how many articles are public |

Added with the CMS: `/admin` is `noindex` (header + meta), `Disallow: /admin` in `robots.txt`, never in the sitemap; an article's uploaded cover is used
as its Open Graph / Twitter / JSON-LD image (else the site-wide image); renamed articles keep a permanent 308 redirect so no URL breaks.

Not done on purpose: `TouristTrip` (no genuine itinerary/package pages exist), author `Person` schema (no verified authors;
articles use the business as author), ratings/reviews/prices/hours in schema (nothing verified), destination pages.

## Answer-engine (AEO) guidance

* Keep Markdown as the canonical article format. Write direct, specific answers under descriptive `##` headings; add
  short factual summaries first. Cite authoritative sources for any time-sensitive fact (fares, permits, distances, rules).
* The FAQ answers are deliberately conservative (no invented policies/prices). Add real policies to `src/content/faq.ts`
  only when the owner confirms them — the `FAQPage` data follows automatically.
* Fill `serviceArea`, `areaServed`, `address`, `googleBusinessProfileUrl` and `vehicle.specs` in `src/config/business.ts` with
  **verified** facts; they feed the footer and `TravelAgency` schema and are the strongest entity signals available.
* Internal linking: articles already link to the enquiry form and to each other; related/previous/next are generated.

### `llms.txt` — evaluated, not added

An experimental convention with no confirmed effect on search or AI answers. Cost is low but so is evidence; revisit if a
specific AI product documents using it. Not a launch requirement.

### AI crawlers — no policy change

Search indexing bots (e.g. Googlebot, Bingbot) and model-training crawlers (e.g. GPTBot, ClaudeBot, Google-Extended,
CCBot) are separate decisions. `robots.txt` currently allows all crawlers once a domain is set. Whether to block training
crawlers is a **business decision** for the owner; if they choose to, add per-agent rules in `src/app/robots.ts`.

## Analytics and conversions — Google Tag Manager installed

Google Tag Manager (container `GTM-K42Z4THV`) is installed on every public page (including the 404) and never on `/admin`.
Implementation: `src/components/analytics/GoogleTagManager.tsx` (rendered first in `SiteChrome`: `<noscript>` iframe + `next/script`
`afterInteractive` loader) and `src/lib/gtm.ts`. It loads **only** in a production build with `NEXT_PUBLIC_SITE_URL` set and a valid
`GTM-XXXX` ID, so dev, previews and staging never send data. Override or disable with `NEXT_PUBLIC_GTM_ID` (`off`).

What the code deliberately does **not** do — all of it is configured in the GTM container:

* **Tags** (GA4, conversions): add them in GTM and publish a container version. Nothing is tracked until then.
* **Consent.** No banner or Consent Mode is built in. Decide with the owner what the audience needs (India's DPDP Act, any EU/UK visitors)
  and gate tags in GTM accordingly (Consent Mode v2 + a CMP tag, or a banner that pushes to `dataLayer`).
* **Page views** in this App Router site are client-side navigations: use GTM's *History Change* trigger (or GA4 enhanced measurement).
* **Events** on the existing CTAs (`click_whatsapp`, `click_call`, form start/redirect) can be built in GTM from link click triggers
  (`a[href^="https://wa.me/"]`, `a[href^="tel:"]`). The form only opens WhatsApp — never label it a completed enquiry or booking.

The privacy policy switches to wording that discloses Google Tag Manager while it is active; have the owner review it and set `privacyUpdated`.

## Search Console, domain and GA4 setup (requires owner access — not done)

1. Buy/point the production domain; set `NEXT_PUBLIC_SITE_URL` in the host; redeploy.
2. Google Search Console → add a **Domain** property → verify via DNS TXT record (needs DNS access).
3. Submit `https://<domain>/sitemap.xml`; inspect the home page and one article URL; request indexing.
4. Run the live URL through Google's Rich Results Test (should show `FAQPage`, `BlogPosting`, `BreadcrumbList`).
5. Create/verify the Google Business Profile and put its URL in `googleBusinessProfileUrl`.
6. Link GA4 to Search Console (the GA4 property exists — see below).

### GA4 — property exists, tag goes in GTM

GA4 web stream **OG TRAVELS** (stream URL `https://www.ogtravels.in`, Measurement ID `G-JMDL8MDC6E`; the ID is public by design, like the GTM ID).
Per the one-third-party-script rule the `gtag.js` snippet is **not** pasted into the code — GA4 is delivered through the GTM container the site already loads. In GTM (`GTM-K42Z4THV`):

1. Tags → New → **Google tag** → Tag ID `G-JMDL8MDC6E` → trigger **Initialization – All Pages**. (Do not also add the raw `gtag.js` snippet to the site: that double-counts.)
2. Leave *Enhanced measurement* on in the GA4 stream (page views on History Change, outbound clicks, etc.), or add a *History Change* trigger → GA4 event tag `page_view`.
3. Optional events: link-click triggers for `a[href^="https://wa.me/"]` → `click_whatsapp` and `a[href^="tel:"]` → `click_call`; mark them as key events in GA4.
4. **Preview** (Tag Assistant) on the live domain, confirm the GA4 tag fires and no hits come from `/admin`, then **Submit/Publish** the container version.
5. In GA4 → Admin → Data collection, confirm the stream shows "data flowing" (Realtime) after the first visit.

Production domain: the stream URL implies **`https://www.ogtravels.in`**. It is set only through the host env var `NEXT_PUBLIC_SITE_URL` (Vercel **Production** only, type Config) — not hard-coded — and GTM/GA load only once it is set. Set it on Production, redeploy, then verify.

Not yet done: setting `NEXT_PUBLIC_SITE_URL`, the GTM tag/publish, Search Console, the Google Business Profile.

## Local SEO — Oddanchatram and Dindigul (2026-10-23)

Four location-focused articles (Palani/Kodaikanal group trip, Dindigul sightseeing, airport/station transfers, weddings and temple visits) were added as
**hidden drafts needing business review** — see `docs/local-seo-plan.md` for the plan, search intents, internal-link map and owner to-dos.
Design choices: each article answers one question, has a visible FAQ-style section, links to the others and to `/#enquire`; distances are approximate
and say so; no prices, fleet size or claims about the business that the config does not hold.

* **Sitemap** (`src/app/sitemap.ts`): home and `/blog` carry `lastModified` = newest published article (omitted when there are none); `/blog`
  appears only once an article is public; paginated `/blog/page/n` (noindex) and `/admin` never appear. Google ignores `priority`/`changefreq`; they are harmless hints.
* **robots.txt** (`src/app/robots.ts`): unchanged — allow all, `Disallow: /admin`, `Sitemap:` and `host` once the domain is set; `Disallow: /` before that. CSS/JS/images are not blocked.
  AI-crawler rules remain a business decision (see above).
* Strongest remaining local signal: confirm and fill `serviceArea` / `areaServed` in `src/config/business.ts` (feeds `TravelAgency` JSON-LD), then the Google Business Profile.
