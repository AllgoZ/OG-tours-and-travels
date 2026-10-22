# Universal Template — Secure SEO Content CMS (blog / articles) for any website

> **How to use this file**
> 1. Copy it into the new project (e.g. `prompts/seo-cms.md`).
> 2. Fill the **Project variables** table (§0). Leave a value as `—` if it doesn't apply.
> 3. Give the whole file to your AI coding agent with: *"Read `prompts/seo-cms.md` and execute it. Inspect the repo first, create a plan, then implement, test and document."*
> 4. Everything in `{{DOUBLE_BRACES}}` is a placeholder. Everything marked **MUST** is a requirement; **SHOULD** is a strong default; **MAY** is optional.
>
> This template was distilled from a working, tested implementation (Next.js 16 + Supabase: ~175 automated tests, an 85-check browser test, live database RLS tests). The reference stack is Next.js App Router + Supabase (Postgres, Auth, Storage), but §14 explains how to adapt each part to another stack. The *requirements and rules* are stack-independent; the *code shape* follows the reference stack.

---

## 0. Project variables (fill these first)

| Variable | Example | Your value |
|---|---|---|
| `{{PROJECT_NAME}}` | OG Tours and Travels | |
| `{{SITE_URL}}` | `https://www.example.com` (no trailing slash) | |
| `{{ADMIN_PATH}}` | `/admin` | |
| `{{CONTENT_NAME}}` | blog post / article / guide / news item | |
| `{{CONTENT_ROUTE}}` | `/blog/[slug]` | |
| `{{CONTENT_TABLE}}` | `blog_posts` | |
| `{{CATEGORIES}}` | free text with suggestions / fixed list | |
| `{{LOCALE}}` / `{{TIMEZONE}}` | `en` / `Asia/Kolkata` | |
| `{{FRAMEWORK}}` | Next.js 16 App Router | |
| `{{BACKEND}}` | Supabase (Postgres + Auth + Storage) | |
| `{{HOSTING}}` | Vercel / Node server / other | |
| `{{REVIEW_REQUIRED}}` | yes — owner/legal must approve before publishing / no | |
| `{{FIRST_ADMIN_EMAIL}}` | (leave blank; provisioned out of band, §6.3) | |
| `{{BRAND}}` | existing design system / colours | |

**Never write real secrets into this file, the repo, docs, logs, tests or chat.** Passwords, database URLs, JWT secrets and service keys belong only in git-ignored `.env.local` and the hosting provider's secret store.

---

## 1. Role, goal and non-negotiables

Act as a senior {{FRAMEWORK}} engineer, database/security architect, technical-SEO specialist and CMS product designer.

**Goal:** add a private, production-ready CMS at `{{ADMIN_PATH}}` so non-developers can write, review, publish and maintain {{CONTENT_NAME}}s that are **good for search engines and answer engines (SEO + AEO)**, on top of the project's **existing** site, database and design. Do not rebuild the site, replace the design, or create a second database/content pipeline.

**Non-negotiables**

1. **Inspect before editing.** Read the project docs (`README`, `ARCHITECTURE`, `AGENTS.md`/`CLAUDE.md`, handover/launch docs), `package.json`, env example, routing/layout files, existing content model, SEO files (metadata, sitemap, robots, feeds, JSON-LD) and any existing DB schema/RLS/migrations. Verify what exists; don't assume.
2. **Read the framework's own docs in `node_modules`/official docs** before framework-level changes if the version is new (APIs change — e.g. Next.js 16 renamed Middleware to **Proxy**).
3. **Plan first (short), then execute.** Don't stop at a plan or a mockup. Implement, run the checks, report truthfully.
4. **Security is not optional** (§6). **No secrets in code/docs. No privileged keys in the browser. Never disable RLS.**
5. **Preserve the public site**: URLs, canonical rules, structured data, sitemap/feeds, accessibility, performance, the noindex-until-domain safety gate, contact/conversion flows.
6. **Never invent facts** (reviews, prices, credentials, authors, addresses). Unknown = empty = not rendered.
7. **Never claim success without running the checks.** Report what failed. If credentials are unavailable, implement and test what you can and list what remains.
8. **Don't over-engineer.** No editor framework, ORM or queue unless it's genuinely needed. Prefer fewer dependencies.

---

## 2. Phase plan (do in this order; verify each phase)

| # | Phase | Output | Verify |
|---|---|---|---|
| 1 | Inspect | Findings list, risks, safest sequence | — |
| 2 | Database | Versioned migrations: content table, admin allow-list, RLS, workflow constraint, redirects, storage bucket | Apply to DB; query as anon/non-admin/admin |
| 3 | Data layer | Public read layer (published only) + admin data layer (user-session) | Unit tests with a stub client |
| 4 | Auth & authorization | Login, session, `requireAdmin`, proxy/middleware, logout, throttling | Anonymous / non-admin / admin / expired tests |
| 5 | Public wiring | Public pages read the DB; metadata/JSON-LD/sitemap/feed from stored data | Build; compare output |
| 6 | Admin UI | Dashboard, editor, workflow panel, uploads, SEO panel, preview | Browser test |
| 7 | Publishing pipeline | On-demand revalidation (or rebuild hook) + slug redirects | Publish → public page changes without rebuild |
| 8 | Tests | Unit + live-DB + end-to-end | All green, honestly reported |
| 9 | Docs | Setup, provisioning, usage, publishing, troubleshooting, backup, rotation, deploy | A new person can follow them |
| 10 | Report | Files, migrations, env names, tests actually run, outstanding external tasks | — |

---

## 3. Architecture rules

### 3.1 Route structure
* Use **route groups** so the admin has its **own layout** with none of the public header/footer/floating contact buttons/animations:
  * `app/(site)/…` → public pages inside the marketing chrome (extract the chrome into one `SiteChrome` component).
  * `app/admin/login`, `app/admin/forbidden` → unauthenticated shell.
  * `app/admin/(panel)/…` → authenticated shell: dashboard, `posts/new`, `posts/[id]/edit`, `posts/[id]/preview`.
  * `app/admin/api/…` → upload endpoint.
  * Root layout: `<html>`, `<body>`, fonts, global metadata only. The global `not-found` must bring its own `SiteChrome`.
* Share the public article layout with the preview via one `ArticleView` component, so **preview = exactly what visitors see**.

### 3.2 Who talks to the database as whom
* **Public site (build + runtime reads):** publishable/anon key only. Sees only published rows because **RLS** says so.
* **Admin CMS:** the **signed-in admin's own session** (publishable key + that user's JWT). Authorization is enforced by RLS via an `is_admin()` function. **No `service_role`/secret key is used anywhere in the app.**
* **Migrations / imports / provisioning admins:** a direct database connection string (`DATABASE_URL`) used **only by CLI scripts on the owner's machine**. Never a `NEXT_PUBLIC_*` variable, never in hosting env.
* Server-only modules import `server-only`; never import them from client components.

### 3.3 Content format
* Canonical body format = **Markdown** stored as text. Render + **sanitise** on the server (allow-list HTML sanitiser). Never trust stored content as HTML.
* Allowed output: headings h2–h4, paragraphs, lists, links (http/https/mailto/tel), blockquote, code, tables, and images **only from your own storage bucket**. Strip everything else (script, iframe, event handlers, `javascript:`/`data:` URLs).
* A stray `# H1` in the body is demoted to `##` — the page title is the only H1.

### 3.4 Rendering & publishing
* Keep static generation. Admin changes refresh the affected public pages **on demand** (authenticated server action → `revalidatePath`), no public webhook. New slugs render on first request (`dynamicParams = true`). Details in §9.
* A failed required database read during a build **must fail the build** with an actionable message — never produce an empty site silently.
* Build-time memoisation of the content query is allowed **only during `next build`** (check `NEXT_PHASE`); at runtime it must be off, or revalidated pages would serve stale data.

---

## 4. Database requirements (migrations, versioned, idempotent)

Create `supabase/migrations/001_*.sql` (content) and `002_*.sql` (admin CMS) — adapt to the repo's migration convention. Every statement idempotent (`if not exists`, `drop policy if exists`, `on conflict`). Provide a tiny runner script (`npm run db:migrate`) that applies files in order, each in a transaction, and redacts credentials in errors.

### 4.1 Content table `{{CONTENT_TABLE}}`
Columns (adapt names to the existing schema; **reuse the existing table if there is one — never create a duplicate**):

`id uuid pk default gen_random_uuid()` · `slug text unique` · `title` · `excerpt` · `content` (Markdown) · `cover` (filename/object name) · `cover_width int`, `cover_height int` · `cover_alt` · `author` (nullable, verified only) · `category` · `tags text[]` · `published_at timestamptz` · `modified_at timestamptz` (editorial "last updated" → `dateModified`) · `seo_title` · `seo_description` · `canonical` · `draft boolean default true` · `review_status text default 'needs-business-review'` · `reviewed_at`, `reviewed_by uuid → auth.users on delete set null` · `created_at`, `updated_at` (trigger-maintained row bookkeeping — **different** from the editorial dates).

Constraints (database-level, not just UI): slug regex `^[a-z0-9]+(-[a-z0-9]+)*$` ≤120; title/excerpt/content/category non-empty & length caps; canonical `^https?://\S+$`; cover filename regex; `review_status in (...)`; `modified_at >= published_at`; cover dimensions **both or neither** (use `(w is null) = (h is null)` — a bare `BETWEEN` check lets a lone NULL slip through).

Indexes: published-posts partial index `(published_at desc) where draft=false and review_status='approved'`, `(category, published_at desc)` partial, GIN on `tags`; slug has the unique index.

### 4.2 The publication rule (single definition, used everywhere)
```
public  ⇔  draft = false  AND  review_status = 'approved'  AND  published_at <= now()
```
* The **RLS policy**, the **app query** and a **pure `isPubliclyVisible()` function** must agree. Cover them with a test that fails if they diverge.
* **Workflow invariant (DB CHECK):** `draft = true OR review_status = 'approved'` — a live post must be approved. Before adding it, fix legacy rows that violate it (set `draft = true`).
* If `{{REVIEW_REQUIRED}}` = no, still keep the columns; approval can be auto-recorded by the admin in one click.

### 4.3 Admin allow-list
```sql
create table public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, email text, created_at timestamptz default now());
alter table public.admin_users enable row level security;
-- a signed-in user may read ONLY their own row; no write policies exist
create policy "Users can read their own admin row" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.admin_users from anon, authenticated; grant select on public.admin_users to authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a join auth.users u on u.id = a.user_id
   where a.user_id = (select auth.uid()) and u.email_confirmed_at is not null
     and (u.banned_until is null or u.banned_until <= now())); $$;
revoke all on function public.is_admin() from public, anon; grant execute on function public.is_admin() to authenticated;
```
Authorization is a **row keyed by user id** (not by email string, not by client metadata), so registering with someone's email, or editing `user_metadata`, never grants access.

### 4.4 Policies on the content table
* Keep the public `SELECT` policy (anon + authenticated): the publication rule.
* Add `to authenticated` policies for SELECT/INSERT/UPDATE/DELETE with `using / with check ((select public.is_admin()))`.
* `revoke all … from anon, authenticated; grant select … to anon; grant select, insert, update, delete … to authenticated;` (RLS then decides who).
* **Never** `using (true)` on writes. **Never** disable RLS. Don't use `FORCE ROW LEVEL SECURITY` if your migration/import role must write (the DB owner bypasses RLS).

### 4.5 Slug redirects (maintained by the database)
```sql
create table public.slug_redirects (old_slug text primary key check (old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  new_slug text not null references {{CONTENT_TABLE}}(slug) on update cascade on delete cascade, created_at timestamptz default now());
-- RLS: readable only while the TARGET post is readable (so a hidden draft's new slug never leaks)
create policy … for select to anon, authenticated using (exists (select 1 from {{CONTENT_TABLE}} p where p.slug = slug_redirects.new_slug));
```
`AFTER INSERT OR UPDATE OF slug` trigger (**SECURITY DEFINER**, `search_path=''`): delete any redirect whose `old_slug = new.slug` (a live slug must never redirect away → no loops/shadowing); on rename insert `old → new` (upsert). `ON UPDATE CASCADE` repoints earlier redirects so there are **no chains**. Do **not** add `check (old_slug <> new_slug)` — the cascade can transiently create `A→A` when renaming back; the trigger deletes it.

### 4.6 Storage bucket for images
Public bucket `blog-covers` (name per project): `file_size_limit` 5 MB, `allowed_mime_types` webp/jpeg/png/avif. Public buckets serve files by URL without a SELECT policy, so the public **cannot list** them. Add `storage.objects` policies (insert / update / delete / select) `to authenticated` with `bucket_id = '…' and (select public.is_admin())`.

---

## 5. Data layer

**Public read layer** (`lib/blog.ts` facade, async): `getAllSlugs, getAllPosts, getPost(slug), getRelatedPosts, getAdjacentPosts, getRedirectTarget(slug)`.
* Query exactly the publication rule + order `published_at desc, slug asc`; limit with a guard that **throws** if the cap is reached (never silently truncate).
* Validate every row (`parseRow`), re-check `isPubliclyVisible`, check duplicate slugs. Any error → throw `BlogDataError` with an actionable, credential-free message. An empty result is legitimate; an error is never turned into "no posts".
* A `SOURCE` env switch (`supabase` default / `markdown` rollback) is recommended when migrating an existing file-based blog; keep the old files until production is verified.
* Split pure logic (`blog-core`: types, validation, visibility, ordering, related/adjacent, date format) from I/O (sources) from rendering (`blog-render`: Markdown→sanitised HTML + headings) so each is unit-testable.

**Admin data layer** (`lib/admin/posts.ts`, `server-only`, takes the **session client**):
* `getDashboardStats` (head-count queries; on error return the error — never fabricate numbers), `listPosts` (search `ilike` on title/slug with **sanitised** input, status/category filters, sort by updated/published, page size ~15), `listCategories`, `getPostById` (validate UUID first), `slugTaken`, `postsLinkingTo(slug)`, `coverUsageCount`, `redirectSourcesFor(slug)`.
* Mutations: `createPost` (**forces** `draft=true`, `review_status=needs…` regardless of input), `updatePost` (**optimistic concurrency**: `.eq('updated_at', loadedToken)`; zero rows = conflict message), `applyTransition` (precondition in the **same UPDATE's WHERE**), `deleteDraft` (only `draft=true`).
* Map Postgres/PostgREST error codes to editor-friendly messages (`23505` slug taken, `23514` constraint, `42501` permission, `PGRST301` expired session); never leak internals.

---

## 6. Authentication & authorization

### 6.1 Rules
* **Use the backend's real auth (Supabase Auth email/password).** No custom password code, no tokens in `localStorage`.
* Auth entirely **server-side** (no browser Supabase client) so session cookies can be **`HttpOnly`**, `SameSite=Lax`, `Secure` in production, with a bounded `maxAge`. Share the cookie options between the proxy and the server client in a tiny module that doesn't import `next/headers`.
* **`requireAdmin()`** — one primitive, called at the top of **every** admin page, server action and route handler (never rely on proxy/layout/hidden links):
  1. `auth.getUser()` (validates the token with the auth server; do not trust cookies alone);
  2. `rpc('is_admin')`.
  Anonymous/expired → redirect `/admin/login?reason=expired`; signed in but not admin → `/admin/forbidden` (no content). A `getAdminOrNull()` variant for the login page and JSON endpoints.
* **Proxy/middleware** (Next 16: `src/proxy.ts`, matcher `/admin` + `/admin/:path*`): refresh the session cookies and redirect anonymous **GET/HEAD page loads** to login. **Do not redirect non-GET requests** (server-action calls, uploads): let them reach their handler so the action's own `redirect()` is followed correctly and the upload endpoint returns **401 JSON** (a 307 to an HTML login page breaks server actions and XHR). Treat proxy as a convenience layer only.
* **Login action:** validate input; generic error ("Incorrect email or password") for unknown email **and** wrong password with the same delay (no enumeration); after a valid sign-in, check `is_admin` and sign out + refuse if not; `next` redirect target validated by a strict allow-list (`/admin/...` only — no `//`, `..`, backslashes, scheme). Throttle per IP and per hashed email (in-memory sliding window is acceptable **only if documented as best-effort**; the authoritative limit is the auth provider's rate limit).
* **Logout** action clears the session and redirects to login. **Expired session during an action** → redirect to login; nothing is written.
* **CSRF:** server actions rely on the framework's Origin check; custom route handlers must require a same-origin `Origin` header; cookies are `SameSite=Lax`.
* **Headers for `/admin/*`** (in `next.config`): `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. Add `Disallow: /admin` to robots (and keep it out of the sitemap). `noindex` ≠ robots disallow — use both.

### 6.2 Provider settings (document these for the owner; they are Dashboard steps)
Email provider on, **Confirm email on**, **public sign-ups OFF**, password min length ≥12 (+ leaked-password protection if available), review auth rate limits, set Site URL, optionally MFA and session time-boxing.

### 6.3 Initial admin provisioning (secure, documented)
Admins are added only by someone holding the DB credential: create the Auth user in the Dashboard (auto-confirm), then `npm run admin:users -- grant <email>` (script: connects via `DATABASE_URL`, refuses unknown/unconfirmed emails, inserts into `admin_users`; also `list` and `revoke`). Equivalent SQL in the docs. Revoking takes effect on the next request. The task prompt may ask the agent to create an admin directly; if so, do it with a one-off script that reads credentials from env vars, **never writes them to files**, refuses to modify an existing user, then verifies by signing in and calling `is_admin`. Tell the owner to change that password (it appeared in chat) and to enable the other hardening settings.

---

## 7. Admin UI requirements

Visually separate, responsive, brand-consistent, keyboard accessible, visible focus, labelled controls, `aria-live` status regions, `role="alert"` errors, ≥44px targets, no JS-only essentials on the dashboard (filters are a plain GET form).

### 7.1 Dashboard (`/admin`)
Real counts (total, published, scheduled, drafts, awaiting review) from the DB — **on error show an error banner, never fake numbers**. Search (title/slug), filter by status & category, sort (recently updated / publication date), pagination, empty states ("No posts yet" vs "No posts match"), success banner after delete. Per row: title, status badge, `/blog/slug`, category, dates, **Edit / Preview / View live**.

### 7.2 Editor (single page, one form)
Fields (real column names): title, slug, excerpt, content, cover (+alt), author, category (datalist of existing), tags, SEO title, meta description, canonical (validated), publication date, "last updated" date (+ checkbox "mark as updated now" for live posts).
* **Slug:** auto-suggest from title until the editor edits it; "Suggest from title" button; availability check on blur; preserve slug unless changed. If a **live** slug changes: prominent warning, explain the 308 redirect, list other posts that link to the old URL.
* **Markdown editor:** toolbar inserting syntax (H2/H3/bold/italic/link/lists/quote/image), Write ⇄ Preview tabs, preview rendered by a **server action using the same sanitising pipeline** as the public site (debounced), word count, hint to use `##`/`###`.
* **Dirty tracking:** "Unsaved changes" badge; `beforeunload` plus a capture-phase click guard on in-app links with `confirm()`; baseline reset after a successful save; concurrency token (`updated_at`) rebased from the save/transition result.
* **Dates in the browser's timezone:** render `datetime-local` only after mount (use `useSyncExternalStore` so SSR/hydration don't mismatch) and submit ISO via hidden inputs.
* **Save bar** (sticky): clear text — "Saving never changes publication status".
* Server-side field errors shown beside fields (`aria-invalid`, `aria-describedby`).

### 7.3 Workflow panel (separate form from the editor)
Status badge + plain-language explanation; only the **allowed** buttons; disabled while the editor is dirty ("Save your changes first — these actions apply to the saved version"). States & transitions (pure module shared by server + UI):

```
 Draft · needs review ──approve──► Approved (draft) ──publish──► Published / Scheduled
          ▲                              │  ▲                          │
          └──────── send back for review─┴──┴────── unpublish ─────────┘
```
* **approve** requires an explicit confirmation checkbox ("the business owner has reviewed this") — records `reviewed_at`, `reviewed_by` (from the **session**, never the browser).
* **publish** only from approved draft; optional "use today as publication date" (default on when the date was never customised); future date ⇒ scheduled; blocks if title/excerpt/content missing or cover lacks alt text.
* **unpublish** → draft (keeps approval). **send back** → draft + clears approval (also takes a live post offline in the same statement, to satisfy the CHECK).
* Each transition: re-read the row, verify `allowedTransitions`, apply with the **precondition inside the UPDATE** (zero rows ⇒ "the article changed, reload"), then revalidate public paths. Messages tell the editor **when the public site updates**.
* **Delete:** drafts only, via a `<dialog>` confirmation; server re-checks `draft=true` and `confirm=yes`; remove the cover file only if no other post uses it.

### 7.4 Cover & body images
* Upload via a **route handler** (`POST /admin/api/…`, `runtime = 'nodejs'`) using **XHR for real progress**; show preview; replace/remove; legacy/bundled images selectable.
* Server checks, in order: same-origin → admin (JSON 401/403, not a redirect) → per-user rate limit → size (**≤ 4 MB** to fit serverless request caps) → **decode the bytes with an image library** (ignore filename/MIME) → allow only jpeg/png/webp/**avif** (note: libvips reports AVIF as `heif` with `compression: 'av1'`; accept that, reject HEIC/GIF/SVG/animated/others) → min width 600, max side 8000, `limitInputPixels` ~40 MP → `.rotate()`, resize to ≤2000, **re-encode to WebP** (drops EXIF/GPS and appended payloads) → name = **hash of the processed bytes** (`<20 hex>.webp`, so duplicates collapse and names are safe by construction) → upload with the **admin's session** (`upsert: false`; "already exists" = success/"reused") → return name, width, height, URL.
* Server action re-validates on save: cover must be a known bundled name **or** match the hash-name pattern **and exist in the bucket**; dimensions required for uploaded covers; alt text required before publishing.
* Replacing a cover deletes the old file **only if unused by other posts**.
* Render path: a `CoverImage` component handles bundled (static import) vs uploaded (remote URL + stored width/height ⇒ no layout shift). Configure `images.remotePatterns` for exactly the bucket's public path (derived from the Supabase URL env). Use the uploaded cover as OG/Twitter/JSON-LD `image` (else the site-wide image).
* Body images: allowed in sanitised Markdown **only** from the project's own bucket path (single path segment, no `..`), with `loading="lazy"`.

### 7.5 SEO & answer-readiness panel (guidance, **not a score**)
Pure function `analyzeSeo()` returning findings `{id, level: error|warn|tip, message}` for: missing title; duplicate slug; empty content; missing SEO title / meta description; SEO title >60 or <25, description >160 or <70, excerpt >300; invalid canonical (and a tip that a custom canonical is rarely wanted); missing cover alt; body `#` H1; skipped heading levels; `###` without `##`; no sections in a long article; **no internal links** (count only site-relative links, not `//host`); very short article. Plus: Google-style **search snippet preview**, **social share preview**, **heading outline** (ignore code fences). Copy must never promise rankings, traffic, citations or "scores"; include a test that the messages contain no such words.

### 7.6 Secure preview (`/admin/posts/[id]/preview`)
`requireAdmin` → fetch by id via the admin session → render with `ArticleView` + a clear "Preview — admin only, not indexed" banner; `robots: noindex, nofollow, nocache`; `dynamic = 'force-dynamic'`; never emits JSON-LD; never reachable anonymously; not a secret-URL scheme.

---

## 8. SEO / AEO on the public side (generated from stored content)

* Metadata per article: title (`seo_title ?? title`), description (`seo_description ?? excerpt`), canonical (`canonical ?? {{SITE_URL}}/blog/slug`; omit canonical until the production domain exists), OG `article` + `publishedTime/modifiedTime/authors/images`, Twitter card with image.
* **Keep the noindex-until-domain safety gate**: no `SITE_URL` ⇒ `robots noindex`, `robots.txt` disallow all, empty sitemap.
* JSON-LD from pure, unit-tested builders (`articleJsonLd`, `breadcrumbJsonLd`, `faqJsonLd`): `BlogPosting` (headline, description, datePublished, dateModified, author (verified name or the organisation), publisher+logo, mainEntityOfPage, image, articleSection, keywords, inLanguage), `BreadcrumbList`, `FAQPage` only for FAQ that is **visible** on the page. Never emit prices/ratings/reviews/hours you can't verify. Serialiser must escape `< > &` and U+2028/2029 (`<` …) — and test it.
* **Sitemap** lists only published posts; the index page only when ≥1 post exists. **RSS** only published. Empty journal ⇒ index page `noindex,follow` + friendly note. Pagination pages `noindex,follow` with **no** conflicting self-canonical.
* Unknown slug ⇒ real **404**; renamed slug ⇒ **308** to the new URL via the redirect table, handled at the top of the article page (`permanentRedirect`) — only while the target is public.
* Dates ISO; display dates formatted in `{{TIMEZONE}}` explicitly (never server-local).
* AEO: direct answers under descriptive headings, visible FAQ, internal links, accurate entity data in config (`areaServed`, address, `sameAs`) **only when verified**. `llms.txt` and AI-crawler policy are **optional business decisions** — document, don't force. Analytics/consent: don't add third-party tracking silently.

---

## 9. Publishing pipeline (static site + CMS)

Evaluate and document (pick the first that fits the host):

| Option | Notes |
|---|---|
| **A. Authenticated on-demand revalidation (default)** | Admin server actions call `revalidatePath` after any change to something public. No public endpoint, fixed path list + validated slugs |
| B. Redeploy via a deploy hook | Reliable, slower; the hook URL is a secret and abuse surface |
| C. Make routes dynamic | Simple, loses static performance |

Option A details — revalidate **exactly**: the article URL **and every old slug that redirects to it** (look up `redirectSourcesFor`; otherwise a stale cached 308 survives an unpublish), `/blog/[slug]` (page), `/blog/page/[n]` (page), `/blog`, `/` (latest stories), `/sitemap.xml`, `/blog/feed.xml`. Call it after publish / unpublish / delete / edit-of-live / slug change / send-back; **not** for saving a draft. Requirements: a runtime that keeps the cache (Vercel, or a single `next start` instance). Multi-instance/CDN-cached-HTML hosts must redeploy instead — say so in the docs. Prove it with the e2e test: publish → public page 200 with the new content and in sitemap/RSS/index **without a rebuild**; unpublish → 404 and gone from all.

---

## 10. Import, export and rollback

* `import` script: reads existing Markdown (gray-matter), validates (required fields, slug, dates, duplicate slugs, tags, canonical, cover), **dry-run by default**, `--apply` to write, `--overwrite` to refresh *content columns only*, `--dir` to restore from another folder. Idempotent by slug (`insert … on conflict do nothing`); `draft`, `review_status`, `published_at` are **insert-only** so re-running can never publish/unpublish/re-date. A post awaiting review imports as a draft. Never deletes the source files.
* `export` script: every post (drafts included) → `backups/<date>/<slug>.md` (+ `manifest.json`) in the **same frontmatter format**, so restore = import. Keep `/backups` git-ignored; remind that it contains drafts. Round-trip test: export → import ⇒ identical rows.
* Rollback to files: env switch (`BLOG_SOURCE=markdown`) + redeploy.

---

## 11. Testing (write them; run them; report honestly)

**Unit (vitest or equivalent; alias `server-only` to a stub):** publication rule; row parsing/validation; ordering/related/adjacent; Markdown render + sanitiser (script/iframe/img/handlers/`javascript:`/`data:`/own-bucket images); form validation (every field, ignores browser-sent publication flags); slug utils (incl. reserved words); workflow state machine & preconditions; SEO analyzer; rate limiter (injectable clock); open-redirect guard table; DB-error mapping & search-text cleaning; admin data layer against a **recording stub client** (forced draft on create, concurrency token, precondition filters, error surfacing, malformed id issues no query); image processing (formats incl. AVIF, resize, dedupe-by-hash, EXIF stripped, polyglot/SVG/GIF/php rejected, size & pixel limits); JSON-LD builders & serialiser; sitemap/robots/RSS filtering with and without a domain; import mapping & idempotency & round-trip.

**Live database tests (skipped without `DATABASE_URL`; each in a rolled-back transaction):** impersonate roles by `set local role` + `set_config('request.jwt.claims', …)` with real rows inserted into `auth.users`. Assert: RLS on; anon policy list = one SELECT; anon sees only published; **non-admin** sees only public and cannot write (UPDATE/DELETE affect 0 rows, INSERT 42501); **admin** sees drafts and can write; nobody can self-grant admin; `is_admin()` false when email unconfirmed; slug unique/format; invalid status/canonical/cover-dims rejected; CHECK "live ⇒ approved"; redirect trigger (rename, double rename ⇒ no chain, rename back ⇒ no loop, taking an old slug cancels the redirect, hidden target ⇒ redirect invisible to anon); storage bucket config & admin-only write.

**End-to-end browser test (Playwright + axe) against a production build** — creates throw-away Auth users (insert into `auth.users` + `auth.identities` using `extensions.crypt(pw, extensions.gen_salt('bf'))`), always cleans up in `finally`, uses a random `x-forwarded-for` per run (so the in-memory throttle from earlier runs doesn't interfere), never touches real content. Cover: anonymous redirects & headers & robots; generic login errors; non-admin refusal; throttle; HttpOnly cookies; dashboard counts equal DB; create (slug suggestion, validation, upload, tags dedupe); drafts invisible everywhere public; edit + concurrency conflict; preview (noindex, banner, not anonymous); workflow (no Publish before approval, confirmation required, reviewer recorded, approved ≠ public); publish → public page/JSON-LD/canonical/sitemap/RSS/index/cover image **without rebuild**; live edit; slug rename → 308 + sitemap + trigger row; unpublish → 404, old URL 404, gone from sitemap/RSS; upload validation (php-as-png, SVG, tiny, oversize, cross-origin 403, no session 401, duplicate = reused); delete; filters/search/empty state; axe (serious/critical = 0) on dashboard, editor, login; expired session mid-edit ⇒ login and nothing written; revoked admin ⇒ `/admin/forbidden`; logout.

**Regression:** existing lint, typecheck, build, launch-check, and the project's existing Playwright/axe scripts (note pre-existing failures separately; don't hide or "fix" unrelated ones silently).

---

## 12. Documentation deliverables (placeholders for secrets)

`docs/admin-cms.md` covering: 1 configure Auth · 2 provision first admin · 3 env vars · 4 migrations & bucket · 5 using the CMS (table of tasks + workflow diagram + slugs + images + SEO panel) · 6 how publishing reaches the public site (options table, what is revalidated, host requirements/limits) · 7 security model & honest limits · 8 troubleshooting table · 9 backup/restore · 10 rotating exposed credentials · 11 production deploy steps · 12 tests. Also update README, handover/architecture, launch checklist, `.env.example` (names + placeholders only), and an SEO/AEO decisions doc. Add npm scripts: `db:migrate`, `blog:import`, `blog:export`, `blog:status`, `admin:users`, `test`, `qa:admin`; extend `check:launch` to report Supabase config, public post count, pending reviews and admin count.

---

## 13. Final report (what the agent must output)

1. Findings from inspection. 2. Architecture & data model. 3. Files created/modified. 4. Migrations & RLS summary. 5. Env variable **names** only. 6. Tests **actually run** with results (and what could not run). 7. Failures/unresolved issues (including pre-existing ones). 8. External setup tasks needing the owner (Auth settings, first admin, domain, hosting env, credential rotation). 9. Exact deploy & rollback sequence. 10. Production-readiness checklist.

---

## 14. Adapting to another stack

| Concern | Keep (requirement) | Reference implementation | Alternatives |
|---|---|---|---|
| DB + RLS | Row-level rules in the DB, admin by row id, DB-enforced workflow invariant | Postgres RLS + `is_admin()` | Any DB with row policies; otherwise enforce in a single server-side data layer **and** DB constraints |
| Auth | Real auth provider, server-side session, HttpOnly cookies | Supabase Auth + `@supabase/ssr` | Auth.js, Clerk, Lucia, framework-native sessions |
| Authorization check | One `requireAdmin()` on every page/action/endpoint | server helper | middleware/guards/policies/decorators |
| Static publishing | Update public pages after publish without public webhooks | `revalidatePath` in server actions | ISR/on-demand ISR (Nuxt, SvelteKit adapters), Astro rebuild hook, WordPress/Laravel cache purge |
| Uploads | Decode bytes, re-encode, hash-name, admin-only, size caps | sharp → WebP → Supabase Storage | Pillow/ImageMagick/libvips; S3/R2/GCS with signed server-mediated writes |
| Markdown | Server-side render + allow-list sanitiser | marked + sanitize-html | markdown-it + DOMPurify(JSDOM), remark/rehype-sanitize, Python bleach/nh3 |
| Redirects | 308 from old slug, no chains/loops, only if target public | table + trigger + page fallback | framework redirect table, edge config |
| Tests | Unit + live-DB policy tests + browser e2e with cleanup | vitest + pg + Playwright | pytest/PHPUnit/Jest + any browser driver |

If the stack has **no database RLS**, replace §4.3–4.4 with: a server-side policy layer (the only code allowed to touch the table), `admin_users` checked there, plus DB constraints for the invariants — and say plainly in the docs that RLS is not the second layer.

---

## 15. Lessons learned (pitfalls — avoid these)

* **Direct DB hosts can be IPv6-only** (Supabase `db.<ref>.supabase.co`) and unreachable from many networks → use the **session pooler** connection string for CLI scripts; URL-encode special characters (`@` → `%40`) in the password.
* **Pasted credentials**: treat anything pasted in chat as exposed → recommend rotation; never store a JWT secret (it can mint a `service_role` token).
* **Proxy redirects break server actions/XHR** for expired sessions → only redirect GET/HEAD; let handlers answer others (see §6.1).
* **Cached redirects survive unpublish** unless the old slugs are revalidated too (§9).
* **Build-memoised content query must be build-phase only**, or revalidated pages serve stale data (§3.4).
* **`BETWEEN` on NULL passes a CHECK** — use `(a is null) = (b is null)`.
* **Postgres param type reuse** (`$1` as uuid *and* text) errors — cast separately or pass separate params.
* **libvips reports AVIF as `heif`/`av1`.**
* **Next.js route announcer is also `role="alert"`** — scope test locators (`form [role="alert"]`).
* **`datetime-local` + SSR** needs a mounted guard to avoid hydration mismatches; submit ISO UTC.
* **Lint rules in React 19** flag `setState` inside effects and ref access during render — derive state (key a confirmation to the workflow state) and drive toolbar actions through handlers.
* **Shell quoting on Windows/Git Bash**: heredocs with backslashes/regex get mangled — write scripts with the editor/Write tool instead of inline shell, and avoid `\\` in patch scripts.
* **In-memory rate limits are per process** — say so; rely on provider limits.
* **Don't `FORCE ROW LEVEL SECURITY`** if your migration/import role needs to write.
* **Keep a pure copy of the visibility rule** and test it against the SQL policy intent; divergence is the classic way drafts leak.
* **Legacy rows may violate a new CHECK** — repair data in the same migration before adding the constraint.
* Never delete the old content source until production is verified.

---

## Appendix A — Minimal file map (reference stack)

```
supabase/migrations/001_*.sql, 002_*.sql
scripts/ db-migrate · import-blog · export-blog · blog-status · admin-users · qa-admin · lib/{db,blog-import}
src/proxy.ts
src/lib/ blog · blog-core · blog-render · blog-source-{supabase,markdown} · covers · seo
src/lib/supabase/ server (public read client) · session (admin session client) · session-options
src/lib/admin/ auth · paths · rate-limit · slug · workflow · post-input · seo-check · posts · cover-image · revalidate · editor-props
src/app/layout.tsx (html/body only) · not-found.tsx · (site)/layout.tsx + public pages
src/app/admin/ layout · login · forbidden · actions.ts · api/covers/route.ts · (panel)/{layout,page,posts/new,posts/[id]/edit,posts/[id]/preview}
src/components/ layout/SiteChrome · blog/{ArticleView,CoverImage} · admin/{AdminShell,LoginForm,PostEditor,MarkdownEditor,CoverField,SeoPanel,TransitionPanel,DeleteDraft,StatusBadge,upload-client,styles}
tests/ (unit + live DB) · vitest.config
docs/ admin-cms.md · supabase-blog.md · seo-aeo.md
```

## Appendix B — One-line kickoff prompt

> Read `prompts/seo-cms.md` (a universal CMS template). Fill the project variables from this repository by inspecting it, ask me only about decisions that are genuinely mine, make a short plan, then implement §2 phases 1–10 in order, running and reporting every check you claim.
