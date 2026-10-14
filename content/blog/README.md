# Blog content

Articles are Markdown files in this folder. One file = one post; the filename (without `.md`)
is the URL slug: `content/blog/my-post.md` → `/blog/my-post`.

**No code changes are needed to add, edit or remove a post.** The listing, article page,
sitemap, RSS feed and related-article links all update automatically.

## Add a post

1. Copy an existing `.md` file and rename it to your slug (lowercase, hyphens).
2. Fill in the frontmatter (see below).
3. Write the body in Markdown. Use `##` and `###` headings — they build the in-article
   table of contents and get anchor links.
4. Pick a cover: either reuse one of the existing `blog-*.jpg` covers, or add a new image to
   `src/assets/images/` and register it in `src/lib/blog-covers.ts`.

## Frontmatter fields

```yaml
---
title: The visible article title (used for the H1)
excerpt: One or two sentences shown on cards and as the fallback meta description.
cover: blog-group-road-trip.jpg      # a key in src/lib/blog-covers.ts
coverAlt: Describe the image for screen readers and SEO.
author: OG Tours and Travels          # optional; defaults to the business name
date: 2026-09-18                       # ISO date published (controls ordering)
updated: 2026-10-01                    # optional; ISO date last modified
category: Travel Planning              # shown as the label; groups related posts
tags: [group travel, road trip]        # optional
seoTitle: Optional — overrides <title> (else uses title)
seoDescription: Optional — overrides meta description (else uses excerpt)
canonical: https://…                   # optional — only if the post is published elsewhere too
draft: true                            # optional — hidden in production, noindex in preview
reviewStatus: needs-business-review    # or: approved
---
```

## Review status

The five starter articles are marked `reviewStatus: needs-business-review`. While that is set:

- a small "Example article — pending business review" note shows on the article, and
- `npm run check:launch` lists them as unreviewed.

Once the owner has checked an article, change it to `reviewStatus: approved` and the note
disappears.

## Drafts

Set `draft: true` to keep a post out of production (it stays visible in `npm run dev` so you
can preview it). Draft posts are not listed, not in the sitemap, and are `noindex`.

## Internal links

Link between posts and to the home-page enquiry section to help readers and SEO, e.g.
`[family checklist](/blog/family-outstation-trip-checklist)` or `[enquire](/#enquire)`.
