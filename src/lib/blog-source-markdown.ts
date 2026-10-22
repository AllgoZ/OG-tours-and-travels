import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { BlogDataError, sortNewestFirst, toIso, type PostFrontmatter, type StoredPost } from "./blog-core";

/**
 * Markdown-file source (content/blog/*.md). Kept as the documented rollback path: set
 * BLOG_SOURCE=markdown to publish from these files exactly as the site did before Supabase.
 * Behaviour is unchanged: drafts are hidden in production only; needs-business-review posts show
 * (with the "example article" banner).
 */
const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const isProd = process.env.NODE_ENV === "production";

function listFiles(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  // Only post files: *.md, excluding README.md and underscore-prefixed helper files.
  return fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_"));
}

export function loadPostsFromMarkdown(): StoredPost[] {
  const posts = listFiles().map((file): StoredPost => {
    const slug = file.replace(/\.md$/, "");
    const { data, content } = matter(fs.readFileSync(path.join(BLOG_DIR, file), "utf8"));
    const fm = data as Partial<PostFrontmatter> & { date?: unknown; updated?: unknown };
    if (!fm.title || !fm.excerpt || !fm.category) {
      throw new BlogDataError(`content/blog/${file}: title, excerpt and category are required.`);
    }
    return {
      ...(fm as PostFrontmatter),
      slug,
      content,
      cover: fm.cover ?? "",
      coverAlt: fm.coverAlt ?? fm.title,
      // YAML dates arrive as Date objects; normalise to ISO strings like the database source.
      date: toIso(fm.date, "date", slug),
      updated: fm.updated ? toIso(fm.updated, "updated", slug) : undefined,
    };
  });
  return sortNewestFirst(posts.filter((p) => !(p.draft && isProd)));
}
