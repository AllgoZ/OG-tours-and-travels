# Supabase blog — setup, publishing and rollback

The blog reads published articles from a Supabase Postgres table (`blog_posts`) **at build time**.
The site stays statically prerendered. The Markdown files in `content/blog/` are kept as a backup and
rollback source — they are never deleted or modified by any script.

```
 you (admin)                    Supabase                         website build
 ───────────                    ────────                         ─────────────
 npm run db:migrate ──────────► table + RLS
 npm run blog:import ─────────► rows (draft / review state kept)
 npm run blog:status -- approve ► draft=false, approved ─────────► publishable key, SELECT
                                                                  only published rows (RLS)
                                                                  ─► prerendered pages, sitemap, RSS
```

## What is public

A post is public **only** when all three hold. The database enforces it with Row Level Security and
the app re-checks it (`isPubliclyVisible` in `src/lib/blog-core.ts`) — the two must stay in sync.

```
draft = false  AND  review_status = 'approved'  AND  published_at <= now()
```

* Drafts, posts awaiting business review and future-dated posts are invisible to the public key, so they
  cannot appear in HTML, JSON-LD, RSS or the sitemap, and their URLs return a real 404.
* There are **no** insert/update/delete policies and the `anon`/`authenticated` roles have only `SELECT`
  on the table. Public visitors cannot write or change publication state.
* New rows default to `draft = true` / `needs-business-review` (safe by default).
* Since migration `002` the database also enforces **live ⇒ approved** (`draft = false` requires `review_status = 'approved'`), so no tool can publish an unreviewed article.
* Day-to-day editing, review sign-off and publishing are done in the **admin CMS** — see [`admin-cms.md`](admin-cms.md). The CLI commands below remain for scripting and emergencies.

## Credentials — what goes where

| Variable | Where | Secret? | Used by |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + hosting | No | website build (read) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + hosting | No (RLS-limited by design) | website build (read) |
| `BLOG_SOURCE` | `.env.local` + hosting | No | `supabase` (default) or `markdown` |
| `DATABASE_URL` | **`.env.local` on your machine only** | **Yes** | `db:migrate`, `blog:import`, `blog:status`, `check:launch` |

* `DATABASE_URL` is an admin credential. Never prefix it with `NEXT_PUBLIC_`, never add it to Vercel/hosting
  env, never commit it. The website code does not read it.
* No `service_role` / secret API key is used anywhere. If you ever need one, keep it server-only and never in
  a `NEXT_PUBLIC_*` variable.
* `.env*` is git-ignored (only `.env.example`, placeholders, is tracked).
* Use the **Session pooler** connection string (Supabase Dashboard → *Connect*). The direct
  `db.<ref>.supabase.co` host is IPv6-only and fails on many networks. URL-encode special characters in the
  password (`@` → `%40`).

## First-time setup

1. **Create the project** at <https://supabase.com/dashboard> (done for this site).
2. **Collect values** — Dashboard → *Project Settings → API Keys*: project URL + **publishable** key.
   *Connect → Session pooler*: the connection string.
3. **Configure locally**: copy `.env.example` to `.env.local` and fill the four variables above.
4. **Apply the schema + RLS**:
   ```bash
   npm run db:migrate
   ```
   The SQL (`supabase/migrations/001_create_blog_posts.sql`) is idempotent, so re-running is safe. You can also
   paste it into the Dashboard SQL editor.
5. **Verify RLS is on** (Dashboard → *Authentication → Policies*, or SQL):
   ```sql
   select relrowsecurity from pg_class where oid = 'public.blog_posts'::regclass;   -- true
   select policyname, cmd, roles from pg_policies where tablename = 'blog_posts';   -- one SELECT policy
   ```
   `npm test` also runs database integration tests (when `DATABASE_URL` is set) that prove anon cannot write and
   cannot see drafts/unreviewed/future posts. They run inside a rolled-back transaction.
6. **Import the existing Markdown posts** (dry run first):
   ```bash
   npm run blog:import                    # DRY RUN — validates, compares, writes nothing
   npm run blog:import -- --apply         # inserts posts not yet in the database
   ```
   Read the dry-run list: each file is `would import`, `unchanged`, `SKIPPED` (differs from the database) or
   `FAILED` (with the reason). The import is idempotent and keyed by slug. It **never** overwrites an existing
   post unless you add `--overwrite`, and even then it only refreshes content columns — `draft`,
   `review_status` and `published_at` are insert-only.
7. **Verify counts and slugs**:
   ```bash
   npm run blog:status                    # lists every post and whether it is PUBLIC or hidden (and why)
   npm run check:launch                   # shows how many posts are publicly visible to the build
   ```
8. **Approve** the posts the owner has reviewed (see below), then build and deploy.

### Mapping from Markdown frontmatter

| Frontmatter | Column | Notes |
|---|---|---|
| filename | `slug` | must be lowercase letters, digits, hyphens |
| `title`, `excerpt`, `category` | same | required |
| body | `content` | verbatim Markdown |
| `cover`, `coverAlt` | `cover`, `cover_alt` | cover = filename registered in `src/lib/blog-covers.ts` |
| `author` | `author` | optional; falls back to `business.blog.defaultAuthor` |
| `date` / `updated` | `published_at` / `modified_at` | `modified_at` = editorial "last updated" (JSON-LD `dateModified`) |
| `tags` | `tags` | text[] |
| `seoTitle`, `seoDescription`, `canonical` | `seo_title`, `seo_description`, `canonical` | optional |
| `draft` (absent = false) | `draft` | |
| `reviewStatus` (absent = `approved`) | `review_status` | `needs-business-review` or `approved` |

`created_at` / `updated_at` are row bookkeeping (trigger-maintained) and are separate from the editorial dates.

## Review and publish a post

All five imported articles are `needs-business-review` drafts, so **none is public yet** — the journal shows a
"guides are on the way" note, `/blog` is `noindex`, and it is left out of the sitemap until one is published.

Preferred: open `/admin`, edit the article, record the owner's sign-off (**Mark as reviewed & approved**), then **Publish** —
the public pages refresh without a rebuild ([`admin-cms.md`](admin-cms.md) §6). CLI equivalent:

```bash
npm run blog:status -- approve plan-group-road-trip-tamil-nadu     # sign-off recorded; still a draft
npm run blog:status -- publish plan-group-road-trip-tamil-nadu     # live (needs approval first)
npm run blog:status -- hide    plan-group-road-trip-tamil-nadu     # take it back down
```

Only approve articles the owner has actually reviewed. The CLI does not refresh a running site's cache: **rebuild and redeploy** after using it (the CMS refreshes automatically).

## Add a new post

Either import it from Markdown (add `content/blog/<slug>.md`, `npm run blog:import -- --apply`) or insert a row in
the Supabase Dashboard (*Table Editor → blog_posts*). New rows are hidden until you approve them. Write the body in
Markdown with `##`/`###` headings (the page title is the H1; a stray `# ` is demoted to `##`). If the post uses a
new cover image, add it to `src/assets/images/` and register it in `src/lib/blog-covers.ts`; unknown names fall back
to the default cover.

Markdown is sanitised on the server (`src/lib/blog-render.ts`): raw HTML, scripts, iframes, images, event handlers and
`javascript:`/`data:` links are stripped, so database content is never trusted as HTML.

## When changes go live

Pages are generated **during `next build`**. Changes made **in the admin CMS** also refresh the affected public pages on demand
(authenticated server actions call `revalidatePath`; see [`admin-cms.md`](admin-cms.md) §6) — no rebuild. Changes made any other
way (CLI, Dashboard SQL, `blog:import`) do **not** update a running site: rebuild/redeploy (on Vercel: *Redeploy*, or push a commit).
Changing any `NEXT_PUBLIC_*` or `BLOG_SOURCE` value also needs a rebuild. There is deliberately no public webhook.

A failed Supabase read during a build **fails the build** with an actionable message (it is never turned into an empty
blog). An empty-but-successful result is a legitimate "no published posts yet".

## Deploy

1. Set in the hosting provider: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and optionally `BLOG_SOURCE`). **Not** `DATABASE_URL`.
2. Build command: `npm run check:launch -- --strict && npm run build`.
3. After deploy, check `/blog`, one article, `/sitemap.xml` and `/blog/feed.xml`.

## Roll back to the Markdown source

1. Set `BLOG_SOURCE=markdown` in the hosting provider (and `.env.local`).
2. Rebuild/redeploy. The site publishes `content/blog/*.md` exactly as before Supabase (drafts hidden in production;
   `needs-business-review` posts shown with the "example article" banner). No Supabase variables are needed in this mode.
3. Re-enable Supabase later by setting `BLOG_SOURCE=supabase` (or removing it).

Keep the Markdown files until production has been verified on Supabase.

## If a credential is exposed

* **Database password / `DATABASE_URL`**: Dashboard → *Project Settings → Database → Reset database password*, then
  update `.env.local`. 
* **JWT secret** (legacy "JWT Secret"): anyone holding it can mint valid API tokens, including `service_role`.
  Rotate it in *Project Settings → JWT Keys* (or move to the new asymmetric signing keys), then update any keys derived from it.
* **Publishable key**: not secret by design, but can be rotated in *API Keys* if abused; update env + rebuild.
* Never paste credentials into chats, issues or commits. If a secret was committed, rotate it first, then remove it from
  git history.

## Command reference

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Apply `supabase/migrations/*.sql` (idempotent) |
| `npm run blog:import [-- --apply [--overwrite]]` | Markdown → database (dry run by default) |
| `npm run blog:status [-- approve\|publish\|hide <slug>]` | List posts / record sign-off / go live / unpublish |
| `npm run blog:export [-- --dir <folder>]` | Back up all posts (incl. drafts) as Markdown |
| `npm run admin:users [-- grant\|revoke <email>]` | Manage who can use `/admin` |
| `npm run check:launch [-- --strict]` | Launch readiness incl. Supabase config + public post count |
| `npm test` | Unit + (with `DATABASE_URL`) database integration tests |
