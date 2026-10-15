# Launch checklist — information to confirm with the owner

Run `npm run check:launch` for a live report. Items default to `null` / empty in
[`src/config/business.ts`](src/config/business.ts) unless noted.

## Already configured

- [x] **WhatsApp number** — `+91 81108 11003` (`wa.me/918110811003`)
- [x] **Call number** — `+91 81240 12407` (`tel:+918124012407`)

These are shown on the vehicle and were confirmed by the owner. The two are kept separate
throughout (WhatsApp enquiries vs phone calls).

## Required before launch

- [ ] **Production domain** (e.g. `https://www.ogtoursandtravels.com`) → set `siteUrl` /
      `NEXT_PUBLIC_SITE_URL`. Until it is set the site stays `noindex`, with no sitemap or canonical.

## Strongly recommended

- [ ] **Service area**: footer text (`serviceArea`) and structured-data list (`areaServed`).
- [ ] **Business address**, if the business wants one published (local SEO; must match the Google
      Business Profile exactly).
- [ ] **Google Business Profile URL** (`googleBusinessProfileUrl`).
- [ ] **Services**: confirm all four (Outstation, Family & Group, Airport Transfers, Events &
      Corporate) are offered; set `enabled: false` on any that are not.
- [ ] **Vehicle specifications** (seating, luggage, A/C, amenities): add only owner-verified facts
      to `vehicle.specs`. Nothing is shown until then.
- [ ] **Google reviews**: paste **genuine** reviews into `reviews` in `src/config/business.ts` and set
      `verified: true` on each. The scrolling reviews section is hidden on the live site until there is
      at least one verified review (the sample entries only show in `npm run dev`). **Do not invent
      reviews.** Set `googleBusinessProfileUrl` so the "See all reviews on Google" link works.
- [ ] **Review the five blog articles** and set `reviewStatus: approved` in each one's frontmatter.
      While flagged, each shows an "example article — pending review" note.

## Optional

- [ ] Email; social profile links (Instagram / Facebook / YouTube).
- [ ] **Destinations** the business genuinely serves → the Destinations section appears once
      `destinations` has entries.
- [ ] Privacy policy: review [`src/app/privacy/page.tsx`](src/app/privacy/page.tsx) with the owner
      (it describes a site with no analytics and no data stored); set `privacyUpdated`.
- [ ] FAQ wording in [`src/content/faq.ts`](src/content/faq.ts): add real policies (cancellation,
      advance payment, etc.) **only if** the owner confirms them.

## Photos and branding decisions

- [ ] The rear cut-out (`cutout-rear.png`) shows **"RRP Groups"** branding and three phone numbers
      on the glass. The owner confirmed using it **as-is** (it appears in the gallery and as the
      featured blog cover). Confirm this is still wanted at launch.
- [ ] The transparent studio cut-outs (front/side/rear) look retouched/processed. They match the
      real van (registration, decal, stripes). Confirm the owner is happy to use them.
- [ ] Blog cover images are generated composites of the van on the brand palette — example imagery.
      Replace with real travel/vehicle photography when available.
- [ ] The only brand logo available is the windscreen/rear "OG" sticker. If a proper logo file
      exists, replace the road-mark in `src/components/ui/Logo.tsx` and re-run `npm run images`.

## Before pressing "go"

- [ ] `npm run check:launch -- --strict` passes (domain set)
- [ ] `npm run lint && npm run typecheck && npm run build` pass
- [ ] Click every WhatsApp / call button on a real phone; submit the trip form and confirm the
      WhatsApp message contains pickup, destination, date, **time**, passengers and requirements
- [ ] Open a couple of blog articles on a phone; check the table of contents and CTAs
- [ ] Rich Results Test on the live URL; submit `sitemap.xml` in Google Search Console
- [ ] Create/verify the Google Business Profile and link the website
- [ ] Re-run Lighthouse on the live URL (mobile) and check real-user Core Web Vitals after a few weeks
