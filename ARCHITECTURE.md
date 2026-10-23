> **Last updated: 2026-10-22 16:37 IST (UTC+05:30)**

# Architecture — OG Tours and Travels website

How the system is put together and why. For day-to-day orientation see [`handover.md`](handover.md);
for setup and usage see [`README.md`](README.md); for AI-assistant working rules see [`CLAUDE.md`](CLAUDE.md);
for go-live steps see [`LAUNCH-CHECKLIST.md`](LAUNCH-CHECKLIST.md). Topic docs: [`docs/admin-cms.md`](docs/admin-cms.md),
[`docs/supabase-blog.md`](docs/supabase-blog.md), [`docs/seo-aeo.md`](docs/seo-aeo.md).

> **Next.js 16.** This version has breaking changes from older releases (see [`AGENTS.md`](AGENTS.md)) — e.g.
> Middleware is now **Proxy** (`src/proxy.ts`), `preload` replaces `priority` on `next/image`, `images.qualities`
> is required. Read the relevant guide in `node_modules/next/dist/docs/` before changing framework-level code.

---

## 1. System overview

Two products in one Next.js app:

1. **The public site** — a statically generated, server-rendered marketing site with one job: turn visitors into
   enquiries via **WhatsApp or phone**. No third-party scripts apart from **Google Tag Manager** (production only, public pages only), no application API. Its only external dependency is a
   **read-only Supabase table (`blog_posts`)** that supplies the travel journal.
2. **The admin CMS at `/admin`** — a private editor for that journal (Supabase Auth + an `admin_users` allow-list + Row Level
   Security). It is the only part of the app that is dynamic or writes data.

```
   PUBLIC SITE                                                          ADMIN CMS (/admin)
   ───────────                                                          ──────────────────
   src/config/business.ts ◄─ NEXT_PUBLIC_* env                          browser ─► proxy.ts (refresh session; anonymous GET → login)
   src/content/faq.ts                                                              └► page / server action / route handler
   content/blog/*.md  (import + rollback source)                                         └► requireAdmin()  = Auth getUser() + rpc is_admin()
            │ build / on-demand render                                                        │ uses the ADMIN'S OWN session (publishable key + JWT)
            ▼                                                                                 ▼
   Supabase ◄── anon key, RLS: published rows only ──┐                        Supabase  blog_posts · blog_slug_redirects · admin_users
   (blog_posts)                                      │                        Storage    blog-covers (public read, admin write)
            │                                        │                                   │ after changing anything public
            ▼                                        └──────── same tables ─────────────►│
   Prerendered pages · sitemap · robots · RSS · JSON-LD · optimised images      revalidatePath(article, lists, /blog, /, sitemap, feed)
            │ visitor taps CTA
            ▼
   wa.me/<number>?text=…   |   tel:+<number>      (the only "backend" for enquiries is WhatsApp itself)
```

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 (tokens in `@theme`), compiled through `@tailwindcss/turbopack` |
| Icons / fonts | `lucide-react`; Space Grotesk, Inter, Instrument Serif self-hosted via `next/font` |
| Content | Supabase `blog_posts` (RLS) → `marked` + `sanitize-html`; Markdown files kept as import/rollback source (`BLOG_SOURCE=markdown`) |
| Admin auth | Supabase Auth (email + password), server-side `@supabase/ssr` session in HttpOnly cookies; no browser Supabase client |
| Images | `sharp` (build-time asset pipeline **and** runtime upload processing); Supabase Storage bucket `blog-covers` for uploads |
| Motion | CSS keyframes/transitions + one shared `IntersectionObserver`; no animation library |
| Hosting | Needs the Next server (`next/image`, server actions, revalidation): Vercel or a Node host. **Not** a static export |
| Quality | ESLint, `tsc --noEmit`, Vitest (unit + live-DB), Playwright + axe (`qa`, `qa-interact`, `qa-admin`), `check:launch` gate |

---

## 2. Guiding principles

1. **One source of truth.** Business facts live in [`src/config/business.ts`](src/config/business.ts); articles live in `blog_posts`.
2. **Nothing is invented.** Unknown values are `null` / `[]`; every consumer renders conditionally, so an empty value *removes* the UI and
   structured data instead of showing a placeholder.
3. **Never a dead link.** Contact URLs are built centrally; invalid numbers disable (WhatsApp) or omit (Call) the button.
4. **Server components by default**; small client islands only where interactivity requires it.
5. **Content is in the HTML** (works with no JS and for crawlers); motion is transform/opacity only, so CLS stays 0.
6. **Safe by default.** No production domain ⇒ the site is `noindex`, `robots.txt` disallows all, the sitemap is empty.
7. **Defence in depth for the CMS.** Authorisation is checked in the Proxy (convenience), in every page/action/handler (`requireAdmin`),
   and by the database (RLS + CHECK constraints). No `service_role` key exists in the app.
8. **A database failure is never presented as "no articles"**; the build fails with an actionable message.

---

## 3. Source layout

```
src/
  proxy.ts                   Next 16 Proxy for /admin: refresh session cookies, redirect anonymous page loads (GET/HEAD only)
  app/
    layout.tsx               Root layout: <html>/<body>, fonts, global metadata (no page chrome)
    not-found.tsx            404 (brings its own SiteChrome)
    robots.ts · sitemap.ts   Generated from config + published posts (domain-gated)
    globals.css              Design tokens, surfaces, animation utilities, article typography
    icon.png/svg · apple-icon.png
    (site)/                  PUBLIC route group — layout.tsx wraps pages in SiteChrome
      page.tsx               Home (nine sections)
      privacy/page.tsx
      blog/page.tsx · blog/page/[n]/page.tsx · blog/[slug]/page.tsx · blog/feed.xml/route.ts
    admin/                   PRIVATE CMS — own layout, none of the public chrome
      layout.tsx             noindex metadata + skip link
      login/page.tsx · forbidden/page.tsx
      (panel)/layout.tsx     authenticated shell (AdminShell)
      (panel)/page.tsx       dashboard
      (panel)/posts/new · posts/[id]/edit · posts/[id]/preview
      api/covers/route.ts    image upload endpoint (Node runtime)
      actions.ts             all Server Actions (sign-in/out, save, transitions, delete, preview, slug check)
  components/
    layout/                  SiteChrome · Header · MobileNavigation · MobileContactBar · Footer · CurrentYear · DevConfigNotice
    sections/                Home-page sections (Hero, Vehicle, Services, Reviews, Booking, Destinations, LatestStories, FAQ, FinalCTA)
    blog/                    ArticleView (shared by public page + admin preview) · ArticleCard · BlogListing · CoverImage · Breadcrumbs · TableOfContents
    ui/                      CtaLink · buttonStyles · Accordion · Reveal · Logo · SectionHeading
    seo/                     StructuredData (site JSON-LD) · JsonLd (script renderer)
    analytics/               GoogleTagManager (GTM loader + noscript iframe; rendered by SiteChrome only)
    admin/                   AdminShell · LoginForm · PostEditor · MarkdownEditor · CoverField · SeoPanel · TransitionPanel · DeleteDraft · StatusBadge · upload-client · styles
  config/business.ts         Single source of truth for business details
  content/faq.ts             FAQ copy
  lib/
    enquiry.ts · site.ts · gtm.ts · blog-covers.ts · covers.ts
    blog.ts                  Async public blog API (server-only), source switch, build-phase memo
    blog-core.ts             Types, validation (parseRow), publication rule, ordering, related/adjacent, date format
    blog-render.ts           Markdown → sanitised HTML + TOC headings
    blog-source-supabase.ts  Published posts (+ slug redirect lookup); errors throw
    blog-source-markdown.ts  content/blog/*.md source (rollback)
    seo.ts                   JSON-LD builders + safe serializer
    supabase/                server.ts (public read client) · session.ts (admin session client) · session-options.ts (cookie flags)
    admin/                   auth · paths · rate-limit · slug · workflow · post-input · seo-check · posts · cover-image · revalidate · editor-props
  assets/images/             Generated web-ready masters (bundled by next/image)

supabase/migrations/         001_create_blog_posts.sql · 002_admin_cms.sql   (idempotent; applied with npm run db:migrate)
content/blog/                Markdown posts (import + rollback source)
docs/                        admin-cms.md · supabase-blog.md · seo-aeo.md
prompts/                     Task prompts, incl. universal-seo-cms-template.md (reusable CMS template)
tests/                       Vitest: unit + live-database tests
scripts/                     optimize-images · check-launch · db-migrate · import-blog · export-blog · blog-status · admin-users
                             qa · qa-interact · qa-admin · serve-qa.sh · lib/{db,blog-import}
public/                      og.jpg · sounds/engine-roar.mp3 · sounds/car-honk.mp3
assets/originals/            Untouched source photos (never modified)
```

---

## 4. Rendering model

| Route | Type | Notes |
|---|---|---|
| `/` | Static, revalidated by the CMS | "Latest stories" reads published posts |
| `/blog` | Static, revalidated | Featured post + first page; `noindex` and out of the sitemap while there are no published posts |
| `/blog/page/[n]` | Static (`generateStaticParams`), revalidated | `noindex, follow`, only exists when posts overflow `postsPerPage` (6) |
| `/blog/[slug]` | Static for known slugs; `dynamicParams = true` | New slugs render on first request. Unknown → renamed-slug lookup → `permanentRedirect` (308) or `notFound()` (404) |
| `/blog/feed.xml` | Route handler, `force-static`, revalidated | RSS 2.0, published posts only |
| `/privacy` | Static | |
| `/robots.txt`, `/sitemap.xml` | Metadata routes, revalidated | Driven by `getSiteUrl()` and published posts; `Disallow: /admin` |
| `/admin/**` | Dynamic (`no-store`), `noindex` | Authorised per page/action; headers set in `next.config.ts` |
| `/admin/api/covers` | Route handler (Node runtime) | POST only; same-origin + admin + rate-limited |

**Build vs. runtime.** The public pages are prerendered at `next build`. Reads of `blog_posts` are memoised per build worker **only during the
build** (`NEXT_PHASE === "phase-production-build"`); at runtime the memo is off so pages regenerated after an admin change see fresh data.

**On-demand publishing.** Admin server actions call `revalidatePath` (after any change to something that is or was public) for: the article
(and every old slug redirecting to it), `/blog/[slug]`, `/blog/page/[n]`, `/blog`, `/`, `/sitemap.xml`, `/blog/feed.xml`. Pages regenerate on their
next visit — no rebuild. This needs a runtime that keeps the cache (Vercel or a single `next start`); behind several instances or an HTML-caching CDN,
redeploy instead. Changes made outside the CMS (CLI, SQL, import) need a redeploy.

### Server vs. client boundary

Only files marked `"use client"` ship component JS; `blog*.ts`, `lib/admin/*`, `lib/supabase/*` import `server-only`.

| Client component | Why it must be client |
|---|---|
| `layout/Header`, `MobileNavigation`, `MobileContactBar`, `CurrentYear` | Scroll/menu/focus state, `usePathname`, `useSyncExternalStore` |
| `sections/HeroSound`, `TripEnquiryForm`, `VehicleGallery` | Audio replay, controlled form + WhatsApp redirect, carousel |
| `ui/Accordion`, `ui/Reveal`, `blog/TableOfContents` | Expand/collapse, shared observer, active heading |
| `admin/LoginForm` | `useActionState` for the sign-in action |
| `admin/PostEditor` (+ `MarkdownEditor`, `CoverField`, `SeoPanel`, `TransitionPanel`, `DeleteDraft`) | Controlled form, dirty tracking, dialogs, XHR upload with progress, live preview via a server action |

### Layout composition

```
Root layout:  <html lang="en"> <body> {children}
Public:       (site)/layout → SiteChrome = SkipLink → <Header/> → <main id="main">{page}</main> → <Footer/> → <MobileContactBar/> → <StructuredData/> → <DevConfigNotice/>
Admin:        admin/layout (noindex, skip link) → login | forbidden | (panel)/layout → AdminShell (header, nav, sign-out) → <main id="admin-main">{page}</main>
```

Home order: `Hero (+HeroSound)` → `VehicleShowcase (+Gallery)` → `Services` → `GoogleReviews` → `BookingSteps (+TripEnquiryForm)` →
`Destinations` → `LatestStories` → `FAQ` → `FinalCTA`. `Destinations`, `GoogleReviews` and `LatestStories` render nothing when empty.

---

## 5. Data flow

### 5.1 Business configuration
`env (NEXT_PUBLIC_*)` → inlined at **build** → `config/business.ts` → `lib/site.ts`, `lib/enquiry.ts`, components, JSON-LD, robots/sitemap, `scripts/check-launch.mjs`
(loaded directly by Node, so `business.ts` stays import-free). Changing env values needs a rebuild.

### 5.2 Enquiry flow
All CTAs go through [`lib/enquiry.ts`](src/lib/enquiry.ts) (`normalizeNumber`, `whatsappHref`, `telHref`, message builders) and
[`CtaLink`](src/components/ui/CtaLink.tsx). WhatsApp and phone are separate values, never swapped. The trip form validates, keeps input on error,
builds a URL-encoded message and redirects the tab to `wa.me`; it never claims the enquiry was sent or availability checked.

### 5.3 Blog read path (public)
```
Supabase blog_posts ──(RLS anon: draft=false ∧ approved ∧ published_at<=now)──► blog-source-supabase ─┐
content/blog/*.md   ──(BLOG_SOURCE=markdown, rollback)───────────────────────► blog-source-markdown ──┤
                                                                                                      ▼
                     blog.ts (async; React cache per render + build-phase memo) ──► pages / sitemap / RSS / JSON-LD
                       getAllSlugs · getAllPosts · getPost (Markdown→sanitised HTML + h2/h3 TOC; null ⇒ 404/redirect)
                       getRelatedPosts · getAdjacentPosts · getRedirectTarget
```
* **One publication rule, defined three times, must agree:** RLS policy (`001_create_blog_posts.sql`), the app query, and `isPubliclyVisible` in `blog-core.ts`.
  The source re-checks every row it receives and throws if a non-public row appears.
* Rows are validated (`parseRow`); duplicates and malformed rows throw. Results are capped (1000) and never silently truncated.
* Article HTML passes an **allow-list sanitiser** (`blog-render.ts`); body images are allowed only from the project's own `blog-covers` bucket; a body `#` is demoted to `##`.
* Covers: legacy filenames map to static imports (`blog-covers.ts`); uploaded covers are Storage objects rendered by `CoverImage` with stored width/height
  (`images.remotePatterns` is derived from `NEXT_PUBLIC_SUPABASE_URL` in `next.config.ts`).

### 5.4 Admin CMS
* **Authentication:** Supabase Auth email/password, performed entirely server-side. Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, 7-day max age.
* **Authorisation:** `requireAdmin()` (`lib/admin/auth.ts`) runs in every admin page, server action and route handler: `auth.getUser()` (validated by the Auth server)
  then `rpc('is_admin')`. Anonymous/expired → `/admin/login`; signed in but not an admin → `/admin/forbidden`. The Proxy only refreshes cookies and bounces anonymous
  *navigations*; non-GET requests reach their handler, which authorises itself (so server actions and the upload endpoint behave correctly on expiry).
* **Admin authority** = a row in `admin_users` (user id, confirmed email, not banned). Only someone holding `DATABASE_URL` can add one: `npm run admin:users -- grant <email>`.
* **Data access:** the admin acts through the signed-in user's own session; RLS (`is_admin()`) is the second gate. No `service_role` key is used.
* **Workflow:** `draft` + `review_status`. States: Draft·needs review → *approve* (explicit confirmation; records reviewer/time) → Approved (draft) → *publish* → Published/Scheduled;
  *unpublish*; *send back*. Saving content never changes these flags. Transitions put their precondition in the same `UPDATE … WHERE` (atomic). A CHECK constraint makes **live ⇒ approved**.
* **Concurrency:** saves carry the loaded `updated_at`; a mismatch is reported as a conflict instead of overwriting.
* **Slugs:** validated format, unique in the DB, reserved words blocked. Changing a published slug records `old → new` in `blog_slug_redirects` via a `SECURITY DEFINER`
  trigger (no chains, no loops; a new post that takes an old slug cancels its redirect). Redirects are readable by the public only while the target is public.
* **Images:** `POST /admin/api/covers` — same-origin, admin, rate-limited, ≤ 4 MB; `sharp` decodes the bytes (browser MIME ignored), allows JPEG/PNG/WebP/AVIF only,
  min 600 px / max 8000 px, re-encodes to WebP (≤ 2000 px, metadata stripped), names the file from a hash of its content (duplicates collapse), uploads with the admin's session.
  An old cover is deleted only when no other post uses it.
* **Preview:** `/admin/posts/[id]/preview` renders the saved draft with the same `ArticleView`, `noindex`, `force-dynamic`, admin-only.
* **Guidance:** `lib/admin/seo-check.ts` produces actionable findings (not a score) plus search/social previews and a heading outline.

### 5.5 Database (Supabase Postgres)
| Object | Purpose / policy |
|---|---|
| `blog_posts` | Articles. Public `SELECT` = publication rule. `anon`: select only. `authenticated`: write policies require `is_admin()` |
| `admin_users` | Allow-list. A user may read only their own row; no write policies |
| `is_admin()` | `SECURITY DEFINER`; true only for allow-listed, confirmed, unbanned callers |
| `blog_slug_redirects` | Old → new slugs; maintained by trigger; select policy tied to target visibility |
| Storage `blog-covers` | Public bucket (files by URL, no listing); images only, 5 MB; admin-only insert/update/delete |
| Constraints | slug format/unique, length caps, canonical `http(s)`, `modified_at >= published_at`, cover dimensions both-or-neither, **live ⇒ approved** |
Migrations are versioned in `supabase/migrations/` and idempotent. CLI scripts connect with `DATABASE_URL` (session pooler string; the direct host is IPv6-only) — the website never reads it.

### 5.6 Static images
```
assets/originals/*  ──(npm run images: sharp)──►  src/assets/images/*  ──(next/image)──►  AVIF/WebP at request time
```
Crops timestamps, paints out number plates (`PLATES` table; patched copies go to `node_modules/.cache`), generates icons / social image / blog covers.
`next.config.ts` allow-lists image `qualities`, enables AVIF + WebP, 30-day cache, and the Storage cover host.

---

## 6. SEO and discoverability

| Mechanism | Where | Behaviour |
|---|---|---|
| Titles / descriptions | `layout.tsx` template `%s \| OG Tours and Travels`, per-page `generateMetadata` | Unique per page; article uses `seo_title ?? title`, `seo_description ?? excerpt` |
| Indexing switch | `layout.tsx` `robots`, `robots.ts`, `sitemap.ts`, canonical | All keyed off `getSiteUrl()`; no domain ⇒ noindex + empty sitemap |
| Canonical / OG / Twitter | `layout.tsx`, article `generateMetadata` | Article uses its uploaded cover as the social image (else `/og.jpg`) |
| Site JSON-LD | `seo/StructuredData` | `TravelAgency` + `WebSite`; contact points; address/areaServed/sameAs only if configured; no ratings, prices or hours |
| Article JSON-LD | `lib/seo.ts` → article page | `BlogPosting` + `BreadcrumbList` from the stored record; serializer escapes `< > &` and U+2028/9 |
| FAQ JSON-LD | `FAQSection` | `FAQPage` mirrors the visible FAQ |
| Sitemap / RSS | `sitemap.ts`, `feed.xml` | Published posts only; `/blog` only when ≥ 1 post |
| Redirects / 404 | article page | Renamed slug ⇒ 308 (while target public); unknown ⇒ 404 |
| Admin | headers + robots | `noindex, nofollow`, `no-store`, `Disallow: /admin` |

---

## 7. Design system

Defined once in [`src/app/globals.css`](src/app/globals.css) under `@theme`; token names are **legacy** and mapped in the file header.
`.surface-night` (teal→navy gradient: hero, final CTA, footer, header) re-points `--color-ink/--color-slate/--color-accent-deep` so `text-ink` etc. render light inside it;
`.surface-dark`/`.surface-graphite` are white; `.surface-light` is pale blue `#EEF4F7`. Buttons: `buttonClass()`; `CtaLink` picks green (WhatsApp) or amber (call).
Fonts: Space Grotesk / Inter / Instrument Serif. Motion utilities honour `prefers-reduced-motion`. Admin screens reuse the tokens via `components/admin/styles.ts`.

---

## 8. Client-side behaviour worth knowing

* **Header** — fixed teal bar, hides on scroll down, highlights the section in view; the mobile drawer is a sibling of `<header>` (so `backdrop-filter` can't collapse it).
* **MobileContactBar** — floating Call (left) / WhatsApp (right); steps aside when a field is focused.
* **Hero** — van slides in silently; click/tap replays with engine + honk (audio cannot autoplay on a cold load).
* **Reveal** — one shared observer; no flash, no layout shift.
* **Editor** — dirty tracking with `beforeunload` + a capture-phase click guard; `datetime-local` rendered after mount (`useSyncExternalStore`) to avoid timezone hydration mismatches.
* **Accessibility** — skip links, `aria-expanded`/`aria-controls`, `inert` when closed, ≥ 44 px targets, labelled admin forms with `aria-live` status regions.

---

## 9. Tooling and quality gates

| Command | Purpose |
|---|---|
| `npm run dev / build / start` | Standard Next workflow |
| `npm run images` | Regenerate `src/assets/images` from `assets/originals` |
| `npm run lint` · `npm run typecheck` | ESLint · `tsc --noEmit` |
| `npm test` | Vitest: unit tests + (with `DATABASE_URL`) live-database tests (RLS as anon / non-admin / admin, triggers, storage policies) — rolled-back transactions |
| `npm run check:launch [-- --strict]` | Launch readiness incl. Supabase config, public post count, pending reviews, admin count; `--strict` exits 1 on a missing **required** item |
| `npm run db:migrate` | Apply `supabase/migrations/*.sql` |
| `npm run blog:import / blog:export / blog:status` | Markdown ⇄ database, backups, CLI publish state |
| `npm run admin:users [-- grant\|revoke <email>]` | Manage the admin allow-list |
| `bash scripts/serve-qa.sh` | Build + serve on `:3100` with a test domain (kills `node.exe` first — Windows/Git Bash) |
| `node scripts/qa.mjs <url> <dir>` · `node scripts/qa-interact.mjs <url>` | Public-site Playwright + axe QA |
| `npm run qa:admin` | End-to-end CMS test (throw-away users, cleans up); needs `DATABASE_URL` and a running server |

Last recorded results: lint, typecheck, build clean and 179 tests pass (2026-10-22); as of 2026-10-20: `qa:admin` 85/85 twice in a row; public QA passes except 9 pre-existing axe
colour-contrast findings (green WhatsApp button, small text).

---

## 10. Deployment architecture

```
Git (main) ─► Vercel (or Node host)
               ├─ build:  npm run check:launch -- --strict && npm run build
               ├─ env:    NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (+ optional PHONE/WHATSAPP/EMAIL, BLOG_SOURCE)
               │          NOT DATABASE_URL (admin tooling only, kept on the owner's machine)
               └─ run:    next start behind HTTPS (HTTPS is required for Secure session cookies)
```
Hosting notes: add the `NEXT_PUBLIC_*` values as Vercel **Config** variables (the "keep private" warning is expected — they are inlined into the browser bundle; the publishable key is public by design, RLS-limited);
set Node.js 22.x/24.x (`check:launch` needs 22.18+); leave `NEXT_PUBLIC_SITE_URL` unset on Preview so previews stay `noindex` and Google Tag Manager stays off. Generated images are committed, so no `npm run images` step is needed.
First-time CMS setup: run migrations → configure Supabase Auth (sign-ups off, password policy) → provision the first admin → sign in. See [`docs/admin-cms.md`](docs/admin-cms.md) §1–2, §11.

---

## 11. Extension points

| To… | Change |
|---|---|
| Update phone/WhatsApp/domain/address/specs/services/destinations/reviews | `src/config/business.ts` (or env vars) |
| Write or publish an article | `/admin` (CMS). Bulk import from Markdown: `npm run blog:import` |
| Add a bundled cover image | `src/assets/images/` + one line in `lib/blog-covers.ts` (uploaded covers need no code) |
| Add an FAQ | `src/content/faq.ts` (the `FAQPage` JSON-LD follows) |
| Add a nav item / section id | `NAV_LINKS` / `SECTION` in `lib/site.ts` |
| Add a home section | New component in `components/sections/`, compose in `app/(site)/page.tsx` |
| Add an admin capability | New server action in `app/admin/actions.ts` **starting with `requireAdmin()`**; add RLS/tests if it touches new data |
| Add a column to articles | New numbered migration, update `BLOG_COLUMNS`/`parseRow` (public) and `AdminPost`/`post-input` (admin), tests |
| Retheme | Tokens in `globals.css`, surface helpers, `buttonStyles.ts` |

## 12. Known constraints

* **No application backend for enquiries.** The form only prepares a WhatsApp message; no availability check, storage or analytics.
* **Not a static export.** `next/image`, server actions and revalidation need the Next server.
* **On-demand revalidation is per instance.** Multi-instance/CDN-cached hosts must redeploy after publishing.
* **Login throttle is in-memory per process** — best effort; Supabase Auth's rate limits and a strong password are the real protection.
* **Uploads ≤ 4 MB** (serverless request cap); a save after the session expires is rejected and unsaved text is lost.
* **Audio needs a gesture.** Browsers block autoplay with sound on a cold load.
* **`noindex` until a domain is set** — intentional safety net.
* **Env vars are build-time** (`NEXT_PUBLIC_*`); rebuild after changing them.
* **Legacy token names** in `globals.css` (e.g. `midnight` = white) are mapped in the file header.
* **Bundled blog covers are generated composites** — example imagery.
* **Pre-existing:** 9 axe colour-contrast findings on the public site (green WhatsApp button, small text) — not caused by the CMS.
