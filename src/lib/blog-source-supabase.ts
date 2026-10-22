import "server-only";
import {
  BLOG_COLUMNS,
  BlogDataError,
  SLUG_RE,
  isPubliclyVisible,
  parseRow,
  sortNewestFirst,
  type StoredPost,
} from "./blog-core";
import { createPublicSupabaseClient } from "./supabase/server";

/** Safety valve: PostgREST caps responses; never silently truncate the blog. */
const MAX_POSTS = 1000;

/**
 * All publicly visible posts from Supabase, newest first.
 *
 * Visibility is enforced twice and the two agree: by RLS in the database (the real control) and
 * by the explicit filters/`isPubliclyVisible` here. Any failure throws; it is never turned into an
 * empty list, so a broken database cannot masquerade as "no articles".
 */
export async function loadPostsFromSupabase(now: Date = new Date()): Promise<StoredPost[]> {
  const supabase = createPublicSupabaseClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(BLOG_COLUMNS)
    .eq("draft", false)
    .eq("review_status", "approved")
    .lte("published_at", now.toISOString())
    .order("published_at", { ascending: false })
    .order("slug", { ascending: true })
    .limit(MAX_POSTS);

  if (error) {
    // PostgREST error codes/messages do not contain credentials.
    throw new BlogDataError(
      `Could not load blog posts from Supabase (${error.code ?? "no code"}: ${error.message}). ` +
        "Check the project URL/key, that the migration in supabase/migrations has been applied, and network access.",
    );
  }
  if (!Array.isArray(data)) throw new BlogDataError("Supabase returned an unexpected response for blog_posts.");
  if (data.length >= MAX_POSTS) {
    throw new BlogDataError(`blog_posts returned ${MAX_POSTS}+ rows; pagination of the loader is required.`);
  }

  const rows = data as unknown[];
  const posts = rows.map(parseRow);

  // Belt and braces: re-check the publication rule and slug uniqueness on what we received.
  const seen = new Set<string>();
  for (const [i, post] of posts.entries()) {
    const row = rows[i] as { draft: boolean; review_status: string; published_at: string };
    if (!isPubliclyVisible(row, now)) {
      throw new BlogDataError(`Supabase returned a non-public post ("${post.slug}"); refusing to publish it.`);
    }
    if (seen.has(post.slug)) throw new BlogDataError(`Duplicate blog slug "${post.slug}".`);
    seen.add(post.slug);
  }

  return sortNewestFirst(posts);
}

/**
 * Where an old (renamed) slug now lives, or null. RLS only exposes a redirect while its target
 * post is public, so a hidden article's new slug can never be discovered through this.
 */
export async function loadRedirectTarget(oldSlug: string): Promise<string | null> {
  if (!SLUG_RE.test(oldSlug)) return null;
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("blog_slug_redirects")
    .select("new_slug")
    .eq("old_slug", oldSlug)
    .maybeSingle();
  if (error) {
    throw new BlogDataError(`Could not look up slug redirects (${error.code ?? "no code"}: ${error.message}).`);
  }
  const target = (data as { new_slug?: unknown } | null)?.new_slug;
  return typeof target === "string" && SLUG_RE.test(target) ? target : null;
}
