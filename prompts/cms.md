# Task: Build a Secure Admin CMS for OG Tours and Travels

Act as a senior Next.js 16 App Router engineer, Supabase architect, security engineer, and CMS product designer.

Build a complete, production-ready blog CMS for the existing OG Tours and Travels website.

The admin panel must be available at:

`https://yourdomain.com/admin`

The admin panel must connect to the existing Supabase project and existing blog content system. Do not create a second database, a separate blog table, or an unrelated content pipeline.

The existing public website must continue to work correctly.

## 1. Inspect the Existing Project First

Before changing code, inspect:

- `ARCHITECTURE.md`
- `AGENTS.md`
- `README.md`
- `handover.md`
- `LAUNCH-CHECKLIST.md`
- `package.json`
- `.env.example`
- `src/app/layout.tsx`
- `src/app/blog/page.tsx`
- `src/app/blog/page/[n]/page.tsx`
- `src/app/blog/[slug]/page.tsx`
- `src/app/blog/feed.xml/route.ts`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- `src/lib/blog.ts`
- `src/config/business.ts`
- Existing Supabase client, database types, SQL migrations and data-access modules.
- Existing Supabase `blog_posts` schema and RLS policies.
- Existing Markdown migration scripts and blog cover image pipeline.

The existing application uses Next.js 16 App Router, React 19, TypeScript, static generation, server components, a Supabase-backed blog system, and WhatsApp/phone conversion flows.

Adapt paths to the actual repository. Verify what has already been implemented rather than assuming the prior changes are complete.

Do not rebuild the public website or undo the SEO/AEO implementation.

## 2. Admin Panel Requirements

Create a protected admin area with routes appropriate to the existing application structure.

Suggested routes:

- `/admin` — dashboard and blog post list.
- `/admin/login` — authentication page.
- `/admin/posts/new` — create a post.
- `/admin/posts/[id]/edit` — edit a post.
- `/admin/posts/[id]/preview` — authenticated preview, if useful and securely implemented.

You may adjust this structure if the existing repository has a better convention.

The `/admin` route must never expose editorial content or management controls to unauthenticated visitors.

If a visitor is not authenticated, redirect them to `/admin/login`.

After login, redirect them to the admin dashboard.

Implement a clear logout action and handle expired sessions safely.

## 3. Authentication and Authorization

Use Supabase Auth for admin authentication.

Do not create a custom password authentication system.

Requirements:

- Use an appropriate supported Supabase authentication method, such as email/password, with secure session handling.
- Prefer a server-side session integration compatible with the installed Next.js 16 version and current Supabase guidance.
- Keep privileged database operations server-side.
- Protect every admin page, server action, route handler and mutation independently.
- Do not rely only on hiding admin links or redirecting in the UI.
- Validate the authenticated user and their admin authorization on every protected server operation.
- Ensure that ordinary authenticated users cannot manage blog content unless explicitly authorized as administrators.
- Do not expose privileged credentials, session tokens or sensitive environment variables in client bundles.
- Never store passwords or session tokens in localStorage as a substitute for a secure session implementation.
- Use secure, HttpOnly cookies where appropriate to the chosen supported session architecture.
- Handle CSRF and cross-origin concerns appropriately for state-changing operations.
- Apply rate limiting or another proportionate abuse-prevention measure to login attempts where supported by the deployment architecture.
- Avoid leaking whether arbitrary email addresses have registered.

### Administrator authorization

Inspect the existing Supabase Auth configuration and database schema.

Implement an explicit administrator authorization mechanism that cannot be self-assigned by a public user.

Prefer a database-backed allowlist or another server-verifiable role mechanism that fits the existing project.

If you create an `admin_users` table:

- Enable RLS.
- Prevent public users from inserting or modifying their own admin privileges.
- Restrict access to administrative records.
- Ensure the application checks authorization on the server.
- Provide a documented, secure initial-admin provisioning process.

Do not allow a user to become an administrator merely by registering or modifying client-side metadata.

Do not hardcode administrator passwords or commit real credentials.

If the initial administrator's email address is unknown, implement the secure provisioning mechanism and document the exact steps needed to authorize the first admin.

## 4. Dashboard UI

Create a professional, responsive administration interface consistent with the OG Tours and Travels brand.

The admin interface should be visually separate from the public marketing layout where appropriate. Do not let the public header, floating WhatsApp bar or marketing animations interfere with admin forms.

Dashboard features:

- Total posts.
- Published posts.
- Draft posts.
- Posts awaiting review.
- Recent posts.
- Create new post action.
- Search posts by title or slug.
- Filter by publication status and category.
- Sort by most recently updated or published.
- Pagination if the number of posts requires it.
- Edit, preview and appropriate delete/unpublish actions.

Use accurate counts from Supabase. If data cannot be loaded, show a useful error rather than fabricated statistics.

Add loading, empty, validation, success and failure states.

Ensure accessibility, keyboard navigation, visible focus states, responsive behavior and understandable error messages.

## 5. Blog Editor

Build a functional blog editing interface, not merely a database form.

Support these fields, mapped to the existing database schema:

- Title.
- Slug.
- Excerpt.
- Main article content.
- Cover image.
- Cover image alt text.
- Author.
- Category.
- Tags.
- SEO title.
- SEO description.
- Canonical URL, if applicable.
- Publication state.
- Editorial review status.
- Publication date.
- Modification date where appropriate.

Inspect the actual `blog_posts` table and use its real column names. Do not create conflicting duplicate fields.

### Content editor

Provide a practical writing experience with:

- A Markdown editor or a suitable rich-text editor that stores Markdown.
- A readable editing area.
- A preview of headings, paragraphs, lists, links, quotes, images and other supported Markdown features.
- A preview of the article as it will appear on the public site.
- Character counts or guidance for SEO title and description.
- A clear indication of unsaved changes.
- Validation before saving.
- Confirmation before discarding unsaved changes.

Preserve the existing Markdown content pipeline if it is still used by the public blog.

Do not save HTML into a Markdown field unless the existing schema and rendering pipeline explicitly support that format.

If introducing an editor library, verify compatibility with Next.js 16 and React 19, and avoid unnecessary dependencies.

## 6. Slugs and URLs

Automatically generate a suggested slug from the title.

Allow an authorized editor to modify the slug before publishing.

Validate slugs on the server and enforce database-level uniqueness.

When editing an existing post, preserve its current slug unless the editor explicitly changes it.

If a published post's slug changes:

- Warn the editor that the public URL will change.
- Implement an appropriate redirect from the old slug to the new slug, or provide a safe, explicit alternative.
- Prevent broken internal links and avoid redirect loops.
- Preserve canonical URL correctness.
- Ensure the old URL no longer serves duplicate article content.

Do not silently change published URLs.

## 7. Cover Image Uploads

Use Supabase Storage for blog cover images unless the existing repository already has an established equivalent.

Inspect the current `src/lib/blog-covers.ts` and image pipeline before choosing an integration.

The existing blog may map cover filenames to statically imported images. If so, do not assume that an arbitrary uploaded Storage URL can be passed into that pipeline.

Design the upload and rendering path so it works correctly with the current public blog.

Prefer a dedicated bucket such as `blog-covers` with appropriate file access policies.

Requirements:

- Allow common web image formats such as JPEG, PNG, WebP and AVIF where supported.
- Enforce reasonable file size and image dimension limits.
- Validate file types on the server; do not trust the browser's MIME type alone.
- Use unique storage object names.
- Avoid exposing credentials in upload code.
- Restrict uploads and deletions to authorized administrators.
- Use safe filenames and prevent path traversal.
- Provide upload progress or a clear uploading state.
- Show an image preview.
- Allow replacing an image.
- Prevent deleting an image that is still used by a published post unless the replacement is safely handled.
- Preserve descriptive alt text.
- Use stable public URLs or another correctly configured delivery method.
- Ensure Next.js image configuration supports the chosen image URL host where necessary.
- Avoid uploading duplicate images unnecessarily.

Use Supabase Storage RLS policies or an equivalent secure server-mediated upload design.

Never use a service-role key in a client component.

Document the bucket creation and access policies if these are not already managed by migrations.

## 8. Draft, Review and Publish Workflow

Support at least these states:

- Draft.
- Published.
- Needs business review, if supported by the existing schema.

The public website must only show posts that meet the established publication and editorial review requirements.

The editor must be able to:

- Save a draft.
- Continue editing a draft.
- Preview a draft securely.
- Publish a post.
- Edit a published post.
- Unpublish a post.
- Delete a draft with confirmation.

Publishing must not automatically bypass a required business review.

Define the transition rules explicitly.

For example, if a post requires business review, the UI must not silently mark it reviewed simply because the user clicked Publish.

Implement state transitions in validated server-side operations.

Ensure public queries, metadata, JSON-LD, RSS and sitemap generation follow the same publication rules.

## 9. Supabase Database Operations

Reuse the existing Supabase integration and database types.

Do not create a second `blog_posts` table.

Inspect existing RLS policies and migrations before making changes.

Requirements:

- Public visitors can read only eligible published posts.
- Unauthenticated visitors cannot create, edit or delete posts.
- Only authorized administrators can perform editorial mutations.
- Admin authorization must be checked server-side.
- Public content queries must never return draft content.
- Validate all form inputs server-side.
- Handle database errors explicitly.
- Use transactions or appropriate atomic operations where multiple changes must remain consistent.
- Avoid trusting IDs, publication states, authors or role information supplied by the browser.
- Use optimistic UI only when failures can be handled safely.
- Keep database migrations version-controlled.

If the existing RLS policies are insufficient, write a new migration that safely updates them without unnecessarily removing unrelated policies.

Do not disable RLS.

## 10. SEO and AEO Fields in the CMS

Integrate SEO and AEO into the writing workflow.

The editor should include:

- SEO title.
- Meta description.
- Slug editor.
- Canonical URL field with validation.
- Cover image and alt text.
- Search snippet preview.
- Open Graph/social preview where practical.
- Article excerpt.
- Heading structure preview or basic content guidance.
- Internal linking guidance.
- Optional focus keyword field only if there is a clear use for it.
- Publication and update dates.
- Author and review information when verified.

Provide actionable guidance rather than a misleading SEO score.

Warn about:

- Missing SEO title or description.
- Duplicate slugs.
- Empty article content.
- Missing cover image alt text.
- Invalid canonical URLs.
- Unusually short or excessively long metadata.
- Missing H1 or illogical heading structure where detectable.
- Missing internal links where appropriate.

Do not promise that keyword density, word count, structured data or a particular score will improve rankings.

Generate metadata and JSON-LD from the actual stored content, not from unrelated hardcoded values.

## 11. Secure Preview

Allow authorized editors to preview unpublished content without exposing drafts publicly.

Requirements:

- Authenticate preview requests.
- Authorize the current user as an administrator.
- Validate the requested post ID or slug.
- Do not leak drafts through public endpoints, sitemap, RSS, metadata or public APIs.
- Use appropriate noindex behavior for previews.
- Do not place private content in publicly cacheable responses.
- Do not rely on a secret URL token alone as authorization.

Reuse the existing article rendering styles where possible.

## 12. Publishing and Next.js Static Generation

The existing public blog uses static generation.

Inspect how the current Supabase integration fetches posts and generates static routes.

Choose and implement a publishing workflow that fits the deployment architecture.

At minimum:

- Saving a draft must not publish it publicly.
- Publishing must update the content state in Supabase.
- The editor must clearly explain when the public site will reflect the change.
- The public sitemap and RSS must include only eligible published posts.
- The public article must use correct metadata and JSON-LD.
- New published slugs must be included in the public site generation strategy.
- Unpublishing or deleting a post must not leave the post publicly discoverable indefinitely.

### Deployment strategy

Prefer a secure, supported publishing mechanism that works with the current hosting provider.

Evaluate the trade-offs between:

1. Triggering a controlled redeployment after publishing.
2. Implementing authenticated on-demand revalidation with secure cache invalidation.
3. Changing selected blog routes to dynamic rendering if the existing hosting architecture supports it.

Do not add a public, unauthenticated deployment webhook.

If implementing a revalidation endpoint:

- Require strong server-side authorization.
- Validate the requested slug.
- Limit which paths can be revalidated.
- Use a secret that remains server-only.
- Rate-limit or otherwise protect the endpoint.
- Verify that revalidation actually refreshes article pages, sitemap and RSS as applicable.
- Prevent an untrusted user from triggering arbitrary paths or excessive deployments.
- Document deployment-provider requirements.

If the current static generation architecture cannot safely support instant publication, implement a reliable documented rebuild/redeployment workflow rather than pretending changes are immediately visible.

## 13. Public Website Preservation

Do not break:

- `/`
- `/blog`
- `/blog/page/[n]`
- `/blog/[slug]`
- `/blog/feed.xml`
- `/robots.txt`
- `/sitemap.xml`
- Existing canonical URLs.
- Existing structured data.
- Existing Markdown content and migrated records.
- Existing blog covers.
- WhatsApp and phone contact buttons.
- Existing accessibility and performance optimizations.
- The production-domain noindex safety gate.

Preserve the existing visual identity and responsive behavior of the marketing website.

Keep server-only modules out of client bundles.

## 14. Testing

Inspect `package.json` and the actual test infrastructure.

Run the relevant available checks:

- Lint.
- Typecheck.
- Production build.
- Launch checks.
- Existing Playwright and accessibility tests.

Add tests for:

- Unauthenticated access to `/admin`.
- Unauthorized access by non-admin authenticated users.
- Valid administrator access.
- Logout and expired sessions.
- Draft creation and editing.
- Publishing and unpublishing.
- Slug uniqueness and slug changes.
- Invalid form input.
- Cover upload authorization and validation.
- Public draft isolation.
- Supabase failures.
- Secure preview.
- Metadata and structured-data correctness.
- Sitemap and RSS publication filtering.
- Public blog regression tests.

Do not claim tests passed unless they were actually executed.

If credentials or a Supabase environment are unavailable, implement what can be verified locally and clearly identify which integration tests remain outstanding.

## 15. Documentation and Final Deliverables

Update the relevant documentation with:

1. How to configure Supabase Auth.
2. How to provision the first administrator securely.
3. How to configure environment variables.
4. How to create or configure the Storage bucket.
5. How to apply database and RLS migrations.
6. How to access `/admin`.
7. How to create, edit, preview, publish, unpublish and delete posts.
8. How publishing reaches the public website.
9. How to troubleshoot authentication and database errors.
10. How to back up and restore blog content.
11. How to rotate exposed credentials.
12. How to deploy the CMS to production.

Use placeholders for secrets. Never include real credentials in documentation.

## Final execution instructions

Start by inspecting the actual repository and Supabase schema.

Implement the admin CMS directly in the codebase.

Do not stop at a plan or a mockup.

Build a functional, secure, maintainable CMS that works with the existing public blog and database.

Prioritize security, correctness, usability, accessibility and preservation of the existing production architecture.

At the end, provide a concise implementation report with changed files, database migrations, required environment variables, tests actually run, outstanding external setup tasks and the exact steps needed to deploy the CMS.