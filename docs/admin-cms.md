# Admin CMS — `/admin`

A private editor for the travel journal, on the same Supabase project and the same `blog_posts` table the
public blog already uses. There is no second database or content pipeline. See
[`supabase-blog.md`](supabase-blog.md) for the table, the import and the Markdown rollback.

* **URL:** `https://<your-domain>/admin` (sign-in at `/admin/login`).
* **Who:** only users on the `admin_users` allow-list. Registering or editing your own profile never grants access.
* **No service key:** the CMS signs in with Supabase Auth and talks to the database **as the signed-in admin**
  (publishable key + that user's session). Postgres Row Level Security — not application code alone — decides what
  they may do.

## 1. Configure Supabase Auth (one time, in the Dashboard)

1. **Authentication → Sign In / Providers → Email**: keep *Email* enabled and *Confirm email* on.
2. Turn **off "Allow new users to sign up"**. Administrators are created by you; nobody should be able to register.
   (Even if left on, a new user is *not* an administrator — but there is no reason to allow it.)
3. **Password**: set a minimum length of 12+ and enable leaked-password protection if your plan offers it.
4. **Authentication → Rate Limits**: review the sign-in limits. This is the authoritative brute-force protection; the
   app adds a best-effort per-process throttle on top (see *Limits* below).
5. **Authentication → URL Configuration**: set *Site URL* to your production domain.
6. Optional hardening: MFA for the admin, and session time-boxing / inactivity timeout (plan-dependent).

## 2. Provision the first administrator

Admins are added by the person who holds the database credential (`DATABASE_URL`), so it cannot be done from the website.

1. Dashboard → **Authentication → Users → Add user → Create new user**: enter the email and a strong password and tick
   **Auto Confirm User**.
2. On your machine (with `DATABASE_URL` in `.env.local`):
   ```bash
   npm run admin:users -- grant owner@example.com
   npm run admin:users                      # list administrators
   npm run admin:users -- revoke owner@example.com
   ```
3. Browse to `/admin/login` and sign in. Revoking takes effect on the very next request.

`admin:users grant` refuses unknown or unconfirmed emails. Equivalent SQL (Dashboard → SQL editor):
`insert into public.admin_users (user_id, email) select id, email from auth.users where email = 'owner@example.com';`

## 3. Environment variables

No new variables. The CMS uses the ones the blog already needs:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + hosting | Public by design. Needed at build **and** at runtime (the admin runs server-side) |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` + hosting | Production domain |
| `DATABASE_URL` | `.env.local` on **your machine only** | Migrations, import/export, `admin:users`. Never in hosting env |

After changing a `NEXT_PUBLIC_*` value, rebuild.

## 4. Apply the migrations and Storage bucket

```bash
npm run db:migrate        # applies supabase/migrations/001 + 002 (idempotent)
```

`002_admin_cms.sql` creates the `admin_users` table and `is_admin()`, the admin policies on `blog_posts`, the
publish-requires-approval rule, cover-image columns, the slug-redirect table and trigger, and the **`blog-covers`**
Storage bucket (public read of files by URL, no listing for the public; admin-only upload/replace/delete; images only,
5 MB). Check in the Dashboard: *Storage → blog-covers* exists and is public; *Authentication → Policies* shows the
`blog_posts` and `storage.objects` policies. `npm test` also verifies these against the live database.

## 5. Using the CMS

| Task | How |
|---|---|
| Dashboard | `/admin`: real counts (total, published, scheduled, drafts, awaiting review), search by title/slug, filter by status/category, sort by updated or publication date, pagination |
| Create | **New post** → write → **Create draft**. New posts are always drafts awaiting review |
| Edit | Open a post; **Save changes**. Saving never changes publication status. A badge shows *Unsaved changes*; leaving asks for confirmation |
| Preview | *Write / Preview* tab (live, same sanitising pipeline as the site) or **Preview saved version** (the real article layout, admin-only, `noindex`, never cached) |
| Approve | Tick the confirmation that the business owner reviewed it, then **Mark as reviewed & approved**. Recorded with who and when. Still a draft |
| Publish | **Publish** (only offered after approval). Optionally tick *Use today as the publication date*. A future date schedules it |
| Unpublish | **Unpublish** (confirms). Removes it from the site, sitemap and RSS |
| Send back | **Send back for review** clears the sign-off and takes a live article offline |
| Delete | Drafts only: **Delete this draft…** → confirm. Unpublish first if it is live |

### Workflow rules (enforced on the server and by a database constraint)

```
 Draft · needs review ──approve──► Approved (draft) ──publish──► Published / Scheduled
          ▲                              │  ▲                          │
          └──────── send back for review─┴──┴────── unpublish ─────────┘
```

* A live post must be approved — the database rejects `draft = false` with `needs-business-review`. **Publish cannot bypass review.**
* Approval is an explicit, confirmed action by an administrator; it is never implied by saving or publishing.
* The browser never sends publication flags; they change only through these validated transitions, and each transition
  checks the current state inside the same `UPDATE` (no race).
* Two editors: a save fails with a clear message if the article changed since you opened it.

### Slugs and URLs

* The slug is suggested from the title until you edit it. Existing slugs are never changed unless you change them.
* Format is validated on the server and uniqueness by the database.
* **Changing a live slug** warns you, lists other articles that link to the old URL, and — via a database trigger — records
  a permanent **308 redirect** old → new. Chains and loops are prevented (renaming back removes the loop; a new post that takes an
  old slug cancels that redirect). The old URL stops redirecting if the article is unpublished, and never serves a duplicate page.

### Cover and body images

* **Upload** a JPEG, PNG, WebP or AVIF (≤ 4 MB, ≥ 600 px wide). The server decodes the bytes (the browser's file type is ignored),
  rejects SVG/GIF/animations/other files, strips metadata, converts to WebP (max 2000 px) and names it from a hash of its content,
  so the same image is never stored twice. Upload goes through `/admin/api/covers` with the admin's own session; Storage RLS is the final gate.
* Replacing a cover deletes the old file **only if no other article uses it**. Alt text is required before publishing a post with a cover.
* The **Image** toolbar button inserts a body image. Body images are accepted only from this site's `blog-covers` bucket; the sanitiser strips every other `<img>`.
* Bundled legacy covers (`src/lib/blog-covers.ts`) still work and appear in a drop-down.

### SEO and answer-readiness panel

SEO title / meta description (with lengths), canonical URL (validated), search-result and social previews, heading outline, and
warnings for: missing SEO title/description, duplicate slug, empty content, missing cover alt text, invalid canonical, very short/long
metadata, a `#` heading in the body, skipped heading levels, and no internal links. It is guidance, **not a score** — nothing here
promises rankings, citations or traffic. Metadata and JSON-LD on the public page are generated from the stored article.

## 6. How publishing reaches the public site

The public blog is statically generated. Options considered:

| Option | Verdict |
|---|---|
| Trigger a rebuild/redeploy on every change | Reliable but slow, and needs a deploy hook (a secret + abuse surface) |
| **Authenticated on-demand revalidation (chosen)** | Admin server actions call `revalidatePath` after changing anything that is or was public |
| Make blog routes fully dynamic | Works, but loses static performance and hits the database on every visit |

What happens when you publish, unpublish, delete or edit a live article (or change its slug):

1. The change is written to Supabase.
2. The server action (already authenticated as an admin) revalidates exactly: that article's URL (and any old slugs redirecting to it),
   all article pages, the paginated lists, `/blog`, `/` (latest stories), `/sitemap.xml` and `/blog/feed.xml`.
3. Each of those is regenerated **the next time it is requested** — usually within seconds. Slugs published after the last deploy are
   rendered on first request (`dynamicParams`). No rebuild is needed.

There is no public webhook or revalidation endpoint: the paths are fixed in code, the only input is a slug validated against the slug
format, and only a signed-in administrator can reach the code (verified by the end-to-end test).

Requirements and limits:

* Needs a Node runtime that keeps the cache: **Vercel** or **`next start` on a single instance**. On several instances behind a load balancer
  (each with its own cache) or a CDN that caches HTML, revalidation only updates the instance that handled the request — **redeploy** instead.
* Saving a *draft* never touches the public site. Editing a *live* article updates it on the next visit.
* A failed Supabase read at build time **fails the build** with a clear message; it is never turned into an empty blog.
* If anything looks stale, redeploy — a build always reads the current published set.

## 7. Security model

| Layer | What it does |
|---|---|
| Supabase Auth | Email + password sessions; no custom password code. Auth is server-side; no Supabase browser client exists |
| Cookies | Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, 7-day max age |
| Proxy (`src/proxy.ts`) | Refreshes the session and redirects anonymous **page** requests to the login page. First layer only |
| `requireAdmin()` | Called in **every** admin page, server action and route handler: validates the session with the Auth server (`getUser`) and `is_admin()` in the database. Anonymous → login; signed in but not admin → `/admin/forbidden` |
| Row Level Security | Admin policies use `is_admin()`; the public policy exposes only published rows. The database also enforces slug format/uniqueness, and "live ⇒ approved" |
| CSRF | Server Actions reject cross-origin calls (Next.js); the upload endpoint requires a same-origin `Origin`; cookies are `SameSite=Lax` |
| Login | Generic error (no account enumeration), constant delay on failure, plus a per-IP / per-email throttle |
| Responses | `/admin/*` is `no-store`, `noindex`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; `robots.txt` disallows it |
| Content | Markdown is rendered through an allow-list sanitiser; JSON-LD is escaped; uploads are decoded and re-encoded |

**Limits (be aware):** the in-app login throttle lives in process memory, so on serverless hosting each instance counts separately — it
slows guessing but is not a distributed guarantee. Supabase Auth's own rate limits and a strong, unique password are the real protection;
add MFA for extra safety. Uploads are capped at 4 MB to fit serverless request limits.

## 8. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `/admin/login?reason=config` | Supabase env vars missing in this environment |
| "Incorrect email or password" | Wrong credentials, or the user does not exist. Same message by design |
| "This account is not authorised…" / `/admin/forbidden` | User is not in `admin_users` (or their email is unconfirmed): `npm run admin:users -- grant <email>` |
| Redirected to login unexpectedly / "session has expired" | Session expired or cookies cleared; sign in again. A save attempted after expiry is not written and the unsaved text is lost, so copy long text out first and save often |
| "Too many sign-in attempts" | Throttle hit; wait ~15 minutes |
| "The database could not complete that request (42501)" | Not an admin, or migration `002` not applied: `npm run db:migrate` |
| "…changed somewhere else" | Another editor saved first; reload to see their version |
| Upload says "Storage rejected the upload" | `blog-covers` bucket missing or policies not applied (run migrations); or not an admin |
| Cover image broken on the public site | `NEXT_PUBLIC_SUPABASE_URL` was missing at build time (image host allow-list). Set it and rebuild |
| Published article not visible | Check its status badge (must be *Published*, not *Scheduled*), then the page's next visit; redeploy if you run several instances |
| Build fails with "Could not load blog posts from Supabase" | Wrong URL/key, migration not applied, or network. The message names the Supabase error code |

## 9. Back up and restore

* **Supabase backups:** the Dashboard → Database → Backups (plan-dependent) is the primary safety net.
* **Content export (any plan):**
  ```bash
  npm run blog:export                  # backups/blog-<date>/<slug>.md for EVERY post incl. drafts, plus manifest.json
  ```
  Same frontmatter the importer reads. The folder is git-ignored; keep copies somewhere private (drafts are inside).
* **Restore:**
  ```bash
  npm run blog:import -- --dir backups/blog-2026-10-20              # dry run
  npm run blog:import -- --dir backups/blog-2026-10-20 --apply      # re-create missing posts
  npm run blog:import -- --dir backups/blog-2026-10-20 --apply --overwrite   # also refresh content of existing ones
  ```
  Restoring never changes the `draft` / `review_status` / `published_at` of a post that already exists.
* **Images** live in the `blog-covers` bucket (content-addressed, kept by Supabase); download the bucket from the Dashboard if you want a copy.
* **Full rollback to files:** set `BLOG_SOURCE=markdown` and redeploy (see `supabase-blog.md`).

## 10. Rotate exposed credentials

* **An admin password:** Dashboard → Authentication → Users → reset password (or "send recovery"); consider *Sign out all sessions*.
* **Database password / `DATABASE_URL`:** Dashboard → Project Settings → Database → Reset database password; update `.env.local`.
* **JWT secret / signing keys:** Project Settings → JWT Keys; update any derived keys and redeploy.
* **An admin account that should lose access:** `npm run admin:users -- revoke <email>` (effective immediately), then delete or ban the Auth user.
* The publishable key is not secret, but can be rotated in *API Keys*; update env and rebuild.

## 11. Deploy the CMS to production

1. Run the migrations against the production project: `npm run db:migrate` (from your machine, with that project's `DATABASE_URL`).
2. Dashboard: configure Auth as in §1 (sign-ups off, password policy, rate limits, Site URL).
3. Hosting env: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production **and** Preview if you test there). **Not** `DATABASE_URL`.
4. Build command: `npm run check:launch -- --strict && npm run build`; deploy (Vercel or a Node host with HTTPS — `Secure` cookies need HTTPS).
5. Provision the first administrator (§2), sign in at `https://<domain>/admin`.
6. Smoke test: create a draft, approve, publish, open the public URL, check `/sitemap.xml`; unpublish; sign out.
7. Optional: run `npm run qa:admin` against a staging build (see below) before launch.

## 12. Tests

```bash
npm test                # unit tests + (with DATABASE_URL) live database tests: RLS as anon / non-admin / admin, triggers, storage policies
bash scripts/serve-qa.sh && npm run qa:admin    # end-to-end browser test of the CMS against a production build
```

`qa:admin` creates two throw-away Auth users and test articles, drives the real UI (login, throttle, create, validation, upload, workflow,
publish → public page, slug rename → 308, unpublish → 404, delete, expired session, revoked access, logout, accessibility), and removes
everything it created. It needs `DATABASE_URL`. It never touches the existing articles.
