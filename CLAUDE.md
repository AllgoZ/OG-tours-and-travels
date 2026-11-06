> **Last updated: 2026-11-05 11:00 IST (UTC+05:30)**

@AGENTS.md

# CLAUDE.md — working rules for AI assistants on this repo

OG Tours and Travels: Next.js 16 marketing site (WhatsApp/phone enquiries) + Supabase-backed journal + private admin CMS at `/admin`.
Start with [`handover.md`](handover.md) (state + to-do), then [`ARCHITECTURE.md`](ARCHITECTURE.md) (design) and the topic docs in `docs/`.

## Standing rules

1. **Documentation stamp.** Whenever you edit `ARCHITECTURE.md`, `README.md`, `handover.md` or this file, update the first line
   `> **Last updated: YYYY-MM-DD HH:MM IST**` to the real current date/time (`date "+%Y-%m-%d %H:%M"` in IST, UTC+05:30). Keep the four files consistent with each other
   and with the code; also add a dated line to *Recent change history* in `handover.md`.
2. **Next.js 16 is not the Next.js you know** (see `AGENTS.md`). Read the relevant page in `node_modules/next/dist/docs/` before framework-level changes.
   Notable: Middleware is **Proxy** (`src/proxy.ts`); `preload` replaces `priority`; `images.qualities` is required; `params`/`searchParams` are Promises.
3. **Never write secrets** (passwords, `DATABASE_URL`, JWT secrets, service keys) into tracked files, docs, tests, logs or chat summaries. Real values live only in git-ignored `.env.local` and the hosting provider.
   Anything a user pastes into chat is exposed — recommend rotation. No `service_role` key is used in this app; don't introduce one.
4. **Nothing is invented.** Business facts come from `src/config/business.ts`; unknown ⇒ `null`/`[]` ⇒ not rendered. No fabricated reviews, prices, credentials, authors, addresses.
5. **Never claim success without running the check.** Report failures honestly (including pre-existing ones). Don't weaken `check:launch`, RLS, or tests to make something pass.
6. **Don't commit unless asked.** Commit messages end with the attribution line given by the harness.
7. Keep the public look, accessibility, WhatsApp/phone flows and the **noindex-until-domain** gate intact.
8. **Google Tag Manager** is the only third-party script: public pages only (via `SiteChrome`), never `/admin`; gated by `lib/gtm.ts`. Don't add other third-party scripts or paste GTM snippets elsewhere — add tags inside the GTM container.

## Commands

```bash
npm run dev | build | start | lint | typecheck
npm test                                   # Vitest; live-DB tests run only when DATABASE_URL is set (each in a rolled-back transaction)
npm run check:launch [-- --strict]
npm run images                             # regenerate src/assets/images from assets/originals
npm run db:migrate                         # apply supabase/migrations/*.sql (idempotent)
npm run blog:import [-- --apply [--overwrite] | --dir <folder>] | blog:export | blog:status [-- approve|publish|hide <slug>]
npm run admin:users [-- grant|revoke <email>]
bash scripts/serve-qa.sh && node scripts/qa.mjs http://localhost:3100 <dir> && node scripts/qa-interact.mjs http://localhost:3100
npm run qa:admin                           # e2e CMS test against the running :3100 server (needs DATABASE_URL)
```
`serve-qa.sh` kills every `node.exe` first. While no article is public in Supabase, `qa-interact`'s blog checks need `BLOG_SOURCE=markdown bash scripts/serve-qa.sh`.
After the last full run: lint/typecheck/build clean, 257 tests pass (2026-11-05), `qa:admin` 85/85 (2026-10-20), public QA passes except 9 pre-existing axe colour-contrast findings.

## Architecture in six lines

* Public pages live in `src/app/(site)/` (wrapped by `SiteChrome`); the CMS in `src/app/admin/` has its own layout. Root layout is only `<html>/<body>`.
* Blog reads go through `src/lib/blog.ts` (async; Supabase by default, `BLOG_SOURCE=markdown` rollback). Publication rule: `draft=false ∧ review_status='approved' ∧ published_at<=now()`
  — defined in the RLS policy **and** `isPubliclyVisible` (`blog-core.ts`); keep them identical. DB CHECK: live ⇒ approved.
* Every admin page, server action and route handler starts with `requireAdmin()` (or `getAdminOrNull()` for JSON endpoints). The Proxy is only a first layer. Admin data access uses the
  signed-in user's session + RLS — not a service key.
* Publication flags change **only** through the workflow transitions (`src/lib/admin/workflow.ts` → `applyTransition`); saving content never touches them; the browser never supplies them.
* After changing anything public, call `revalidatePublicBlog([...slugs])` (include old slugs that redirect to the post). Build-time memoisation in `blog.ts` is build-phase only.
* Markdown is always sanitised (`blog-render.ts`); JSON-LD goes through `serializeJsonLd`; uploads are decoded + re-encoded by `sharp` (`cover-image.ts`).

## Gotchas learned the hard way

* The direct Supabase DB host is **IPv6-only**; scripts use the **session pooler** `DATABASE_URL`. URL-encode `@` in passwords (`%40`).
* The Proxy must **not** redirect non-GET requests (server actions / uploads) — they authorise themselves; a 307 to the login HTML breaks them.
* In Playwright, Next's route announcer is also `role="alert"` — scope locators (`form [role="alert"]`). The in-memory login throttle is per process: the e2e script uses a random `x-forwarded-for`.
* Postgres: a CHECK with `BETWEEN` passes on NULL; reusing `$1` as two types errors; sharp reports AVIF as `heif`/`av1`.
* React 19 lint rules forbid `setState` in effects and ref access during render — derive state, drive toolbars through handlers.
* Windows/Git Bash: heredocs with backslashes/regexes get mangled — create scripts with the Write/Edit tools, and avoid `\\` inside inline patch scripts.
* Vercel warns on every `NEXT_PUBLIC_*` variable ("Keep this value private"): add them as type **Config**, never Secret. Publishable key is public by design; never put a service/secret key or `DATABASE_URL` in Vercel. Vercel needs Node 22.x/24.x (`check:launch` reads the TS config) and no `images` step.
* `next dev`/build regenerate `.next/types`; after moving route files run `rm -rf .next && npx next typegen` if `tsc` complains about stale validators.

## Where things are documented

| Need | Doc |
|---|---|
| Using / operating the CMS, Auth setup, first admin, troubleshooting, backup, rotation | `docs/admin-cms.md` |
| DB schema, RLS, import/export, rollback | `docs/supabase-blog.md` |
| SEO/AEO decisions and Search Console steps | `docs/seo-aeo.md` |
| Go-live items | `LAUNCH-CHECKLIST.md` |
| Reusable CMS blueprint for other projects | `prompts/universal-seo-cms-template.md` |
