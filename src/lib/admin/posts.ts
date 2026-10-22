import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostInput } from "./post-input";
import { transitionPatch, transitionPrecondition, type PostState, type Transition } from "./workflow";

/** A full `blog_posts` row as the admin sees it (RLS lets admins read drafts). */
export interface AdminPost {
  id: string;
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
  review_status: "needs-business-review" | "approved";
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminPostSummary = Pick<
  AdminPost,
  "id" | "slug" | "title" | "category" | "draft" | "review_status" | "published_at" | "updated_at"
>;

const FULL =
  "id,slug,title,excerpt,content,cover,cover_width,cover_height,cover_alt,author,category,tags,published_at,modified_at,seo_title,seo_description,canonical,draft,review_status,reviewed_at,reviewed_by,created_at,updated_at";
const SUMMARY = "id,slug,title,category,draft,review_status,published_at,updated_at";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DbResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** Turns a PostgREST / Postgres error into something an editor can act on (never leaks internals). */
export function describeDbError(err: { code?: string; message?: string }): string {
  switch (err.code) {
    case "23505":
      return "Another article already uses that slug. Choose a different one.";
    case "23514":
      return "The database rejected these values (for example: a live post must be approved, or the modification date is before the publication date).";
    case "42501":
      return "You do not have permission to do that. Sign in again with an administrator account.";
    case "PGRST301":
    case "PGRST303":
      return "Your session has expired. Sign in again.";
    default:
      return `The database could not complete that request${err.code ? ` (${err.code})` : ""}. Try again, and check the Supabase status if it keeps failing.`;
  }
}

const fail = (err: { code?: string; message?: string }): { ok: false; error: string; code?: string } => ({
  ok: false,
  error: describeDbError(err),
  code: err.code,
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface DashboardStats {
  total: number;
  published: number;
  scheduled: number;
  drafts: number;
  awaitingReview: number;
}

export async function getDashboardStats(sb: SupabaseClient, now = new Date()): Promise<DbResult<DashboardStats>> {
  const nowIso = now.toISOString();
  const head = () => sb.from("blog_posts").select("id", { count: "exact", head: true });
  const [total, published, scheduled, drafts, review] = await Promise.all([
    head(),
    head().eq("draft", false).lte("published_at", nowIso),
    head().eq("draft", false).gt("published_at", nowIso),
    head().eq("draft", true),
    head().eq("review_status", "needs-business-review"),
  ]);
  const failed = [total, published, scheduled, drafts, review].find((r) => r.error);
  if (failed?.error) return fail(failed.error);
  return {
    ok: true,
    data: {
      total: total.count ?? 0,
      published: published.count ?? 0,
      scheduled: scheduled.count ?? 0,
      drafts: drafts.count ?? 0,
      awaitingReview: review.count ?? 0,
    },
  };
}

export interface ListQuery {
  q?: string;
  status?: PostState | "all";
  category?: string;
  sort?: "updated" | "published";
  page?: number;
}
export const PAGE_SIZE = 15;

/** PostgREST filter strings treat , ( ) * % \ specially; strip them from free text. */
export function cleanSearch(q: string): string {
  return q.replace(/[,()*%\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function listPosts(
  sb: SupabaseClient,
  query: ListQuery,
  now = new Date(),
): Promise<DbResult<{ posts: AdminPostSummary[]; total: number }>> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  let req = sb.from("blog_posts").select(SUMMARY, { count: "exact" });

  const q = cleanSearch(query.q ?? "");
  if (q) req = req.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  if (query.category) req = req.eq("category", query.category);

  const nowIso = now.toISOString();
  switch (query.status) {
    case "draft":
      req = req.eq("draft", true).eq("review_status", "needs-business-review");
      break;
    case "approved":
      req = req.eq("draft", true).eq("review_status", "approved");
      break;
    case "published":
      req = req.eq("draft", false).lte("published_at", nowIso);
      break;
    case "scheduled":
      req = req.eq("draft", false).gt("published_at", nowIso);
      break;
  }

  const sortCol = query.sort === "published" ? "published_at" : "updated_at";
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await req
    .order(sortCol, { ascending: false })
    .order("slug", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
  if (error) return fail(error);
  return { ok: true, data: { posts: (data ?? []) as AdminPostSummary[], total: count ?? 0 } };
}

export async function listCategories(sb: SupabaseClient): Promise<string[]> {
  const { data } = await sb.from("blog_posts").select("category").limit(1000);
  return [...new Set((data ?? []).map((r: { category: string }) => r.category))].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Single post
// ---------------------------------------------------------------------------
export async function getPostById(sb: SupabaseClient, id: string): Promise<DbResult<AdminPost | null>> {
  if (!UUID_RE.test(id)) return { ok: true, data: null };
  const { data, error } = await sb.from("blog_posts").select(FULL).eq("id", id).maybeSingle();
  if (error) return fail(error);
  return { ok: true, data: (data as AdminPost | null) ?? null };
}

export async function slugTaken(sb: SupabaseClient, slug: string, excludeId?: string): Promise<DbResult<boolean>> {
  let req = sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("slug", slug);
  if (excludeId && UUID_RE.test(excludeId)) req = req.neq("id", excludeId);
  const { count, error } = await req;
  if (error) return fail(error);
  return { ok: true, data: (count ?? 0) > 0 };
}

/** Other articles whose Markdown links to /blog/<slug> (so a rename can warn about them). */
export async function postsLinkingTo(sb: SupabaseClient, slug: string, excludeId: string) {
  const { data } = await sb
    .from("blog_posts")
    .select("id,slug,title")
    .neq("id", excludeId)
    .ilike("content", `%/blog/${slug.replace(/[%_\\]/g, "\\$&")}%`)
    .limit(20);
  return (data ?? []) as { id: string; slug: string; title: string }[];
}

/** Old slugs that currently redirect to this slug (their cached redirect pages must be refreshed too). */
export async function redirectSourcesFor(sb: SupabaseClient, slug: string): Promise<string[]> {
  const { data } = await sb.from("blog_slug_redirects").select("old_slug").eq("new_slug", slug).limit(100);
  return (data ?? []).map((r: { old_slug: string }) => r.old_slug);
}

/** How many OTHER posts use this uploaded cover (used before deleting its file). */
export async function coverUsageCount(sb: SupabaseClient, cover: string, excludeId: string): Promise<number> {
  const { count } = await sb
    .from("blog_posts")
    .select("id", { count: "exact", head: true })
    .eq("cover", cover)
    .neq("id", excludeId);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Mutations (always as the signed-in admin; RLS re-checks every one)
// ---------------------------------------------------------------------------
export async function createPost(sb: SupabaseClient, input: PostInput): Promise<DbResult<AdminPost>> {
  // New posts are ALWAYS drafts awaiting review, whatever the browser sent.
  const { data, error } = await sb
    .from("blog_posts")
    .insert({ ...input, draft: true, review_status: "needs-business-review" })
    .select(FULL)
    .single();
  if (error) return fail(error);
  return { ok: true, data: data as AdminPost };
}

/**
 * Optimistic concurrency: the UPDATE only applies if the row still has the `updated_at` the editor
 * loaded, so two editors can't silently overwrite each other.
 */
export async function updatePost(
  sb: SupabaseClient,
  id: string,
  input: PostInput,
  expectedUpdatedAt: string,
): Promise<DbResult<AdminPost> | { ok: false; error: string; conflict: true }> {
  const { data, error } = await sb
    .from("blog_posts")
    .update(input)
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select(FULL);
  if (error) return fail(error);
  if (!data || data.length === 0) {
    return {
      ok: false,
      conflict: true,
      error: "This article was changed somewhere else since you opened it (or it no longer exists). Reload to see the latest version before saving.",
    };
  }
  return { ok: true, data: data[0] as AdminPost };
}

export async function applyTransition(
  sb: SupabaseClient,
  id: string,
  t: Transition,
  userId: string,
  now = new Date(),
  extra: { published_at?: string } = {},
): Promise<DbResult<AdminPost | null>> {
  const pre = transitionPrecondition(t);
  let req = sb
    .from("blog_posts")
    .update({ ...transitionPatch(t, { now, userId }), ...extra })
    .eq("id", id);
  if (pre.draft !== undefined) req = req.eq("draft", pre.draft);
  if (pre.review_status !== undefined) req = req.eq("review_status", pre.review_status);
  const { data, error } = await req.select(FULL);
  if (error) return fail(error);
  // 0 rows = the precondition no longer holds (someone else changed it, or the transition is not allowed).
  return { ok: true, data: (data?.[0] as AdminPost | undefined) ?? null };
}

/** Only drafts can be deleted; a live post must be unpublished first. */
export async function deleteDraft(sb: SupabaseClient, id: string): Promise<DbResult<boolean>> {
  const { data, error } = await sb.from("blog_posts").delete().eq("id", id).eq("draft", true).select("id");
  if (error) return fail(error);
  return { ok: true, data: (data?.length ?? 0) > 0 };
}
