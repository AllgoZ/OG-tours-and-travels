> **Last updated: 2026-10-23 16:25 IST (UTC+05:30)**

# Handover — OG Tours and Travels website

A clean, minimal, mobile-first marketing site for **OG Tours and Travels** (group travel and Force Urbania vehicle hire) plus a private **admin CMS**
for its travel journal. The public goal is enquiries via **WhatsApp or phone**. The only external service is **Supabase** (Postgres + Auth + Storage),
used for blog articles and the CMS.

- **Repo:** https://github.com/AllgoZ/OG-tours-and-travels
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Lucide icons · Supabase
- **Admin:** `/admin` — Supabase Auth + `admin_users` allow-list + RLS; guide in [`docs/admin-cms.md`](docs/admin-cms.md)
- **Content:** journal in Supabase (`blog_posts`); Markdown in `content/blog/` is the import/rollback source; everything else is config-driven

This is the quick orientation. Deeper detail: [`README.md`](README.md) (usage), [`ARCHITECTURE.md`](ARCHITECTURE.md) (design), [`CLAUDE.md`](CLAUDE.md) (AI-assistant rules),
[`LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md) (go-live), and `docs/` (CMS, Supabase blog, SEO/AEO).

---

## 1. Run it

```bash
npm install
cp .env.example .env.local   # fill in the values; .env.local is git-ignored
npm run images               # generate web images/icons from assets/originals (first run / after image changes; also paints the number plate out)
npm run dev                  # http://localhost:3000   (CMS: http://localhost:3000/admin/login)
npm run build                # production build
npm start                    # serve the production build
```

Node 20.9+ (developed on Node 24; `npm run check:launch` needs Node 22.18+ to read the TS config).

Quality gates:

```bash
npm run lint
npm run typecheck
npm test                           # unit tests + (with DATABASE_URL) live-DB RLS/trigger/storage tests — 179 tests
npm run check:launch               # what's still unconfirmed (domain, WhatsApp, Supabase, pending reviews, admins, public posts…)
npm run check:launch -- --strict   # exits 1 if a REQUIRED item is missing (use in CI / before deploy)
```

Browser QA (Playwright + axe) against a production server:

```bash
npx playwright install chromium                         # first time only
bash scripts/serve-qa.sh                                # builds + serves on :3100 (real numbers; injects a test domain; kills node.exe first)
node scripts/qa.mjs http://localhost:3100 qa-screenshots   # 9 viewports: overflow, H1, images, links, axe, screenshots
node scripts/qa-interact.mjs http://localhost:3100         # form, FAQ, menu, contact buttons, blog nav, reduced-motion, no-JS
npm run qa:admin                                        # end-to-end CMS test (85 checks; creates + removes throw-away users; needs DATABASE_URL)
```
(`qa-interact` expects visible articles: run `BLOG_SOURCE=markdown bash scripts/serve-qa.sh` while no article is published in Supabase.)

---

## 2. Credentials and environment (names only — never write values into tracked files)

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `.env.local` + hosting | **Required to launch.** Empty ⇒ site stays `noindex` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + hosting | Public by design; RLS limits them |
| `NEXT_PUBLIC_WHATSAPP`, `_PHONE`, `_EMAIL` | optional | Override `src/config/business.ts` defaults |
| `NEXT_PUBLIC_GTM_ID` | optional | Google Tag Manager container; defaults to the owner's (`GTM-K42Z4THV`, public). `off` disables. See §6 |
| `BLOG_SOURCE` | optional | `supabase` (default) / `markdown` (rollback) |
| `DATABASE_URL` | **`.env.local` on the owner's machine only** | Admin tooling (migrations, import/export, `admin:users`, e2e). Use the **session pooler** string (direct host is IPv6-only). Never in hosting env |

Supabase project ref `waneubrrntilwruanjzc` (pooler region `ap-southeast-1`). The first CMS administrator `ogtravels.ckp@gmail.com` was created on 2026-10-20 —
**the password was shared in chat: change it** (Supabase → Authentication → Users). The database password and legacy JWT secret were also pasted in chat: **rotate them**.
No `service_role` key is used anywhere.

---

## 3. The one file to edit for business details

**[`src/config/business.ts`](src/config/business.ts)** is the single source of truth. Nothing is invented; anything unknown is `null` / `[]` and simply isn't rendered.

Already set (confirmed, visible on the vehicle): **WhatsApp** `+91 81108 11003` → `wa.me/918110811003`; **Call** `+91 81240 12407` → `tel:+918124012407`.
They are kept strictly separate everywhere and can be overridden per environment.

| Value | When empty |
|---|---|
| `siteUrl` (or `NEXT_PUBLIC_SITE_URL`) | **Site stays `noindex`**, no sitemap/canonical. **Required to launch.** |
| `serviceArea`, `areaServed`, `address`, `email`, `socials`, `googleBusinessProfileUrl` | Hidden from footer + structured data |
| `vehicle.specs` | A neutral "ask us" line shows instead of specs |
| `destinations` | The Destinations section is not rendered |
| `reviews` (with `verified: true`) | The Google reviews section is hidden (samples show only in `npm run dev`) |
| `services[].enabled` | Toggles each service card |

---

## 4. What still needs doing before launch

Run `npm run check:launch` for the live list. Summary:

- [ ] **Required:** set the production domain (`NEXT_PUBLIC_SITE_URL`) — the GA4 stream URL indicates `https://www.ogtravels.in` (set it on Vercel Production only). Until then the site is `noindex` by design and GTM/GA4 stay off.
- [ ] **GA4** (property exists: stream OG TRAVELS, Measurement ID `G-JMDL8MDC6E`): add a Google tag with that ID **inside the GTM container** (Initialization – All Pages), Preview, publish; check GA4 Realtime. The raw `gtag.js` snippet is deliberately **not** in the code (CLAUDE.md rule 8) — it would double-count. Details: `docs/seo-aeo.md`.
- [ ] **Supabase Auth hardening** (Dashboard): turn **off public sign-ups**, min password length ≥ 12, review rate limits, set Site URL (`docs/admin-cms.md` §1).
- [ ] **Change the admin password** and **rotate** the database password + JWT secret that were shared in chat.
- [ ] **Review the 9 draft articles** (5 starter + 4 local: Oddanchatram/Dindigul) with the owner, then in `/admin` approve and publish each. Until then **no article is public**, `/blog` is `noindex` and out of the sitemap.
- [ ] Add **real Google reviews** to `reviews` with `verified: true` (never invent; the section is hidden until there is one).
- [ ] Confirm **services**, add **vehicle specs**, **service area**, **address**, **Google Business Profile** URL if desired; review the **privacy policy** and set `privacyUpdated`.
- [ ] Production deploy: run `npm run db:migrate` against production, set the three env vars on the host (not `DATABASE_URL`), build with `check:launch --strict && build`, smoke-test the CMS (`docs/admin-cms.md` §11).
- [ ] **Google Tag Manager is installed** (public pages, production only). In the GTM container: publish a version, add the tags (e.g. GA4), and decide on a **cookie-consent** approach (Consent Mode / a banner) — none is built into the site. Then set `privacyUpdated` and review the privacy wording with the owner.
- [ ] Optional later: GA4 consent banner, `llms.txt`, AI-crawler policy — evaluated and deliberately not added (`docs/seo-aeo.md`).

Photo note: the **number plate is hidden** in every vehicle image — `npm run images` paints it out (boxes in `PLATES` in `scripts/optimize-images.mjs`; originals are never modified).
The rear cut-out shows "RRP Groups" branding (same operator) and is used as-is per the owner's decision. Bundled blog covers are generated composites — replace with real photography
(uploaded covers via the CMS need no code).

---

## 5. Code map

```
src/
  proxy.ts                  /admin session refresh + anonymous redirect (first layer only)
  app/
    layout.tsx · not-found.tsx · robots.ts · sitemap.ts · globals.css
    (site)/                 PUBLIC pages (wrapped in SiteChrome): page · privacy · blog/ (page · page/[n] · [slug] · feed.xml)
    admin/                  PRIVATE CMS: login · forbidden · (panel)/ dashboard, posts/new, posts/[id]/edit|preview · api/covers · actions.ts
  components/
    layout/                 SiteChrome · Header (sticky + auto-hide) · MobileNavigation · MobileContactBar · Footer · DevConfigNotice
    sections/               Hero(+HeroSound) · VehicleShowcase(+Gallery) · Services · GoogleReviews · BookingSteps(+TripEnquiryForm) · Destinations · LatestStories · FAQ · FinalCTA
    blog/                   ArticleView · ArticleCard · BlogListing · CoverImage · Breadcrumbs · TableOfContents
    ui/ · seo/              CtaLink · buttonStyles · Accordion · Reveal · Logo · SectionHeading  |  StructuredData · JsonLd
    admin/                  PostEditor · MarkdownEditor · CoverField · SeoPanel · TransitionPanel · DeleteDraft · AdminShell · LoginForm · StatusBadge …
  config/business.ts        single source of truth
  content/faq.ts            FAQ copy
  lib/                      enquiry · site · blog · blog-core · blog-render · blog-source-{supabase,markdown} · blog-covers · covers · seo
    supabase/               server (public read) · session (admin session) · session-options
    admin/                  auth · paths · rate-limit · slug · workflow · post-input · seo-check · posts · cover-image · revalidate · editor-props
supabase/migrations/        001_create_blog_posts.sql · 002_admin_cms.sql
content/blog/               Markdown posts (import + rollback source)
docs/                       admin-cms.md · supabase-blog.md · seo-aeo.md
prompts/                    task prompts + universal-seo-cms-template.md
tests/                      Vitest unit + live-DB tests
scripts/                    optimize-images · check-launch · db-migrate · import-blog · export-blog · blog-status · admin-users · qa · qa-interact · qa-admin · serve-qa.sh
```

Design tokens live once in `src/app/globals.css` under `@theme`. **Token names are legacy** — the header comment maps each to its current value. Current "logistics" theme:
hero/final CTA/footer/header are teal→navy (`.surface-night`); everything else white or pale blue (`light` `#EEF4F7`); text deep teal `ink` `#0C3B4E`; eyebrows/links green `accent-deep`;
buttons: amber `accent` (navy text), green `whatsapp` (`CtaLink` picks it for WhatsApp; amber for calls). Header is a solid teal bar `#0D5B70` that auto-hides on scroll down.

---

## 6. How the key features work

- **Enquiry flow** (`lib/enquiry.ts` + `CtaLink`): links are built from config; a missing number disables the button (never a dead link). The trip form validates, then redirects the tab to WhatsApp with
  the message URL-encoded. It never claims the enquiry was sent.
- **Journal**: Supabase `blog_posts` (anon `SELECT` of published rows only, enforced by RLS) → static pages, sitemap, RSS, `BlogPosting`/`BreadcrumbList`/`FAQPage` JSON-LD.
  Public rule: `draft=false ∧ review_status='approved' ∧ published_at<=now()`; the DB also enforces **live ⇒ approved**.
- **Admin CMS** (`/admin`): sign in → write (Markdown + live sanitised preview, cover/body image upload, SEO/AEO guidance) → **approve** (explicit owner-review confirmation) → **publish**.
  Every admin page/action calls `requireAdmin()` (Auth `getUser` + `is_admin()`); the database re-checks via RLS. Publishing refreshes the affected public pages on demand (no rebuild) on Vercel /
  single-instance Node; otherwise redeploy. Renaming a live slug leaves a 308 redirect. Admins are added only with `npm run admin:users -- grant <email>` (needs `DATABASE_URL`).
- **Hero**: van slides in silently on load; tap/click replays it with engine + honk sound. **Header** auto-hides on scroll down. **Mobile contact**: floating Call (left) / WhatsApp (right).
- **Google Tag Manager** (`components/analytics/GoogleTagManager.tsx`, gate in `lib/gtm.ts`): container ID from `business.analytics.gtmId` (`NEXT_PUBLIC_GTM_ID` overrides, `off` disables). Rendered by `SiteChrome` only — so every public page incl. the 404, never `/admin`
  (`admin/not-found.tsx` keeps admin 404s off the public chrome). Loader via `next/script` `afterInteractive`; `<noscript>` iframe is the first thing in `<body>`. Loads **only** in production builds with `NEXT_PUBLIC_SITE_URL` set, and the ID must match `GTM-XXXX`.
  `/privacy` switches wording when GTM is active. `serve-qa.sh` sets `NEXT_PUBLIC_GTM_ID=off`. SPA page views come from GTM's History Change trigger. No consent mode is configured in code.
- **Reviews**: scrolling marquee from `reviews` in config; only `verified` ones show in production.

---

## 7. Known constraints (by design, not bugs)

- **Audio can't autoplay on a cold load** — browsers block sound until the visitor interacts.
- **`noindex` until a domain is set** — preview/staging stay out of search on purpose.
- **No backend for enquiries** — the form only prepares a WhatsApp message. Supabase serves the journal and CMS only.
- **Not a static export** — `next/image`, server actions and revalidation need the Next server (Vercel or Node host).
- **Revalidation is per server instance**; multi-instance/HTML-caching-CDN hosts must redeploy after publishing.
- **Login throttle is in-memory per process** (best effort); Supabase Auth rate limits are the real protection. Uploads ≤ 4 MB.
- **9 pre-existing axe colour-contrast findings** on the public site (green WhatsApp button, small text) — not caused by the CMS; worth fixing.

---

## 8. Deploy

**Vercel:** import the repo; env vars `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (+ optional overrides, incl. `NEXT_PUBLIC_GTM_ID`) — **not** `DATABASE_URL`.
Build command: `npm run check:launch -- --strict && npm run build`. No `npm run images` step is needed (generated images are committed).
Vercel flags `NEXT_PUBLIC_*` variables with a "Keep this value private" warning — add them as type **Config** (not Secret): they are inlined into the browser bundle anyway, and the publishable key is public by design (RLS-limited). Set **Node.js 22.x/24.x** in Project → Settings (check:launch needs 22.18+); don't set `NEXT_PUBLIC_SITE_URL` on Preview so previews stay noindex and send no analytics.
A failing `check:launch --strict` means a required variable is missing (domain or the two Supabase values) — the build log names it. First Vercel deploy: being set up as of 2026-10-22, **not yet verified**; run the CMS smoke test (`docs/admin-cms.md` §11) on the deployed URL.
**Any Node host:** `npm ci && npm run images && npm run build && npm start` behind HTTPS (the CMS uses `Secure` cookies).
After launch: validate in Google's Rich Results Test, submit `sitemap.xml` in Search Console, link the Google Business Profile.

---

## 9. Recent change history (newest first)

- **2026-10-23 — Local SEO pass (Oddanchatram / Dindigul):** four new articles in `content/blog/` (`oddanchatram-palani-kodaikanal-group-trip`, `dindigul-sightseeing-group-tour`, `madurai-airport-dindigul-oddanchatram-transfers`, `group-vehicle-weddings-temple-visits-dindigul-district`), imported into Supabase as **hidden drafts needing business review** (9 posts, 0 public). Sitemap now gives the home page and `/blog` a `lastModified` (newest article) and no longer lists `/blog` until an article is public; robots.txt unchanged (already optimal for the gate). New `tests/sitemap-robots.test.ts`; hard-coded article counts in two tests updated 5→9. Checks: lint + typecheck clean, build passes, 170 offline tests pass; the 18 live-DB tests could NOT be verified this session — two orphaned test sessions from an interrupted run (pids 366280 and 367158, "idle in transaction") hold locks on `auth.users`; end them in Supabase (Database → Query performance / SQL: `select pg_terminate_backend(pid) …`) or wait for the pooler to drop them, then re-run `npm test`. Plan and owner to-dos: `docs/local-seo-plan.md`. Distances in the articles are approximate (public sources) — owner to verify; `serviceArea`/`areaServed` still empty until confirmed.
- **2026-10-23 — GA4 recorded:** Measurement ID `G-JMDL8MDC6E` (stream OG TRAVELS, `https://www.ogtravels.in`). Decision: GA4 is delivered via the existing GTM container, no code change; docs updated (`docs/seo-aeo.md`, `LAUNCH-CHECKLIST.md`, this file) with the GTM steps and the intended production domain. Not yet done: GTM tag + publish, `NEXT_PUBLIC_SITE_URL` on Vercel.
- **2026-10-22 — pushed to GitHub:** commit `19e6908` ("Add admin CMS, Supabase-backed journal and Google Tag Manager") on `main` contains all CMS, Supabase and GTM work. Vercel deploy guidance added (§8): env vars as Config type, Node 22+/24, build command.
- **2026-10-22 — Google Tag Manager installed** (container `GTM-K42Z4THV`): `GoogleTagManager` component in `SiteChrome`, `lib/gtm.ts` gate (production + domain set + valid ID), `business.analytics.gtmId`, `NEXT_PUBLIC_GTM_ID`, conditional privacy wording, `admin/not-found.tsx`, launch-check item, `tests/gtm.test.ts` (179 tests). Verified in a browser: `gtm.js` requested and `dataLayer` initialised on public pages, absent on `/admin`.
- **2026-10-20 — docs refresh:** ARCHITECTURE/README/handover rewritten for the CMS; new `CLAUDE.md`; every doc now carries a "Last updated" stamp (see CLAUDE.md for the rule).
- **2026-10-20 — first CMS admin created** (`ogtravels.ckp@gmail.com`) via a one-off script; verified sign-in + `is_admin`.
- **2026-10-20 — Admin CMS** at `/admin`: dashboard, Markdown editor with live sanitised preview, cover uploads (Supabase Storage), review → publish workflow enforced in the DB, slug-change 308 redirects,
  secure preview, SEO/AEO guidance panel, on-demand revalidation, backup/restore scripts, admin allow-list tooling. Public pages moved into the `(site)` route group so `/admin` has its own layout.
  Tests: unit + live-DB RLS tests + Playwright `qa:admin` (174 tests; 85 e2e checks). Reusable template: `prompts/universal-seo-cms-template.md`.
- **2026-10-20 — Supabase blog + SEO/AEO pass:** `blog_posts` with RLS, migration + import scripts, async Supabase-backed blog layer (Markdown kept as rollback), sanitised article rendering,
  `FAQPage` JSON-LD, hardened JSON-LD serializer, empty-journal handling, vitest suite.
- Number plate hidden in all vehicle images; header same teal as the hero; **logistics palette** (teal/navy hero, amber + green buttons); minimal clean-up (removed "why travel" strip, 3-step cards,
  hero scroll cue/caption, eyebrows, grain, progress bar, footer CTA — SEO-relevant copy kept).
- Hero van slides on load (silent); click replays with engine + honk. Mobile Call/WhatsApp moved to floating buttons. Scrolling Google-reviews section (config-driven, verified-only).
- v2 redesign (cinematic identity, motion, SEO blog system); initial build (landing page, config-driven enquiry flow, SEO foundations).

_Git: `main` is pushed to `origin` (latest commit `19e6908`); the working tree was clean at that point. Nothing from the CMS/Supabase/GTM work remains uncommitted._
