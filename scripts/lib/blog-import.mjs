// Pure helpers for the Markdown -> blog_posts import (no I/O beyond reading files; unit tested).
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Columns the import writes. `draft`, `review_status` and `published_at` are insert-only (see import-blog.mjs). */
export const CONTENT_COLUMNS = [
  "title",
  "excerpt",
  "content",
  "cover",
  "cover_width",
  "cover_height",
  "cover_alt",
  "author",
  "category",
  "tags",
  "modified_at",
  "seo_title",
  "seo_description",
  "canonical",
];

function toIso(value, field, errors) {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    errors.push(`"${field}" is not a valid date`);
    return null;
  }
  return d.toISOString();
}

const text = (v) => (typeof v === "string" && v.trim() !== "" ? v : null);

/**
 * Converts one Markdown file to a blog_posts row. Returns { row, errors }.
 * Mapping (documented in docs/supabase-blog.md):
 *   filename -> slug · date -> published_at · updated -> modified_at · coverAlt -> cover_alt
 *   seoTitle/seoDescription -> seo_title/seo_description · draft (absent = false) -> draft
 *   reviewStatus (absent = approved, matching how the site treated such posts) -> review_status
 *   body -> content (verbatim)
 */
export function mapMarkdownToRow(filename, raw) {
  const errors = [];
  const slug = filename.replace(/\.md$/, "");
  if (!SLUG_RE.test(slug)) errors.push(`filename is not a valid slug (lowercase letters, digits, hyphens): "${slug}"`);

  let parsed;
  try {
    parsed = matter(raw);
  } catch (err) {
    return { row: null, errors: [`frontmatter could not be parsed: ${err.message}`] };
  }
  const fm = parsed.data;

  for (const f of ["title", "excerpt", "category", "date"]) {
    if (!fm[f]) errors.push(`missing required frontmatter "${f}"`);
  }
  if (!parsed.content.trim()) errors.push("body is empty");

  const published_at = toIso(fm.date, "date", errors);
  const modified_at = toIso(fm.updated, "updated", errors);
  if (published_at && modified_at && modified_at < published_at) errors.push('"updated" is before "date"');

  const reviewStatus = fm.reviewStatus ?? "approved";
  if (!["needs-business-review", "approved"].includes(reviewStatus)) errors.push(`unknown reviewStatus "${reviewStatus}"`);
  if (fm.draft !== undefined && typeof fm.draft !== "boolean") errors.push('"draft" must be true or false');
  if (fm.tags !== undefined && !(Array.isArray(fm.tags) && fm.tags.every((t) => typeof t === "string"))) {
    errors.push('"tags" must be a list of text');
  }
  if (fm.canonical && !/^https?:\/\/\S+$/.test(fm.canonical)) errors.push('"canonical" must be an http(s) URL');
  if (fm.cover && !/^[A-Za-z0-9._-]+$/.test(fm.cover)) errors.push('"cover" must be a plain filename');
  const dim = (v) => (v === undefined || v === null || v === "" ? null : Number.isInteger(v) && v > 0 && v <= 10000 ? v : NaN);
  const cover_width = dim(fm.coverWidth);
  const cover_height = dim(fm.coverHeight);
  if (Number.isNaN(cover_width) || Number.isNaN(cover_height)) errors.push('"coverWidth"/"coverHeight" must be whole numbers between 1 and 10000');
  else if ((cover_width === null) !== (cover_height === null)) errors.push('"coverWidth" and "coverHeight" must be given together');

  if (errors.length) return { row: null, slug, errors };

  return {
    slug,
    errors,
    row: {
      slug,
      title: String(fm.title).trim(),
      excerpt: String(fm.excerpt).trim(),
      content: parsed.content,
      cover: text(fm.cover),
      cover_width,
      cover_height,
      cover_alt: text(fm.coverAlt),
      author: text(fm.author),
      category: String(fm.category).trim(),
      tags: Array.isArray(fm.tags) ? fm.tags : [],
      published_at,
      modified_at,
      seo_title: text(fm.seoTitle),
      seo_description: text(fm.seoDescription),
      canonical: text(fm.canonical),
      // A post awaiting business review is always a draft (the database forbids live-but-unreviewed).
      draft: fm.draft === true || reviewStatus !== "approved",
      review_status: reviewStatus,
    },
  };
}

/** Reads every post file in `dir` and flags duplicate slugs. Returns { rows, failures }. */
export function readMarkdownPosts(dir) {
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_")).sort()
    : [];
  const rows = [];
  const failures = [];
  const seen = new Set();
  for (const file of files) {
    const { row, slug, errors } = mapMarkdownToRow(file, fs.readFileSync(path.join(dir, file), "utf8"));
    if (!row) {
      failures.push({ file, errors });
      continue;
    }
    if (seen.has(slug)) {
      failures.push({ file, errors: [`duplicate slug "${slug}"`] });
      continue;
    }
    seen.add(slug);
    rows.push(row);
  }
  return { rows, failures };
}

/** True when the stored row already holds the same content columns as the Markdown row. */
export function sameContent(dbRow, row) {
  const norm = (v) => (v instanceof Date ? v.toISOString() : v ?? null);
  return CONTENT_COLUMNS.every((c) => JSON.stringify(norm(dbRow[c])) === JSON.stringify(norm(row[c])));
}

/**
 * Inverse of mapMarkdownToRow: a database row as a Markdown file with the same frontmatter the importer
 * (and the Markdown rollback source) reads. Used for backups; restoring is `npm run blog:import -- --dir <folder>`.
 */
export function rowToMarkdown(row) {
  const iso = (v) => (v ? new Date(v).toISOString() : undefined);
  const data = {
    title: row.title,
    excerpt: row.excerpt,
    cover: row.cover ?? undefined,
    coverWidth: row.cover_width ?? undefined,
    coverHeight: row.cover_height ?? undefined,
    coverAlt: row.cover_alt ?? undefined,
    author: row.author ?? undefined,
    date: iso(row.published_at),
    updated: iso(row.modified_at),
    category: row.category,
    tags: row.tags?.length ? row.tags : undefined,
    seoTitle: row.seo_title ?? undefined,
    seoDescription: row.seo_description ?? undefined,
    canonical: row.canonical ?? undefined,
    draft: row.draft,
    reviewStatus: row.review_status,
  };
  for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
  return matter.stringify(row.content, data);
}
