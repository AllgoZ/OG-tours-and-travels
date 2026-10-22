import { validateSlug } from "./slug";

/**
 * Server-side validation of the editor form. Everything the browser sends is untrusted: this is the
 * only place form values become database values. Publication flags (draft / review_status) are
 * deliberately NOT part of the input — they change only through workflow transitions.
 */
export interface PostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string | null;
  cover: string | null;
  cover_width: number | null;
  cover_height: number | null;
  cover_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  canonical: string | null;
  published_at: string; // ISO
  modified_at: string | null; // ISO
}

export type FieldErrors = Partial<Record<keyof PostInput | "form", string>>;

export const LIMITS = {
  title: 200,
  excerpt: 500,
  content: 200_000,
  category: 80,
  tag: 40,
  tags: 20,
  author: 100,
  coverAlt: 300,
  seoTitle: 200,
  seoDescription: 320,
  canonical: 500,
} as const;

/** Uploaded covers are named by the upload endpoint from a hash of the processed image: <20 hex>.webp */
export const UPLOADED_COVER_RE = /^[a-f0-9]{20}\.webp$/;

const text = (fd: FormData, key: string): string => {
  const v = fd.get(key);
  return typeof v === "string" ? v.replace(/\r\n/g, "\n") : "";
};
const oneLine = (fd: FormData, key: string) => text(fd, key).replace(/\s+/g, " ").trim();

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,\n]/)) {
    const t = part.replace(/\s+/g, " ").trim();
    if (t && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      tags.push(t);
    }
  }
  return tags;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parsePostForm(
  fd: FormData,
  opts: { legacyCovers: readonly string[] },
): { ok: true; value: PostInput } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const title = oneLine(fd, "title");
  if (!title) errors.title = "Enter a title.";
  else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;

  const slug = oneLine(fd, "slug").toLowerCase();
  const slugError = validateSlug(slug);
  if (slugError) errors.slug = slugError;

  const excerpt = oneLine(fd, "excerpt");
  if (!excerpt) errors.excerpt = "Write a short excerpt (shown on cards and used as the fallback description).";
  else if (excerpt.length > LIMITS.excerpt) errors.excerpt = `Keep the excerpt under ${LIMITS.excerpt} characters.`;

  const content = text(fd, "content");
  if (!content.trim()) errors.content = "The article body is empty.";
  else if (content.length > LIMITS.content) errors.content = "The article is too long.";

  const category = oneLine(fd, "category");
  if (!category) errors.category = "Choose or type a category.";
  else if (category.length > LIMITS.category) errors.category = `Keep the category under ${LIMITS.category} characters.`;

  const tags = parseTags(text(fd, "tags"));
  if (tags.length > LIMITS.tags) errors.tags = `Use at most ${LIMITS.tags} tags.`;
  else if (tags.some((t) => t.length > LIMITS.tag)) errors.tags = `Each tag must be under ${LIMITS.tag} characters.`;

  const author = oneLine(fd, "author") || null;
  if (author && author.length > LIMITS.author) errors.author = `Keep the author under ${LIMITS.author} characters.`;

  // Cover: either a bundled legacy image (allow-list) or an object uploaded through the CMS (strict name).
  const cover = oneLine(fd, "cover") || null;
  let coverWidth: number | null = null;
  let coverHeight: number | null = null;
  if (cover) {
    if (opts.legacyCovers.includes(cover)) {
      /* bundled image: no dimensions needed */
    } else if (UPLOADED_COVER_RE.test(cover)) {
      coverWidth = Number(oneLine(fd, "cover_width"));
      coverHeight = Number(oneLine(fd, "cover_height"));
      if (!Number.isInteger(coverWidth) || !Number.isInteger(coverHeight) || coverWidth < 1 || coverHeight < 1 || coverWidth > 10000 || coverHeight > 10000) {
        errors.cover = "The cover image dimensions are missing. Re-upload the image.";
      }
    } else {
      errors.cover = "Unknown cover image. Upload one or choose a listed image.";
    }
  }
  const coverAlt = oneLine(fd, "cover_alt") || null;
  if (coverAlt && coverAlt.length > LIMITS.coverAlt) errors.cover_alt = `Keep the alt text under ${LIMITS.coverAlt} characters.`;

  const seoTitle = oneLine(fd, "seo_title") || null;
  if (seoTitle && seoTitle.length > LIMITS.seoTitle) errors.seo_title = `Keep the SEO title under ${LIMITS.seoTitle} characters.`;
  const seoDescription = oneLine(fd, "seo_description") || null;
  if (seoDescription && seoDescription.length > LIMITS.seoDescription) {
    errors.seo_description = `Keep the meta description under ${LIMITS.seoDescription} characters.`;
  }

  const canonical = oneLine(fd, "canonical") || null;
  if (canonical) {
    let ok = canonical.length <= LIMITS.canonical && /^https?:\/\/\S+$/.test(canonical);
    if (ok) {
      try {
        new URL(canonical);
      } catch {
        ok = false;
      }
    }
    if (!ok) errors.canonical = "Enter a full URL starting with https:// (or leave it empty).";
  }

  const publishedAt = parseDate(oneLine(fd, "published_at"));
  if (!publishedAt) errors.published_at = "Enter a valid publication date.";
  const modifiedRaw = oneLine(fd, "modified_at");
  const modifiedAt = parseDate(modifiedRaw);
  if (modifiedRaw && !modifiedAt) errors.modified_at = "Enter a valid modification date.";
  if (publishedAt && modifiedAt && modifiedAt < publishedAt) {
    errors.modified_at = "The modification date cannot be earlier than the publication date.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      slug,
      excerpt,
      content,
      category,
      tags,
      author,
      cover,
      cover_width: coverWidth,
      cover_height: coverHeight,
      cover_alt: coverAlt,
      seo_title: seoTitle,
      seo_description: seoDescription,
      canonical,
      published_at: publishedAt!,
      modified_at: modifiedAt,
    },
  };
}

/** Extra requirements checked when a post goes live (draft saves may be incomplete). */
export function publishBlockers(p: Pick<PostInput, "title" | "excerpt" | "content" | "cover" | "cover_alt">): string[] {
  const out: string[] = [];
  if (!p.title.trim()) out.push("a title");
  if (!p.excerpt.trim()) out.push("an excerpt");
  if (!p.content.trim()) out.push("article content");
  if (p.cover && !p.cover_alt) out.push("alt text for the cover image");
  return out;
}
