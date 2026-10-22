/**
 * Source-agnostic blog model: types, validation, the "publicly visible" rule, reading time,
 * related/adjacent selection and date formatting. Pure functions only (no I/O), so it is shared
 * by the Markdown and Supabase sources and covered by unit tests.
 */

export type ReviewStatus = "needs-business-review" | "approved";

/** Metadata used across the UI (field names are stable; components depend on them). */
export interface PostFrontmatter {
  title: string;
  excerpt: string;
  cover: string; // legacy filename (lib/blog-covers.ts) or Storage object name ("" = default cover)
  coverWidth?: number; // set for uploaded (Storage) covers
  coverHeight?: number;
  coverAlt: string;
  author?: string;
  date: string; // ISO timestamp (published)
  updated?: string; // ISO timestamp (editorial last-modified)
  category: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonical?: string;
  draft?: boolean;
  /** Example content pending owner sign-off (flagged in the UI + launch check). */
  reviewStatus?: ReviewStatus;
}

/** A post as stored: metadata + slug + Markdown source. */
export interface StoredPost extends PostFrontmatter {
  slug: string;
  content: string;
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface PostSummary extends PostFrontmatter {
  slug: string;
  readingMinutes: number;
}

export interface Post extends PostSummary {
  html: string;
  headings: Heading[];
}

/** Raised for any blog data problem. Messages never include credentials. */
export class BlogDataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BlogDataError";
  }
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * THE publication rule. Must match the RLS policy in supabase/migrations/001_create_blog_posts.sql:
 *   draft = false AND review_status = 'approved' AND published_at <= now()
 */
export function isPubliclyVisible(
  row: { draft: boolean; review_status: string; published_at: string },
  now: Date = new Date(),
): boolean {
  return row.draft === false && row.review_status === "approved" && new Date(row.published_at).getTime() <= now.getTime();
}

export function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function toSummary(post: StoredPost): PostSummary {
  const { content, ...meta } = post;
  return { ...meta, readingMinutes: readingTime(content) };
}

/** Newest first; slug breaks ties so ordering is stable across builds. */
export function sortNewestFirst<T extends { date: string; slug: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
    return diff !== 0 ? diff : a.slug.localeCompare(b.slug);
  });
}

/** Related posts: same category first, then most recent, excluding the current slug. */
export function selectRelated<T extends { slug: string; category: string }>(all: T[], slug: string, limit = 2): T[] {
  const current = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  const sameCat = others.filter((p) => p.category === current?.category);
  const rest = others.filter((p) => p.category !== current?.category);
  return [...sameCat, ...rest].slice(0, limit);
}

/** Previous (older) and next (newer). `all` must be newest-first. */
export function selectAdjacent<T extends { slug: string }>(all: T[], slug: string): { prev: T | null; next: T | null } {
  const idx = all.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return { prev: all[idx + 1] ?? null, next: all[idx - 1] ?? null };
}

/** Deterministic across server timezones (the business operates in India). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

// ---------------------------------------------------------------------------
// Validation / mapping
// ---------------------------------------------------------------------------

/** Row shape of public.blog_posts (see the migration). */
export interface BlogRow {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover: string | null;
  cover_width: number | null;
  cover_height: number | null;
  cover_alt: string | null;
  author: string | null;
  category: string;
  tags: string[] | null;
  published_at: string;
  modified_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical: string | null;
  draft: boolean;
  review_status: string;
}

export const BLOG_COLUMNS =
  "slug,title,excerpt,content,cover,cover_width,cover_height,cover_alt,author,category,tags,published_at,modified_at,seo_title,seo_description,canonical,draft,review_status";

function str(v: unknown, field: string, slug: string, opts: { required: boolean }): string | undefined {
  if (v === null || v === undefined || v === "") {
    if (opts.required) throw new BlogDataError(`Blog post "${slug}": missing required field "${field}".`);
    return undefined;
  }
  if (typeof v !== "string") throw new BlogDataError(`Blog post "${slug}": field "${field}" must be text.`);
  return v;
}

export function toIso(value: unknown, field: string, slug: string): string {
  const d =
    value instanceof Date ? value : typeof value === "string" || typeof value === "number" ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) {
    throw new BlogDataError(`Blog post "${slug}": field "${field}" is not a valid date.`);
  }
  return d.toISOString();
}

/** Validates an untrusted database row and maps it to the app model. Throws BlogDataError. */
export function parseRow(input: unknown): StoredPost {
  if (typeof input !== "object" || input === null) throw new BlogDataError("Blog row is not an object.");
  const r = input as Record<string, unknown>;
  const slug = typeof r.slug === "string" ? r.slug : "";
  if (!SLUG_RE.test(slug)) throw new BlogDataError(`Blog row has an invalid slug: ${JSON.stringify(r.slug)}.`);

  const reviewStatus = r.review_status;
  if (reviewStatus !== "needs-business-review" && reviewStatus !== "approved") {
    throw new BlogDataError(`Blog post "${slug}": invalid review_status.`);
  }
  if (typeof r.draft !== "boolean") throw new BlogDataError(`Blog post "${slug}": draft must be true or false.`);
  if (r.tags !== null && r.tags !== undefined && !(Array.isArray(r.tags) && r.tags.every((t) => typeof t === "string"))) {
    throw new BlogDataError(`Blog post "${slug}": tags must be a list of text.`);
  }

  const title = str(r.title, "title", slug, { required: true })!;
  const canonical = str(r.canonical, "canonical", slug, { required: false });
  if (canonical && !/^https?:\/\/\S+$/.test(canonical)) {
    throw new BlogDataError(`Blog post "${slug}": canonical must be an http(s) URL.`);
  }

  return {
    slug,
    title,
    excerpt: str(r.excerpt, "excerpt", slug, { required: true })!,
    content: str(r.content, "content", slug, { required: true })!,
    cover: str(r.cover, "cover", slug, { required: false }) ?? "",
    coverWidth: typeof r.cover_width === "number" ? r.cover_width : undefined,
    coverHeight: typeof r.cover_height === "number" ? r.cover_height : undefined,
    coverAlt: str(r.cover_alt, "cover_alt", slug, { required: false }) ?? title,
    author: str(r.author, "author", slug, { required: false }),
    category: str(r.category, "category", slug, { required: true })!,
    tags: Array.isArray(r.tags) && r.tags.length > 0 ? (r.tags as string[]) : undefined,
    date: toIso(r.published_at, "published_at", slug),
    updated: r.modified_at ? toIso(r.modified_at, "modified_at", slug) : undefined,
    seoTitle: str(r.seo_title, "seo_title", slug, { required: false }),
    seoDescription: str(r.seo_description, "seo_description", slug, { required: false }),
    canonical,
    draft: r.draft,
    reviewStatus,
  };
}
