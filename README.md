# OG TOURS AND TRAVELS — website

Clean, minimal, mobile-first site for OG TOURS AND TRAVELS (group travel and Force Urbania vehicle hire),
with a teal/navy and amber logistics-style design, real motion, and an SEO travel blog. The goal is enquiries by
**WhatsApp or phone**; there is no backend.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Lucide icons
- **Motion:** CSS transitions/keyframes plus one shared IntersectionObserver for scroll reveals
  (no animation library; `prefers-reduced-motion` fully respected)
- **Blog:** Markdown files → static pages, sitemap and RSS; `gray-matter` + `marked` at build time
- **Server components by default.** Client components only where needed: header/menu, contact bar,
  trip form, FAQ accordion, gallery, scroll reveals, scroll progress, blog table of contents.

> Next.js 16 differs from older versions (`preload` replaces `priority` on `next/image`,
> `images.qualities` is required, etc.). See `AGENTS.md` and `node_modules/next/dist/docs/`
> before changing framework-level code.

## Quick start

```bash
npm install
npm run images       # generate web images/icons from assets/originals (first run / after image changes)
npm run dev          # http://localhost:3000
npm run build        # production build
npm start            # serve the production build
```

Requires Node 20.9+ (developed on Node 24; `npm run check:launch` needs Node 22.18+ to load the
TypeScript config).

## Design system

Tokens live once in `src/app/globals.css` under `@theme` (some names are legacy from earlier
themes; the comment at the top of that file maps them). The look is a clean "logistics" theme:
a deep teal→navy gradient for the hero, final CTA, footer and header, with white and pale-blue
sections between.

| Token | Value | Use |
|---|---|---|
| `ink` | `#0C3B4E` | headings / text (white inside `.surface-night`) |
| `slate` | `#4A5F6C` | secondary text |
| `midnight` / `graphite` | `#FFFFFF` | page background, header-less surfaces, drawer |
| `light` | `#EEF4F7` | alternate (pale blue) sections |
| `accent` | `#F5B50A` | amber primary buttons (text on it is `navy` `#0A2F40`) |
| `wa` | `#178A43` | green WhatsApp buttons (white text) |
| `accent-deep` | `#1B7F57` | green eyebrows/links (amber inside `.surface-night`) |
| `coral` | `#F5B50A` | thin lines and progress |

Fonts: **Space Grotesk** (headings), **Inter** (body), **Instrument Serif** (accent words),
all self-hosted via `next/font`. Surface helpers: `.surface-night` (teal→navy gradient, also
`.on-night` for just the light-text variables), `.surface-dark` / `.surface-graphite` (white),
`.surface-light` (pale blue). Buttons: `buttonClass()` in `src/components/ui/buttonStyles.ts`.

## Business details (the one file to edit)

Everything about the business lives in **[`src/config/business.ts`](src/config/business.ts)**.

The **WhatsApp (`+91 91595 41288`) and call (`+91 81240 12407`) numbers are configured** as
defaults (they are shown on the vehicle). Everything still unknown is `null` / `[]` and nothing
is invented or rendered for it.

| Value | Effect when set | Effect when empty |
|---|---|---|
| `whatsapp` | All WhatsApp CTAs, the trip form, header, mobile bar | WhatsApp buttons disabled (never a dead link) |
| `phone` | "Call" buttons, footer, mobile bar, structured data | All Call actions omitted |
| `siteUrl` | Canonical, OG URLs, sitemap, robots, JSON-LD | Site is **noindex**; robots disallows all (staging safety) |
| `serviceArea`, `areaServed` | Footer text; `areaServed` in JSON-LD | Hidden |
| `address` | `PostalAddress` in JSON-LD | Omitted |
| `email`, `socials`, `googleBusinessProfileUrl` | Footer links; `sameAs` in JSON-LD | Hidden |
| `vehicle.specs` | Spec list on the vehicle section | A neutral "ask us" line instead |
| `destinations` | The Destinations section appears | The whole section is not rendered |
| `services[].enabled` | Show/hide each service | — |

Contact values can also be set via environment variables (see [`.env.example`](.env.example)):
`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_EMAIL`. They are
inlined at **build time**, so rebuild after changing them. An env value overrides the default.

See **[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md)** for everything to confirm before launch:

```bash
npm run check:launch               # report of what is still unconfirmed
npm run check:launch -- --strict   # exit 1 if a required item is missing (use in CI / before deploy)
```

## The enquiry flow

`src/lib/enquiry.ts` builds every link from the configured numbers and keeps WhatsApp and phone
**strictly separate** (WhatsApp → `wa.me/919159541288`, Call → `tel:+918124012407`). `CtaLink`
renders them consistently across the hero, vehicle section, header, mobile bar, footer, blog and
final CTA.

The trip form (pickup, destination, date, **time**, passengers, optional requirements) validates,
keeps input on error, then builds the message, URL-encodes it with `encodeURIComponent`, and
**redirects** the current tab to WhatsApp (`window.location.href`, reliable on mobile and desktop).
It never claims the enquiry was sent or that availability was checked — the visitor completes the
send inside WhatsApp. A fallback link is shown in case the redirect is blocked.

## Blog

Markdown posts in [`content/blog/`](content/blog) — see [`content/blog/README.md`](content/blog/README.md)
to add one (no code changes needed). Pages:

- `/blog` — editorial listing with a featured article; `/blog/page/[n]` for overflow (static).
- `/blog/[slug]` — article with breadcrumbs, metadata, table of contents + reading progress,
  in-context WhatsApp CTA, related posts, prev/next. Unknown slugs return a real 404.
- `/blog/feed.xml` — RSS feed.

Five original starter articles are included, each flagged `reviewStatus: needs-business-review`.

## Project structure

```
src/
  app/                 layout · page · privacy · not-found · robots.ts · sitemap.ts
                       blog/ (page · page/[n] · [slug] · feed.xml)
  components/
    layout/            Header · MobileNavigation · MobileContactBar · Footer · CurrentYear · DevConfigNotice
    sections/          Hero · VehicleShowcase(+Gallery) · Services · BookingSteps(+TripEnquiryForm)
                       Destinations · LatestStories · FAQ · FinalCTA
    blog/              BlogListing · ArticleCard · Breadcrumbs · TableOfContents
    ui/                CtaLink · buttonStyles · Accordion · Reveal · Logo · SectionHeading
    seo/               StructuredData · JsonLd
  config/business.ts   single source of truth for business info
  content/faq.ts       FAQ copy
  lib/                 enquiry · site · blog · blog-covers
content/blog/          Markdown posts
scripts/               optimize-images · check-launch · qa · qa-interact · serve-qa.sh
assets/                originals + placement notes
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Browser QA (Playwright + axe-core) against a production server (uses the real numbers; only the
domain is injected):

```bash
npx playwright install chromium       # first time only
bash scripts/serve-qa.sh              # builds and serves on :3100
node scripts/qa.mjs http://localhost:3100 qa-screenshots            # 9 viewports: overflow, H1, images, links, axe, screenshots
node scripts/qa.mjs http://localhost:3100/blog qa-blog             # also run on /blog and an article
node scripts/qa-interact.mjs http://localhost:3100                 # form redirect, FAQ, menu, contact bar, blog nav, reduced motion, no-JS
```

Latest results: all viewport/axe/interaction checks pass; Lighthouse mobile ≈ Performance 86–95,
Accessibility 99–100, Best Practices 100, SEO 100, CLS 0.

## Deployment

**Vercel:** import the repo, set `NEXT_PUBLIC_SITE_URL` (and optionally override the numbers) in
Project → Settings → Environment Variables, deploy. Use build command
`npm run check:launch -- --strict && npm run build` to block a launch with the domain missing.

**Any Node host / VPS:** `npm ci && npm run images && npm run build && npm start` behind an HTTPS
reverse proxy. Static export is **not** configured; `next/image` optimisation needs the Next server.

Preview/staging without `NEXT_PUBLIC_SITE_URL` is automatically `noindex`.

## SEO

In place: unique titles/descriptions per page and article, canonical, Open Graph + Twitter cards,
generated social image, favicon set, `robots.txt`, `sitemap.xml` (incl. all posts), RSS feed,
`TravelAgency` + `WebSite` JSON-LD (with WhatsApp/phone contact points, no ratings/prices/hours),
`BlogPosting` + `BreadcrumbList` on articles, one H1 per page, logical heading order, descriptive
alt text. After launch: set the domain, validate in Google's Rich Results Test, submit the sitemap
in Search Console, and link the Google Business Profile — see LAUNCH-CHECKLIST.md.

## Accessibility & performance

- Keyboard: skip link, visible lime/ink focus rings, full-screen menu (`aria-expanded`, `inert`
  when closed, Escape returns focus), accordion with real buttons, focusable gallery, blog TOC.
- No hover-only functionality; touch targets ≥ 44px; 16px form text; safe-area-aware contact bar
  that steps aside when a field is focused.
- Hero image preloaded with `fetchPriority="high"` and reserved dimensions; the headline animates
  transform-only so it never delays LCP; everything below the fold is lazy. No third-party scripts.
- Scroll-reveal content is in the server HTML (works with no JS and for crawlers); motion is
  transform/opacity/clip-path only, so there is no layout shift (CLS 0).
