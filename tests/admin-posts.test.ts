import { describe, expect, it } from "vitest";
import {
  applyTransition,
  createPost,
  deleteDraft,
  getDashboardStats,
  getPostById,
  listPosts,
  updatePost,
} from "@/lib/admin/posts";
import type { PostInput } from "@/lib/admin/post-input";

/**
 * A recording stand-in for the Supabase client's query builder: every chained call is logged, and the
 * builder resolves (when awaited) to `result`. Lets us check exactly what the admin data layer asks
 * the database to do, and how it reports failures.
 */
function stub(result: { data?: unknown; error?: { code?: string; message: string } | null; count?: number | null }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "neq", "lte", "gt", "ilike", "or", "order", "range", "limit", "single", "maybeSingle"]) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (r: unknown) => unknown) => resolve({ data: null, error: null, count: null, ...result });
  const sb = { from: (t: string) => (calls.push(["from", t]), builder) };
  return { sb: sb as never, calls };
}

const has = (calls: Array<[string, ...unknown[]]>, ...c: unknown[]) => calls.some((x) => JSON.stringify(x) === JSON.stringify(c));
const input: PostInput = {
  title: "T", slug: "t", excerpt: "E", content: "C", category: "Cat", tags: [], author: null, cover: null, cover_width: null,
  cover_height: null, cover_alt: null, seo_title: null, seo_description: null, canonical: null,
  published_at: "2026-01-01T00:00:00.000Z", modified_at: null,
};
const NOW = new Date("2026-10-20T00:00:00Z");

describe("admin data layer", () => {
  it("a new post is ALWAYS a draft awaiting review, whatever else is sent", async () => {
    const { sb, calls } = stub({ data: { id: "1" } });
    await createPost(sb, { ...input, draft: false, review_status: "approved" } as PostInput);
    const insert = calls.find((c) => c[0] === "insert")![1] as Record<string, unknown>;
    expect(insert.draft).toBe(true);
    expect(insert.review_status).toBe("needs-business-review");
  });

  it("update is guarded by the editor's updated_at token; no rows = conflict, not silent overwrite", async () => {
    const ok = stub({ data: [{ id: "1", updated_at: "x" }] });
    expect((await updatePost(ok.sb, "1", input, "tok")).ok).toBe(true);
    expect(has(ok.calls, "eq", "updated_at", "tok")).toBe(true);

    const lost = stub({ data: [] });
    const r = await updatePost(lost.sb, "1", input, "tok");
    expect(r.ok).toBe(false);
    expect(r).toMatchObject({ conflict: true });
  });

  it("transitions put their precondition in the same UPDATE (publish => draft AND approved)", async () => {
    const { sb, calls } = stub({ data: [{ id: "1", slug: "t", updated_at: "u" }] });
    await applyTransition(sb, "1", "publish", "user-1", NOW);
    expect(has(calls, "eq", "draft", true)).toBe(true);
    expect(has(calls, "eq", "review_status", "approved")).toBe(true);
    expect((calls.find((c) => c[0] === "update")![1] as Record<string, unknown>)).toEqual({ draft: false });
  });

  it("a transition whose precondition no longer holds returns null (nothing changed)", async () => {
    const { sb } = stub({ data: [] });
    expect(await applyTransition(sb, "1", "publish", "u", NOW)).toEqual({ ok: true, data: null });
  });

  it("only drafts are deleted", async () => {
    const { sb, calls } = stub({ data: [{ id: "1" }] });
    await deleteDraft(sb, "1");
    expect(has(calls, "eq", "draft", true)).toBe(true);
  });

  it("surfaces database failures instead of fabricating data", async () => {
    const err = { error: { code: "PGRST301", message: "JWT expired" } };
    const stats = await getDashboardStats(stub(err).sb, NOW);
    expect(stats.ok).toBe(false);
    const list = await listPosts(stub(err).sb, {}, NOW);
    expect(list.ok).toBe(false);
    if (!list.ok) expect(list.error).toMatch(/session has expired/i);
    const one = await getPostById(stub(err).sb, "7b0c2a52-6f9c-4d63-9a0d-3a1f4d3b9c11");
    expect(one.ok).toBe(false);
  });

  it("does not query for malformed ids", async () => {
    const { sb, calls } = stub({ data: null });
    expect(await getPostById(sb, "not-a-uuid")).toEqual({ ok: true, data: null });
    expect(calls).toHaveLength(0);
  });

  it("dashboard counts come from the database (head count queries)", async () => {
    const r = await getDashboardStats(stub({ count: 7 }).sb, NOW);
    expect(r).toEqual({ ok: true, data: { total: 7, published: 7, scheduled: 7, drafts: 7, awaitingReview: 7 } });
  });

  it("list filters map to the workflow states", async () => {
    const draft = stub({ data: [], count: 0 });
    await listPosts(draft.sb, { status: "draft" }, NOW);
    expect(has(draft.calls, "eq", "draft", true) && has(draft.calls, "eq", "review_status", "needs-business-review")).toBe(true);
    const sched = stub({ data: [], count: 0 });
    await listPosts(sched.sb, { status: "scheduled" }, NOW);
    expect(has(sched.calls, "gt", "published_at", NOW.toISOString())).toBe(true);
  });
});
