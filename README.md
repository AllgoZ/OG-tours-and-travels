> **Last updated: 2026-10-23 16:25 IST (UTC+05:30)**

# OG TOURS AND TRAVELS — website + admin CMS

Clean, minimal, mobile-first site for OG TOURS AND TRAVELS (group travel and Force Urbania vehicle hire), with a
teal/navy and amber logistics-style design, real motion, an SEO travel journal, and a private **admin CMS** at `/admin`
for writing, reviewing and publishing articles. The public goal is enquiries by **WhatsApp or phone**.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Lucide icons · Supabase (Postgres, Auth, Storage)
- **Public site:** statically generated, server components by default, no third-party scripts except Google Tag Manager (production only, never on `/admin`). Client components only where needed
  (header/menu, contact bar, trip form, FAQ accordion, gallery, scroll reveals, blog table of contents).
- **Journal / blog:** articles live in **Supabase** (`blog_posts`, Row Level Security) → static pages, sitemap, RSS, JSON-LD.
  Markdown in `content/blog/` is the import source and the rollback (`BLOG_SOURCE=markdown`).
- **Admin CMS (`/admin`):** Supabase Auth + an administrator allow-list + RLS. Dashboard, Markdown editor with live sanitised preview,
  cover/body image uploads, explicit review → publish workflow, slug-change redirects, secure preview, SEO/AEO guidance, and
  on-demand revalidation (publishing needs no rebuild).
- **Motion:** CSS transitions/keyframes plus one shared IntersectionObserver (no animation library; `prefers-reduced-motion` respected).

> Next.js 16 differs from older versions (Middleware → **Proxy**, `preload` replaces `priority` on `next/image`,
> `images.qualities` is required, …). See `AGENTS.md` / `CLAUDE.md` and `node_modules/next/dist/docs/` before changing framework-level code.

### Documentation map

| Doc | What it covers |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How everything fits together and why |
| [`handover.md`](handover.md) | Quick orientation, what's left to do, recent changes |
| [`CLAUDE.md`](CLAUDE.md) | Working rules and commands for AI coding assistants |
| [`docs/admin-cms.md`](docs/admin-cms.md) | Using and operating the CMS: Auth setup, first admin, publishing, troubleshooting, backup, credential rotation, deploy |
| [`docs/supabase-blog.md`](docs/supabase-blog.md) | Database, RLS, import/export, rollback to Markdown |
| [`docs/seo-aeo.md`](docs/seo-aeo.md) | SEO/AEO audit, decisions, Search Console steps |
| [`LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md) | Everything to confirm before go-live |
| [`prompts/universal-seo-cms-template.md`](prompts/universal-seo-cms-template.md) | Reusable template for building this kind of CMS in any project |

## Quick start

```bash
npm install
cp .env.example .env.local       # then fill in the values (never commit .env.local)
npm run images                   # generate web images/icons from assets/originals (first run / after image changes)
npm run dev                      # http://localhost:3000   (CMS: /admin/login)
npm run build                    # production build
npm start                        # serve the production build
```

Requires Node 20.9+ (developed on Node 24; `npm run check:launch` needs Node 22.18+ to load the TypeScript config).

### Environment variables (names only — see [`.env.example`](.env.example))

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `.env.local` + hosting | Production domain. Empty ⇒ site stays `noindex` |
| `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_EMAIL` | optional | Override the defaults in `src/config/business.ts` |
| `NEXT_PUBLIC_GTM_ID` | optional | Google Tag Manager container (public ID). Defaults to the owner's container; `off` disables. Loads only in production builds **with** `NEXT_PUBLIC_SITE_URL` set, public pages only |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + hosting | Public by design; RLS limits what they can do. Needed at build **and** runtime (the CMS runs server-side) |
| `BLOG_SOURCE` | optional | `supabase` (default) or `markdown` (rollback) |
| `DATABASE_URL` | **`.env.local` on your machine only** | Admin tooling (migrations, import/export, `admin:users`). Never in hosting env, never `NEXT_PUBLIC_` |

`NEXT_PUBLIC_*` values are inlined at **build** time — rebuild after changing them.

## Design system

Tokens live once in `src/app/globals.css` under `@theme` (some names are legacy; the file header maps them). A clean "logistics" theme: deep teal→navy
gradient for the hero, final CTA, footer and header, with white and pale-blue sections between.

| Token | Value | Use |
|---|---|---|
| `ink` | `#0C3B4E` | headings / text (white inside `.surface-night`) |
| `slate` | `#4A5F6C` | secondary text |
| `midnight` / `graphite` | `#FFFFFF` | page background, drawer |
| `light` | `#EEF4F7` | alternate (pale blue) sections; admin background |
| `accent` | `#F5B50A` | amber primary buttons (text on it is `navy` `#0A2F40`) |
| `wa` | `#178A43` | green WhatsApp buttons (white text) |
| `accent-deep` | `#1B7F57` | green eyebrows/links (amber inside `.surface-night`) |
| `coral` | `#F5B50A` | thin lines and progress |

Fonts: Space Grotesk (headings), Inter (body), Instrument Serif (accent words), self-hosted via `next/font`. Buttons: `buttonClass()` in
`src/components/ui/buttonStyles.ts`. The admin reuses the tokens through `src/components/admin/styles.ts`.

## Business details (the one file to edit)

Everything about the business lives in **[`src/config/business.ts`](src/config/business.ts)**. The **WhatsApp (`+91 81108 11003`) and call
(`+91 81240 12407`) numbers are configured**; everything unknown is `null` / `[]` and nothing is invented or rendered for it.

| Value | Effect when set | Effect when empty |
|---|---|---|
| `whatsapp` | All WhatsApp CTAs, the trip form, header, mobile bar | WhatsApp buttons disabled (never a dead link) |
| `phone` | "Call" buttons, footer, mobile bar, structured data | All Call actions omitted |
| `siteUrl` | Canonical, OG URLs, sitemap, robots, JSON-LD | Site is **noindex**; robots disallows all (staging safety) |
| `serviceArea`, `areaServed` | Footer text; `areaServed` in JSON-LD | Hidden |
| `address` | `PostalAddress` in JSON-LD | Omitted |
| `email`, `socials`, `googleBusinessProfileUrl` | Footer links; `sameAs` in JSON-LD | Hidden |
| `vehicle.specs` | Spec list on the vehicle section | A neutral "ask us" line instead |
| `destinations` | The Destinations section appears | Not rendered |
| `services[].enabled` | Show/hide each service | — |

```bash
npm run check:launch               # report of what is still unconfirmed (also checks Supabase config, public posts, admins)
npm run check:launch -- --strict   # exit 1 if a required item is missing (use in CI / before deploy)
```

## The enquiry flow

`src/lib/enquiry.ts` builds every link from the configured numbers and keeps WhatsApp and phone **strictly separate** (WhatsApp → `wa.me/918110811003`,
Call → `tel:+918124012407`). `CtaLink` renders them consistently across the hero, vehicle section, header, mobile bar, footer, blog and final CTA.

The trip form (pickup, destination, date, **time**, passengers, optional requirements) validates, keeps input on error, builds the message, URL-encodes it
and **redirects** the current tab to WhatsApp. It never claims the enquiry was sent or availability checked — the visitor completes the send inside WhatsApp.

## Blog and the admin CMS

Public pages: `/blog` (listing), `/blog/page/[n]` (overflow), `/blog/[slug]` (article, breadcrumbs, table of contents, CTA, related, prev/next; unknown slug ⇒ real 404;
renamed slug ⇒ 308 redirect), `/blog/feed.xml` (RSS).

A post is **public only when** `draft = false`, `review_status = 'approved'` and `published_at <= now()` (enforced by RLS; a database constraint also makes
"live ⇒ approved"). The nine articles (five starter + four Oddanchatram/Dindigul guides) were imported as drafts awaiting business review, so **none is public yet**.

**Use the CMS:** sign in at `/admin/login` → write/edit → *Mark as reviewed & approved* (explicit confirmation) → *Publish*. Saving a draft never publishes.
Publishing refreshes the affected public pages on demand — no rebuild (single-instance/Vercel; otherwise redeploy). Full guide: [`docs/admin-cms.md`](docs/admin-cms.md).

**First-time CMS setup** (details in the doc): `npm run db:migrate` → in Supabase Auth turn **off public sign-ups**, set a strong password policy → create an Auth user
(auto-confirm) → `npm run admin:users -- grant <email>`.

```bash
npm run db:migrate                                 # apply supabase/migrations (idempotent)
npm run blog:import [-- --apply [--overwrite]]     # Markdown → database (dry run by default; --dir to restore a backup)
npm run blog:export                                # back up every post (incl. drafts) as Markdown
npm run blog:status [-- approve|publish|hide <slug>]   # CLI equivalent of the CMS workflow
npm run admin:users [-- grant|revoke <email>]      # who can use /admin
```

## Project structure

```
src/
  proxy.ts             /admin session refresh + anonymous redirect (first layer; every admin handler re-authorises)
  app/
    layout.tsx · not-found.tsx · robots.ts · sitemap.ts · globals.css
    (site)/            public pages inside the marketing chrome: page · privacy · blog/ (page · page/[n] · [slug] · feed.xml)
    admin/             the CMS: login · forbidden · (panel)/ dashboard, posts/new, posts/[id]/edit|preview · api/covers · actions.ts
  components/
    layout/            SiteChrome · Header · MobileNavigation · MobileContactBar · Footer · CurrentYear · DevConfigNotice
    sections/          Hero · VehicleShowcase(+Gallery) · Services · BookingSteps(+TripEnquiryForm) · Destinations · LatestStories · FAQ · FinalCTA
    blog/              ArticleView · ArticleCard · BlogListing · CoverImage · Breadcrumbs · TableOfContents
    ui/                CtaLink · buttonStyles · Accordion · Reveal · Logo · SectionHeading
    seo/               StructuredData · JsonLd
    admin/             post editor, dashboard pieces, workflow panel, uploads (never used by the public layout)
  config/business.ts   single source of truth for business info
  content/faq.ts       FAQ copy
  lib/                 enquiry · site · blog* · covers · seo · supabase/ · admin/
supabase/migrations/   001_create_blog_posts.sql · 002_admin_cms.sql
content/blog/          Markdown posts (import + rollback source)
docs/                  admin-cms.md · supabase-blog.md · seo-aeo.md
tests/                 Vitest unit + live-database tests
scripts/               optimize-images · check-launch · db-migrate · import/export-blog · blog-status · admin-users · qa · qa-interact · qa-admin · serve-qa.sh
assets/                originals + placement notes
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm test                                  # unit tests (+ live-database RLS/trigger tests when DATABASE_URL is set)
npm run build
```

Browser QA (Playwright + axe-core) against a production server (uses the real numbers; only the domain is injected):

```bash
npx playwright install chromium           # first time only
bash scripts/serve-qa.sh                  # builds and serves on :3100
node scripts/qa.mjs http://localhost:3100 qa-screenshots     # 9 viewports: overflow, H1, images, links, axe, screenshots
node scripts/qa-interact.mjs http://localhost:3100           # form redirect, FAQ, menu, contact bar, blog nav, reduced motion, no-JS
npm run qa:admin                          # end-to-end CMS test (creates + removes throw-away users; needs DATABASE_URL)
```

Latest results: 179 unit/DB tests pass (2026-10-22); as of 2026-10-20: `qa:admin` 85/85; public QA passes except 9 pre-existing axe colour-contrast findings
(green WhatsApp button, small text). Earlier Lighthouse mobile: Performance 86–95, Accessibility 99–100, Best Practices 100, SEO 100, CLS 0.

## Deployment

**Vercel:** import the repo; set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and optionally the number overrides) in
Project → Settings → Environment Variables — **not** `DATABASE_URL`. Build command: `npm run check:launch -- --strict && npm run build`.
Vercel flags `NEXT_PUBLIC_*` variables with a "Keep this value private" warning — add them as type **Config** (not Secret): they are inlined into the browser bundle anyway, and the publishable key is public by design (RLS-limited). Set **Node.js 22.x/24.x** in Project → Settings (check:launch needs 22.18+); don't set `NEXT_PUBLIC_SITE_URL` on Preview so previews stay noindex and send no analytics.

**Any Node host / VPS:** `npm ci && npm run images && npm run build && npm start` behind an HTTPS reverse proxy (the CMS uses `Secure` cookies). Static export is **not**
configured: `next/image`, server actions and on-demand revalidation need the Next server.

Preview/staging without `NEXT_PUBLIC_SITE_URL` is automatically `noindex`. Full CMS deploy steps: [`docs/admin-cms.md`](docs/admin-cms.md) §11.

## SEO

In place: unique titles/descriptions per page and article, canonical, Open Graph + Twitter cards (an article's uploaded cover is its social image), generated social
image, favicon set, `robots.txt` (`Disallow: /admin`), `sitemap.xml` (published posts only), RSS, `TravelAgency` + `WebSite` JSON-LD (no ratings/prices/hours),
`BlogPosting` + `BreadcrumbList` on articles, `FAQPage` for the visible FAQ, one H1 per page, descriptive alt text. After launch: set the domain, validate in
Google's Rich Results Test, submit the sitemap in Search Console, link the Google Business Profile — see [`docs/seo-aeo.md`](docs/seo-aeo.md) and `LAUNCH-CHECKLIST.md`.

## Accessibility & performance

- Keyboard: skip links, visible focus rings, full-screen menu (`aria-expanded`, `inert` when closed, Escape returns focus), accordion with real buttons,
  focusable gallery, blog TOC; the CMS has labelled forms, `aria-live` status regions and passes axe (serious/critical = 0) on dashboard, editor and login.
- No hover-only functionality; touch targets ≥ 44px; 16px form text; safe-area-aware contact bar that steps aside when a field is focused.
- Hero image preloaded with `fetchPriority="high"` and reserved dimensions; the headline animates transform-only so it never delays LCP; below-the-fold is lazy.
  Uploaded covers carry stored dimensions (no layout shift). The only third-party script is Google Tag Manager (`afterInteractive`, production only).
- Scroll-reveal content is in the server HTML (works with no JS and for crawlers); motion is transform/opacity/clip-path only (CLS 0).
