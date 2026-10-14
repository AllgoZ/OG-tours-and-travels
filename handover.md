# Handover — OG Tours and Travels website

A premium, mobile-first marketing site for **OG Tours and Travels** (group travel and Force
Urbania vehicle hire). Its single goal is enquiries via **WhatsApp or phone**; there is no
backend, database, or login.

- **Repo:** https://github.com/AllgoZ/OG-tours-and-travels
- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Lucide icons
- **Content:** Markdown blog (static) · everything else is config-driven

This doc is the quick orientation. Deeper detail lives in [`README.md`](README.md) and the
go-live steps in [`LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md).

---

## 1. Run it

```bash
npm install
npm run images       # generate web images/icons from assets/originals (first run / after image changes)
npm run dev          # http://localhost:3000
npm run build        # production build
npm start            # serve the production build
```

Node 20.9+ (developed on Node 24; `npm run check:launch` needs Node 22.18+ to read the TS config).

Quality gates:

```bash
npm run lint
npm run typecheck
npm run check:launch           # report of what's still unconfirmed before launch
npm run check:launch -- --strict   # exits 1 if a REQUIRED item is missing (use in CI / before deploy)
```

Browser QA (Playwright + axe) against a production server:

```bash
npx playwright install chromium        # first time only
bash scripts/serve-qa.sh               # builds + serves on :3100 (uses real numbers; injects a test domain)
node scripts/qa.mjs http://localhost:3100 qa-screenshots   # 9 viewports: overflow, H1, images, links, axe, screenshots
node scripts/qa-interact.mjs http://localhost:3100         # form, FAQ, menu, contact buttons, blog nav, reduced-motion, no-JS
```

---

## 2. The one file to edit for business details

**[`src/config/business.ts`](src/config/business.ts)** is the single source of truth. Nothing
is invented; anything unknown is `null` / `[]` and simply isn't rendered.

Already set (confirmed, visible on the vehicle):
- **WhatsApp** `+91 91595 41288` → `wa.me/919159541288`
- **Call** `+91 81240 12407` → `tel:+918124012407`

These are kept strictly separate everywhere (WhatsApp for enquiries, phone for calls). They can
be overridden per environment with `NEXT_PUBLIC_WHATSAPP` / `NEXT_PUBLIC_PHONE` (see `.env.example`).

| Value | When empty |
|---|---|
| `siteUrl` (or `NEXT_PUBLIC_SITE_URL`) | **Site stays `noindex`**, no sitemap/canonical. **Required to launch.** |
| `serviceArea`, `areaServed`, `address`, `email`, `socials`, `googleBusinessProfileUrl` | Hidden from footer + structured data |
| `vehicle.specs` | A neutral "ask us" line shows instead of specs |
| `destinations` | The Destinations section is not rendered |
| `reviews` (with `verified: true`) | The Google reviews section is hidden (samples show only in `npm run dev`) |
| `services[].enabled` | Toggles each service card |

---

## 3. What still needs doing before launch

Run `npm run check:launch` for the live list. Summary:

- [ ] **Required:** set the production domain (`NEXT_PUBLIC_SITE_URL`). Until then the site is `noindex` by design.
- [ ] Add **real Google reviews** to `reviews` and set `verified: true` (do **not** invent reviews; the section is hidden until there's a real one).
- [ ] Review the **5 starter blog articles** and set `reviewStatus: approved` in each one's frontmatter.
- [ ] Confirm **services**, add **vehicle specs**, **service area**, **address**, and the **Google Business Profile** URL if desired.
- [ ] Review the **privacy policy** copy and set `privacyUpdated`.

Photo note: the rear cut-out shows "RRP Groups" branding (same operator — the numbers match) and
is used as-is per the owner's decision. Blog cover images are generated composites of the van and
are example imagery — replace with real photography when available.

---

## 4. Code map

```
src/
  app/                 layout · page · privacy · not-found · robots.ts · sitemap.ts
                       blog/ (page · page/[n] · [slug] · feed.xml)
  components/
    layout/            Header (sticky + auto-hide) · MobileNavigation (right drawer)
                       MobileContactBar (floating Call/WhatsApp FABs) · Footer · ScrollProgress · DevConfigNotice
    sections/          Hero(+HeroSound) · ValueStrip · VehicleShowcase(+Gallery) · Services · Benefits
                       GoogleReviews · BookingSteps(+TripEnquiryForm) · Destinations · LatestStories · FAQ · FinalCTA
    blog/              BlogListing · ArticleCard · Breadcrumbs · TableOfContents
    ui/                CtaLink · buttonStyles · Accordion · Reveal · Logo · SectionHeading
    seo/               StructuredData · JsonLd
  config/business.ts   single source of truth
  content/faq.ts       FAQ copy
  lib/                 enquiry · site · blog · blog-covers
content/blog/          Markdown posts (see content/blog/README.md to add one — no code changes needed)
public/sounds/         engine-roar.mp3 · car-honk.mp3 (hero sound)
assets/                untouched originals + placement notes (assets/README.md)
scripts/               optimize-images · check-launch · qa · qa-interact · serve-qa.sh
```

Design tokens live once in `src/app/globals.css` under `@theme` (midnight/graphite/soft/slate/lime/
light). Lime is an accent only; text on lime is always dark.

---

## 5. How the key features work

- **Enquiry flow** (`src/lib/enquiry.ts` + `CtaLink`): every WhatsApp/phone link is built from the
  config; if a number is missing the button is disabled (never a dead link). The trip form
  (pickup, destination, date, **time**, passengers, optional requirements) validates, then
  redirects the tab to WhatsApp with the message URL-encoded. It never claims the enquiry was sent.
- **Blog**: Markdown in `content/blog/` → static pages, sitemap, RSS (`/blog/feed.xml`),
  `BlogPosting` + `BreadcrumbList` JSON-LD. `draft: true` hides a post in production.
- **Hero**: the van slides in on load (silent); tapping/clicking it replays the slide **with the
  engine + honk sound**. Headline animates transform-only so it never delays LCP.
- **Header**: solid-on-scroll, and **auto-hides on scroll down / returns on scroll up**.
- **Mobile contact**: **floating** buttons — Call bottom-left, WhatsApp bottom-right. The
  container is click-through (only the buttons are tappable) and they slide away when a field is focused.
- **Reviews**: a scrolling marquee driven by `reviews` in config; only `verified` reviews show in production.

---

## 6. Known constraints (by design, not bugs)

- **Audio can't autoplay on a cold load** — browsers block sound until the visitor interacts.
  That's why tapping the van is what triggers the engine/honk; it plays reliably from that gesture.
- **`noindex` until a domain is set** — preview/staging deployments stay out of search on purpose.
- **No backend** — the form only prepares a WhatsApp message; it does not check live availability
  or store anything. Copy reflects this honestly.
- **Not a static export** — `next/image` optimisation needs the Next server (deploy to Vercel or a
  Node host; `npm run build && npm start`).

---

## 7. Deploy

**Vercel:** import the repo, set `NEXT_PUBLIC_SITE_URL` (and optionally override the numbers) in
project env vars, deploy. Recommended build command:
`npm run check:launch -- --strict && npm run build`.

**Any Node host:** `npm ci && npm run images && npm run build && npm start` behind HTTPS.

After launch: validate the home page in Google's Rich Results Test, submit `sitemap.xml` in Search
Console, and link the Google Business Profile.

---

## 8. Recent change history (newest first)

- Hero van slides on load (silent); click/tap replays it with engine + honk sound.
- Mobile Call/WhatsApp moved from a bottom bar to **floating** buttons (Call left, WhatsApp right); header auto-hides on scroll.
- Hero vehicle drive-in direction set to left→right; real `.mp3` engine/honk added (low volume, honk under engine).
- Added the scrolling **Google reviews** section (config-driven, verified-only in production).
- v2 redesign: cinematic dark-first identity, new palette/fonts, motion, and the SEO blog system.
- Initial build: full landing page, config-driven enquiry flow, SEO foundations.

_Last updated for commit on `main` adding floating buttons + auto-hide header + click-to-replay hero sound._
