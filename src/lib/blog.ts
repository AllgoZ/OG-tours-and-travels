import "server-only";
import { cache } from "react";
import {
  selectAdjacent,
  selectRelated,
  toSummary,
  type Post,
  type PostSummary,
  type StoredPost,
} from "./blog-core";
import { renderMarkdown } from "./blog-render";
import { loadPostsFromMarkdown } from "./blog-source-markdown";
import { loadPostsFromSupabase, loadRedirectTarget } from "./blog-source-supabase";

export { formatDate } from "./blog-core";
export type { Heading, Post, PostFrontmatter, PostSummary } from "./blog-core";

/**
 * Public blog API used by pages, sitemap, RSS and the home page. Async because the default
 * source is Supabase; every consumer awaits it.
 *
 *   BLOG_SOURCE=supabase  (default)  published posts from the blog_posts table (RLS-protected)
 *   BLOG_SOURCE=markdown             content/blog/*.md — the rollback path
 *
 * The site is statically prerendered, so posts are read at BUILD time: publishing a post in
 * Supabase requires a rebuild/redeploy to appear.
 */
function source(): "supabase" | "markdown" {
  const s = process.env.BLOG_SOURCE ?? "supabase";
  if (s !== "supabase" && s !== "markdown") {
    throw new Error(`BLOG_SOURCE must be "supabase" or "markdown" (got "${s}").`);
  }
  return s;
}

let buildMemo: Promise<StoredPost[]> | null = null;

async function load(): Promise<StoredPost[]> {
  return source() === "markdown" ? loadPostsFromMarkdown() : loadPostsFromSupabase();
}

/**
 * One read per render (React cache) and, during `next build` only, one per worker process
 * (module memo), so the ~20 prerender calls don't each hit the database. At runtime the memo is
 * OFF: pages regenerated on demand after an admin change (revalidatePath) must see fresh data.
 * A failed read is never memoised.
 */
const loadAll = cache(async (): Promise<StoredPost[]> => {
  if (process.env.NEXT_PHASE !== "phase-production-build") return load();
  buildMemo ??= load().catch((err) => {
    buildMemo = null;
    throw err;
  });
  return buildMemo;
});

export async function getAllSlugs(): Promise<string[]> {
  return (await loadAll()).map((p) => p.slug);
}

/** Newest first. */
export async function getAllPosts(): Promise<PostSummary[]> {
  return (await loadAll()).map(toSummary);
}

export async function getPost(slug: string): Promise<Post | null> {
  const stored = (await loadAll()).find((p) => p.slug === slug);
  if (!stored) return null;
  return { ...toSummary(stored), ...renderMarkdown(stored.content) };
}

export async function getRelatedPosts(slug: string, limit = 2): Promise<PostSummary[]> {
  return selectRelated(await getAllPosts(), slug, limit);
}

export async function getAdjacentPosts(slug: string): Promise<{ prev: PostSummary | null; next: PostSummary | null }> {
  return selectAdjacent(await getAllPosts(), slug);
}

/** New slug for a renamed article's old slug (Supabase source only), or null. */
export async function getRedirectTarget(oldSlug: string): Promise<string | null> {
  return source() === "markdown" ? null : loadRedirectTarget(oldSlug);
}
