import type { StoredPost } from "@/lib/blog-core";

export function post(overrides: Partial<StoredPost> = {}): StoredPost {
  return {
    slug: "sample-post",
    title: "Sample post",
    excerpt: "A short excerpt.",
    content: "## Heading\n\nBody text.",
    cover: "blog-group-road-trip.jpg",
    coverAlt: "Alt text",
    category: "Travel Planning",
    date: "2026-09-18T00:00:00.000Z",
    draft: false,
    reviewStatus: "approved",
    ...overrides,
  };
}

/** A database row as PostgREST would return it. */
export function row(overrides: Record<string, unknown> = {}) {
  return {
    slug: "sample-post",
    title: "Sample post",
    excerpt: "A short excerpt.",
    content: "## Heading\n\nBody text.",
    cover: "blog-group-road-trip.jpg",
    cover_alt: "Alt text",
    author: null,
    category: "Travel Planning",
    tags: ["a", "b"],
    published_at: "2026-09-18T00:00:00+00:00",
    modified_at: null,
    seo_title: null,
    seo_description: null,
    canonical: null,
    draft: false,
    review_status: "approved",
    ...overrides,
  };
}
