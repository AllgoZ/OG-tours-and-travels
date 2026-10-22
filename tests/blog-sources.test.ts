import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlogDataError } from "@/lib/blog-core";
import { row } from "./helpers";

// ---- Supabase source with a stubbed client -------------------------------------------------
type Result = { data: unknown; error: { code?: string; message: string } | null };
let result: Result = { data: [], error: null };
const calls: string[][] = [];

vi.mock("@/lib/supabase/server", () => {
  const builder: Record<string, unknown> = {};
  const chain = (name: string) => (...args: unknown[]) => {
    calls.push([name, ...args.map(String)]);
    return builder;
  };
  for (const m of ["select", "eq", "lte", "order", "limit"]) builder[m] = chain(m);
  builder.then = (resolve: (r: Result) => unknown) => resolve(result);
  return { createPublicSupabaseClient: () => ({ from: () => builder }) };
});

const { loadPostsFromSupabase } = await import("@/lib/blog-source-supabase");

beforeEach(() => {
  calls.length = 0;
  result = { data: [], error: null };
});

describe("loadPostsFromSupabase", () => {
  it("asks only for published rows (agrees with the RLS policy) and orders newest first", async () => {
    result = { data: [row({ slug: "a" })], error: null };
    await loadPostsFromSupabase(new Date("2026-10-20T00:00:00Z"));
    expect(calls).toContainEqual(["eq", "draft", "false"]);
    expect(calls).toContainEqual(["eq", "review_status", "approved"]);
    expect(calls).toContainEqual(["lte", "published_at", "2026-10-20T00:00:00.000Z"]);
    expect(calls.find((c) => c[0] === "order")).toEqual(["order", "published_at", "[object Object]"]);
  });

  it("returns validated, sorted posts", async () => {
    result = {
      data: [
        row({ slug: "older", published_at: "2026-01-01T00:00:00Z" }),
        row({ slug: "newer", published_at: "2026-05-01T00:00:00Z" }),
      ],
      error: null,
    };
    const posts = await loadPostsFromSupabase();
    expect(posts.map((p) => p.slug)).toEqual(["newer", "older"]);
  });

  it("an empty table is a legitimate empty blog", async () => {
    await expect(loadPostsFromSupabase()).resolves.toEqual([]);
  });

  it("surfaces Supabase errors instead of returning an empty blog", async () => {
    result = { data: null, error: { code: "42P01", message: 'relation "blog_posts" does not exist' } };
    await expect(loadPostsFromSupabase()).rejects.toThrow(/Could not load blog posts from Supabase \(42P01/);
  });

  it("refuses a draft that somehow reaches the client", async () => {
    result = { data: [row({ slug: "leak", draft: true })], error: null };
    await expect(loadPostsFromSupabase()).rejects.toThrow(/non-public post/);
  });

  it("refuses an unreviewed post", async () => {
    result = { data: [row({ slug: "leak", review_status: "needs-business-review" })], error: null };
    await expect(loadPostsFromSupabase()).rejects.toThrow(/non-public post/);
  });

  it("refuses a future-dated post", async () => {
    result = { data: [row({ slug: "future", published_at: "2999-01-01T00:00:00Z" })], error: null };
    await expect(loadPostsFromSupabase(new Date("2026-10-20T00:00:00Z"))).rejects.toThrow(/non-public post/);
  });

  it("rejects duplicate slugs", async () => {
    result = { data: [row({ slug: "dup" }), row({ slug: "dup" })], error: null };
    await expect(loadPostsFromSupabase()).rejects.toThrow(/Duplicate blog slug "dup"/);
  });

  it("rejects malformed rows", async () => {
    result = { data: [row({ slug: "BAD SLUG" })], error: null };
    await expect(loadPostsFromSupabase()).rejects.toThrow(BlogDataError);
  });
});

// ---- real client factory: configuration errors ---------------------------------------------
describe("createPublicSupabaseClient configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails with an actionable message when Supabase is not configured", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const actual = await vi.importActual<typeof import("@/lib/supabase/server")>("@/lib/supabase/server");
    expect(() => actual.createPublicSupabaseClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL.*BLOG_SOURCE=markdown/);
  });
});
