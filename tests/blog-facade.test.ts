import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { post } from "./helpers";

const supa = vi.fn();
vi.mock("@/lib/blog-source-supabase", () => ({ loadPostsFromSupabase: () => supa() }));

// The Markdown source reads the real content/blog directory (the rollback path).
async function freshBlog() {
  vi.resetModules();
  return import("@/lib/blog");
}

afterEach(() => vi.unstubAllEnvs());

describe("blog facade — markdown source (rollback path)", () => {
  beforeEach(() => vi.stubEnv("BLOG_SOURCE", "markdown"));

  it("serves the repository's Markdown posts newest first", async () => {
    const blog = await freshBlog();
    const posts = await blog.getAllPosts();
    expect(posts.length).toBe(5);
    const dates = posts.map((p) => +new Date(p.date));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
    expect(posts[0].readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it("renders a post with headings, and returns null for an unknown slug (→ real 404)", async () => {
    const blog = await freshBlog();
    const slugs = await blog.getAllSlugs();
    const p = await blog.getPost(slugs[0]);
    expect(p?.html).toContain("<h2");
    expect(p?.headings.length).toBeGreaterThan(0);
    await expect(blog.getPost("does-not-exist")).resolves.toBeNull();
  });

  it("preserves frontmatter fields", async () => {
    const blog = await freshBlog();
    const p = await blog.getPost("plan-group-road-trip-tamil-nadu");
    expect(p).toMatchObject({
      title: "How to Plan a Comfortable Group Road Trip in Tamil Nadu",
      category: "Travel Planning",
      cover: "blog-group-road-trip.jpg",
      author: "OG Tours and Travels",
      reviewStatus: "needs-business-review",
      date: "2026-09-18T00:00:00.000Z",
    });
    expect(p?.tags).toContain("road trip");
  });

  it("related and adjacent posts work and never include the current post", async () => {
    const blog = await freshBlog();
    const [first, second] = await blog.getAllSlugs();
    const related = await blog.getRelatedPosts(first);
    expect(related.map((r) => r.slug)).not.toContain(first);
    const adj = await blog.getAdjacentPosts(second);
    expect(adj.next?.slug).toBe(first);
  });
});

describe("blog facade — supabase source", () => {
  beforeEach(() => {
    vi.stubEnv("BLOG_SOURCE", "supabase");
    supa.mockReset();
  });

  it("uses Supabase by default", async () => {
    vi.unstubAllEnvs();
    supa.mockResolvedValue([post({ slug: "from-db" })]);
    const blog = await freshBlog();
    expect(await blog.getAllSlugs()).toEqual(["from-db"]);
  });

  it("a database failure rejects — it is never presented as an empty blog", async () => {
    supa.mockRejectedValue(new Error("boom"));
    const blog = await freshBlog();
    await expect(blog.getAllPosts()).rejects.toThrow("boom");
    await expect(blog.getAllSlugs()).rejects.toThrow("boom");
    await expect(blog.getPost("x")).rejects.toThrow("boom");
  });

  it("rejects an unknown BLOG_SOURCE value", async () => {
    vi.stubEnv("BLOG_SOURCE", "firebase");
    const blog = await freshBlog();
    await expect(blog.getAllPosts()).rejects.toThrow(/BLOG_SOURCE/);
  });
});
