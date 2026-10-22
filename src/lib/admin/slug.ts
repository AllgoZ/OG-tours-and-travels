import { SLUG_RE } from "../blog-core";

/** Slugs that would collide with real routes under /blog. */
export const RESERVED_SLUGS = ["page", "feed", "new", "admin"] as const;

const MAX_SLUG = 80;

/** Suggested URL slug from a title: ASCII, lowercase, hyphen-separated, trimmed at a word boundary. */
export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= MAX_SLUG) return base;
  const cut = base.slice(0, MAX_SLUG);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > 20 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, "");
}

/** Returns an error message, or null when the slug is acceptable. */
export function validateSlug(slug: string): string | null {
  if (!slug) return "Enter a URL slug.";
  if (slug.length > 120) return "The slug must be 120 characters or fewer.";
  if (!SLUG_RE.test(slug)) return "Use lowercase letters, numbers and single hyphens only (for example: group-trip-checklist).";
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return `"${slug}" is reserved. Choose a different slug.`;
  return null;
}
