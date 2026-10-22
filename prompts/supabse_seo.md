# Project: OG Tours and Travels — Supabase Blog CMS + Complete SEO and AEO Implementation

Act as a senior Next.js 16 engineer, Supabase/PostgreSQL architect, technical SEO specialist, and Answer Engine Optimization (AEO) consultant.

Inspect the existing repository, implement a secure Supabase-powered blog content system, and then implement and improve the website's SEO and AEO capabilities.

This is an existing production-oriented website. Do not rebuild it, replace its design, or introduce unnecessary architectural complexity.

**Execution order is mandatory:**

1. Inspect and understand the current architecture.
2. Design and implement Supabase integration for blog content.
3. Migrate the existing Markdown blog content safely.
4. Verify that the blog works with Supabase.
5. Implement and improve SEO and AEO using the new content source.
6. Run the existing quality checks and document the deployment process.

Do not stop after producing a plan. Work directly in the repository, implement the changes, and run the available tests.

---

# PART 1 — UNDERSTAND THE EXISTING PROJECT

Read these files before editing:

- `ARCHITECTURE.md`
- `AGENTS.md`
- `README.md`
- `handover.md`
- `LAUNCH-CHECKLIST.md`
- `package.json`
- `.env.example`

Inspect the relevant existing source files:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/blog/page/[n]/page.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/app/blog/feed.xml/route.ts`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/components/seo/StructuredData.tsx`
- `src/components/seo/JsonLd.tsx`
- `src/config/business.ts`
- `src/content/faq.ts`
- `src/lib/site.ts`
- `src/lib/blog.ts`
- `src/lib/blog-covers.ts`
- `content/blog/`
- `scripts/check-launch.mjs`
- Existing tests and QA scripts.

Read the applicable Next.js 16 documentation available in `node_modules/next/dist/docs/` before making framework-level changes.

## Existing architectural constraints

The current project uses:

- Next.js 16 App Router, React 19 and TypeScript.
- Static prerendering and server components by default.
- Markdown blog posts parsed with gray-matter and marked.
- `src/config/business.ts` as the single source of truth for business details.
- Existing metadata, canonical URL, Open Graph and Twitter metadata.
- Existing `TravelAgency` and `WebSite` JSON-LD.
- Existing `BlogPosting` and `BreadcrumbList` JSON-LD.
- Existing sitemap, robots and RSS generation.
- `NEXT_PUBLIC_SITE_URL` and other build-time environment configuration.
- A safety gate that prevents indexing when the production domain is missing.
- WhatsApp and phone calls as the main conversion channels.
- No current database, backend, API or CMS.
- Existing lint, typecheck, build, launch-check and Playwright/axe QA processes.

Preserve the existing business configuration, design system, accessibility, contact flows and launch safeguards.

# PART 2 — CONNECT SUPABASE SECURELY

Use the official Supabase JavaScript client and appropriate server-side integration for the installed Next.js version.

Inspect current official package documentation and choose compatible dependencies. Avoid unnecessary libraries.

## A. Environment variables

Add appropriate placeholders and documentation to `.env.example`.

Use environment variables such as:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

If the project or Supabase environment uses the legacy `anon` key instead, support the appropriate documented configuration without confusing it with privileged credentials.

Use a server-only environment variable for any elevated administrative operation if one is genuinely required.

**Security rules:**

- Never commit actual API keys, database passwords, access tokens or secrets.
- Never put a Supabase secret key or `service_role` key in a `NEXT_PUBLIC_*` variable.
- Never expose privileged credentials to browser bundles, client components, rendered HTML or public API responses.
- Do not request that secrets be written into source code.
- Do not print credentials in logs or include them in the final report.
- Keep server-only database operations in server-only modules.
- Use the least-privileged credential suitable for each operation.
- Prefer the publishable key for ordinary application access with properly configured Row Level Security.
- Do not disable Row Level Security to make the application work.

The user will configure the actual credentials securely in the local environment and hosting provider.

## B. Supabase architecture

Create a clean, maintainable integration layer.

Use server-side access for blog reading wherever appropriate.

The public website must only retrieve content that is published and eligible for public display.

Separate the responsibilities of:

- Public blog reads.
- Editorial or administrative writes.
- Content validation.
- Markdown or rich-text rendering.
- Metadata and structured-data generation.

Do not introduce authentication, an admin dashboard or a public editing interface unless specifically necessary and approved.

If future content editing requires an admin interface, design the data model to support it, but do not expose write operations publicly.

## C. Database schema

Create a version-controlled SQL migration, for example:

`supabase/migrations/001_create_blog_posts.sql`

Adapt the path if the repository already has a migration convention.

Create a `blog_posts` table suitable for this site's existing blog pipeline.

Include fields corresponding to the current Markdown frontmatter and existing features:

- `id`: UUID primary key.
- `slug`: unique, validated URL slug.
- `title`: required.
- `excerpt`: required or appropriately validated.
- `content`: Markdown source or another clearly documented canonical content format.
- `cover`: optional cover filename compatible with the existing image pipeline.
- `cover_alt`: optional descriptive alt text.
- `author`: optional, only when verified.
- `published_at`: publication timestamp.
- `updated_at`: optional modification timestamp.
- `category`: appropriate category field.
- `tags`: optional text array.
- `seo_title`: optional SEO title.
- `seo_description`: optional SEO description.
- `canonical`: optional canonical URL, subject to validation.
- `draft`: publication-state compatibility where appropriate.
- `review_status`: editorial review state.
- `created_at` and `updated_at`: timestamps.

Use sensible types, constraints, defaults and indexes.

Avoid storing duplicate values that can be derived safely unless there is a clear reason.

If you choose to use a `status` enum or text status instead of a `draft` boolean, document and consistently implement the migration mapping.

Make slug uniqueness enforceable at the database level.

Add indexes that support published-post queries, ordering, category filtering and slug lookups where useful.

## D. Row Level Security

Enable RLS on `blog_posts`.

Create narrowly scoped policies.

Requirements:

- Anonymous/public visitors can only read published posts.
- Drafts and posts awaiting business review must never be returned to the public.
- Anonymous visitors cannot insert, update or delete posts.
- Ordinary public clients cannot change publication status.
- Administrative writes must use a separately protected mechanism if introduced later.
- Do not use permissive policies such as unrestricted `USING (true)` for writes.
- Do not rely solely on frontend filters for security.

Ensure the actual SQL policies and the application's queries agree on the definition of a published post.

Do not invent authorizations or assume that a hidden UI is a security control.

## E. Database types and server-only data access

Add generated Supabase database types if the project workflow supports them, or define a precise, maintainable TypeScript schema matching the migration.

Create a dedicated server-only blog repository or data-access module.

It should provide equivalents of the existing functions:

- `getAllPosts()`
- `getAllSlugs()`
- `getPost(slug)`
- `getRelatedPosts(...)`
- `getAdjacentPosts(...)`

Adapt signatures as needed.

Preserve:

- Draft filtering.
- Stable ordering.
- Related-post behavior.
- Previous/next article navigation.
- Pagination.
- Reading-time calculations.
- Table of contents and heading generation.
- Existing article rendering and cover-image resolution.

Never import server-only Supabase code into a client component.

Validate returned data and handle database errors intentionally.

Do not silently turn a database failure into an empty blog and present the site as if it has no articles.

Provide clear development diagnostics without logging secrets.

# PART 3 — MIGRATE EXISTING MARKDOWN BLOG CONTENT

The current Markdown files under `content/blog/` are an existing content source and must not be discarded.

Inspect the actual frontmatter and existing parser behavior.

Implement a repeatable migration utility that:

1. Reads the existing Markdown posts.
2. Parses frontmatter using the current gray-matter dependency.
3. Converts each post to the database schema.
4. Preserves the Markdown body.
5. Preserves slugs, SEO titles, descriptions, dates, categories, tags, cover references, author data and review status.
6. Preserves draft and review restrictions.
7. Detects invalid fields and duplicate slugs.
8. Reports imported, skipped and failed records without revealing credentials.
9. Supports a safe dry-run mode.
10. Can be rerun without creating duplicate posts.

Use an idempotent upsert strategy keyed by the validated slug or another appropriate stable identifier.

Do not automatically overwrite an existing published database post with stale Markdown content without an explicit migration policy.

Document how to review the dry-run output and execute the import.

Prefer a small script using the existing project tooling and an appropriate secure server-side credential, or another documented import method that does not expose privileged credentials.

Never use a service-role key in a browser script or commit it to the repository.

Do not delete the Markdown files after migration.

Retain them as a backup or a documented rollback source until the Supabase content pipeline has been verified in production.

# PART 4 — CHOOSE AND IMPLEMENT THE RENDERING STRATEGY

The current site is statically prerendered.

Preserve that strategy for the first implementation unless inspection establishes a compelling reason to change it.

Use Supabase to fetch eligible published content during the build and prerender the blog routes.

Ensure that:

- `generateStaticParams()` uses published slugs.
- Blog pages and pagination use the Supabase-backed repository.
- `generateMetadata()` uses the correct article data.
- The sitemap includes the published database-backed posts.
- RSS contains published posts only.
- Drafts and unreviewed content never leak through HTML, JSON-LD, RSS or sitemap.
- Existing real 404 behavior for unknown slugs is preserved.
- Related articles and adjacent-post links continue to work.
- Database queries are efficient and do not unnecessarily refetch the same post multiple times.
- A failed required database read during a production build causes a clear, actionable failure rather than generating misleading empty output.

Document the trade-off: new posts will require a rebuild/redeployment unless a revalidation or dynamic-rendering strategy is separately implemented.

Do not claim that changes in Supabase instantly update statically generated pages.

If Next.js 16 supports an appropriate cache/revalidation mechanism for the current deployment architecture, you may propose it as a later enhancement, but do not implement a webhook or dynamic publishing system without documenting and testing its security and operational implications.

## Migration rollout and rollback

Plan for a safe transition:

1. Create and review the database migration.
2. Configure environment variables.
3. Apply the schema and RLS policies.
4. Run the content migration in dry-run mode.
5. Import and verify the existing posts.
6. Switch the application to the Supabase repository.
7. Run tests and compare generated pages, metadata, sitemap and RSS.
8. Keep a documented rollback path to the existing Markdown source until production is verified.

Do not delete the existing blog pipeline prematurely.

# PART 5 — COMPLETE SEO IMPLEMENTATION

Audit the existing SEO implementation before making changes.

## Metadata

Validate and improve:

- Unique page titles and descriptions.
- Canonical URLs.
- Open Graph metadata.
- Twitter/X card metadata.
- Correct metadata for blog articles and pagination.
- Valid social-sharing images.
- Indexability and production-domain safeguards.
- Missing or duplicate metadata.
- Absolute production URLs.

Use Next.js 16 conventions and the existing metadata template.

## Sitemap and robots

Review `src/app/sitemap.ts` and `src/app/robots.ts`.

Ensure:

- Only eligible public URLs are listed.
- Sitemap entries reflect actual published Supabase posts.
- Drafts and unreviewed posts are excluded.
- Canonical URLs and hostnames are consistent.
- Missing domain configuration preserves the existing noindex safety gate.
- Staging environments cannot accidentally become indexable.
- Public content is not accidentally blocked.
- Robots restrictions are not confused with noindex directives.

Preserve static generation and existing launch checks.

## Structured data

Audit and improve:

- `TravelAgency`.
- `WebSite`.
- `BlogPosting`.
- `BreadcrumbList`.

Generate article schema from actual published database records.

Use verified data only.

Evaluate additional types such as `TouristTrip` only if genuine package or itinerary pages exist and the schema accurately describes their visible content.

Do not fabricate prices, ratings, reviews, availability, addresses or destinations.

Prevent duplicate JSON-LD and protect the JSON-LD serializer against unsafe script-terminating content.

Ensure schema fields match the rendered page.

## Internal linking and page quality

Review:

- Heading hierarchy.
- One clear H1 per relevant page.
- Descriptive internal links.
- Related-article links.
- Blog pagination.
- Breadcrumbs.
- Image alt text.
- Crawlable navigation.
- Duplicate and thin content.
- Valid 404 responses.
- Image loading and layout stability.

Preserve the existing visual design and accessibility.

# PART 6 — ANSWER ENGINE OPTIMIZATION

Improve the site's readiness for AI-powered answer experiences without claiming guaranteed rankings or citations.

Focus on:

- Clear descriptions of the business and actual services.
- Accurate destination information.
- Direct answers to genuine travel questions.
- Helpful FAQs.
- Useful itineraries and practical travel guidance when supported by verified facts.
- Descriptive headings.
- Strong internal linking.
- Authoritative sources for factual and time-sensitive claims.
- Accurate author and editorial review information.
- Consistency between page content, metadata and structured data.
- Crawlable server-rendered content.

Review the current FAQ source and blog content before proposing new content.

Do not invent business credentials, policies, customer counts, reviews or travel facts.

Keep the Markdown content format as the canonical article format unless there is a strong technical reason to change it.

If the content is stored in Supabase, ensure the Markdown rendering pipeline continues to sanitize or safely handle content according to the trust model. Never execute arbitrary database content as trusted HTML without an explicit sanitization strategy.

Evaluate `llms.txt` as an optional experiment, not a required SEO deliverable or guaranteed ranking factor.

Review AI crawler accessibility and distinguish search indexing bots from model-training crawlers. Do not make blanket crawler-policy changes without an explicit business decision.

# PART 7 — ANALYTICS AND CONVERSIONS

The current website has no documented analytics integration.

Do not silently introduce third-party tracking.

Evaluate an optional GA4 integration with configurable environment variables and appropriate consent handling.

Where implemented, measure meaningful actions such as:

- WhatsApp CTA clicks.
- Phone CTA clicks.
- Enquiry-form interactions.
- Redirects to WhatsApp.

Do not claim that a WhatsApp message was sent or a booking completed when the application only redirects the visitor to WhatsApp.

Document Google Search Console setup, sitemap submission, domain verification, GA4 configuration and any required external account permissions.

Do not claim to have connected external accounts unless the connection was actually completed.

# PART 8 — TESTING AND QUALITY GATES

Inspect `package.json` before running commands.

Run the relevant available checks, including:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run check:launch`
- Existing Playwright and accessibility QA scripts.

Add tests for:

- Published-post filtering.
- Draft and review-status exclusion.
- Slug uniqueness.
- Supabase query errors.
- Content migration idempotency.
- Markdown frontmatter preservation.
- Metadata generation.
- Canonical URL generation.
- Sitemap and RSS exclusion of unpublished posts.
- Robots behavior with and without the production domain.
- JSON-LD consistency.
- Unknown-slug 404 behavior.
- No regression in navigation, WhatsApp links, phone links or enquiry forms.

Do not weaken existing launch gates or suppress real failures.

If Supabase credentials are not configured in the environment, implement the code and SQL migration, test everything possible locally, and clearly identify which integration tests require credentials.

Never invent test results.

# PART 9 — ENVIRONMENT AND DEPLOYMENT DOCUMENTATION

Update `.env.example` with placeholders only.

Document:

- How to create the Supabase project.
- Which project URL and publishable key are required.
- How to configure environment variables locally and in hosting.
- How to apply the SQL migration.
- How to enable and verify RLS.
- How to run the dry-run migration and import content.
- How to verify imported post counts and slugs.
- How to build and deploy the website.
- How to add a new post.
- How changes are published and when a rebuild is required.
- How to roll back to the Markdown content source.
- How to rotate credentials if accidentally exposed.

Do not place actual secrets in documentation.

Keep local secrets in an ignored `.env.local` file and production secrets in the hosting provider's environment configuration.

If an environment variable changes build-time output, document that a new build is required.

# PART 10 — FINAL REPORT

After implementing the changes, provide:

1. Initial SEO/AEO audit findings.
2. Supabase architecture and data model.
3. Files created or modified.
4. Database migration and RLS policy summary.
5. Content migration instructions and results.
6. SEO/AEO improvements implemented.
7. Test commands actually run and their results.
8. Any failures or unresolved issues.
9. Required environment variables, using names only.
10. External setup steps requiring client access.
11. The exact deployment and rollback sequence.
12. A final production-readiness checklist.

## Non-negotiable requirements

- Inspect before editing.
- Implement, do not merely suggest.
- Do not invent business data.
- Do not expose secrets.
- Never expose service-role credentials to the browser.
- Enforce public content access with RLS.
- Preserve the current production-domain noindex safeguard.
- Preserve the existing design, accessibility and contact conversion flow.
- Preserve existing Markdown content until migration is verified.
- Keep server-only code out of client bundles.
- Use current Next.js 16 conventions.
- Do not claim success without running the relevant checks.
- Do not make external service connections you cannot actually perform.
- Do not overengineer the project.

Start by inspecting the repository and identifying the safest implementation sequence. Then carry out the work in stages and verify each stage before proceeding.