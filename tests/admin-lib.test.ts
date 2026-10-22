import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/admin/paths";
import { LIMITS, parsePostForm, parseTags, publishBlockers, UPLOADED_COVER_RE } from "@/lib/admin/post-input";
import { checkRateLimit, resetRateLimit } from "@/lib/admin/rate-limit";
import { analyzeSeo, internalLinks, outline, type SeoCheckInput } from "@/lib/admin/seo-check";
import { slugify, validateSlug } from "@/lib/admin/slug";
import { cleanSearch, describeDbError } from "@/lib/admin/posts";
import {
  allowedTransitions,
  derivePostState,
  isTransition,
  transitionPatch,
  transitionPrecondition,
  type Transition,
} from "@/lib/admin/workflow";

const NOW = new Date("2026-10-20T00:00:00Z");

describe("slugs", () => {
  it("suggests a clean ASCII slug from a title", () => {
    expect(slugify("How to Plan a Group Road Trip — Tamil Nadu!")).toBe("how-to-plan-a-group-road-trip-tamil-nadu");
    expect(slugify("Café & Chai: Rajini's Picks")).toBe("cafe-and-chai-rajinis-picks");
    expect(slugify("  ---  ")).toBe("");
  });
  it("trims long titles at a word boundary", () => {
    const s = slugify("word ".repeat(40));
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith("-")).toBe(false);
  });
  it("validates format and reserved words", () => {
    expect(validateSlug("good-slug-1")).toBeNull();
    for (const bad of ["", "Bad", "a b", "a--b", "-a", "a-", "page", "admin", "a".repeat(121)]) expect(validateSlug(bad)).not.toBeNull();
  });
});

describe("editorial workflow", () => {
  const f = (draft: boolean, status: string, at = "2026-09-01T00:00:00Z") => ({ draft, review_status: status, published_at: at });
  it("derives the state", () => {
    expect(derivePostState(f(true, "needs-business-review"), NOW)).toBe("draft");
    expect(derivePostState(f(true, "approved"), NOW)).toBe("approved");
    expect(derivePostState(f(false, "approved"), NOW)).toBe("published");
    expect(derivePostState(f(false, "approved", "2027-01-01T00:00:00Z"), NOW)).toBe("scheduled");
  });
  it("only offers legal transitions — publishing is impossible before approval", () => {
    expect(allowedTransitions(f(true, "needs-business-review"), NOW)).toEqual(["approve"]);
    expect(allowedTransitions(f(true, "approved"), NOW)).toEqual(["publish", "request_review"]);
    expect(allowedTransitions(f(false, "approved"), NOW)).toEqual(["unpublish", "request_review"]);
    expect(allowedTransitions(f(true, "needs-business-review"), NOW)).not.toContain("publish");
  });
  it("publish requires an approved draft, in the WHERE clause (atomic)", () => {
    expect(transitionPrecondition("publish")).toEqual({ draft: true, review_status: "approved" });
    expect(transitionPrecondition("approve")).toEqual({ draft: true, review_status: "needs-business-review" });
    expect(transitionPrecondition("unpublish")).toEqual({ draft: false });
  });
  it("patches never smuggle other fields; approval records the server-side user", () => {
    expect(transitionPatch("approve", { now: NOW, userId: "u1" })).toEqual({ review_status: "approved", reviewed_at: NOW.toISOString(), reviewed_by: "u1" });
    expect(transitionPatch("publish", { now: NOW, userId: "u1" })).toEqual({ draft: false });
    expect(transitionPatch("unpublish", { now: NOW, userId: "u1" })).toEqual({ draft: true });
    // sending a live post back for review takes it offline in the same statement (satisfies the DB invariant)
    expect(transitionPatch("request_review", { now: NOW, userId: "u1" })).toMatchObject({ draft: true, review_status: "needs-business-review", reviewed_by: null });
  });
  it("recognises only known transitions", () => {
    for (const t of ["approve", "publish", "unpublish", "request_review"] as Transition[]) expect(isTransition(t)).toBe(true);
    expect(isTransition("delete")).toBe(false);
    expect(isTransition(undefined)).toBe(false);
  });
});

describe("form validation (server side)", () => {
  const legacy = ["blog-a.jpg"];
  const form = (o: Record<string, string> = {}) => {
    const fd = new FormData();
    const base: Record<string, string> = {
      title: " My   title ",
      slug: "my-title",
      excerpt: "An excerpt.",
      content: "## Body\r\n\r\ntext",
      category: "Guides",
      tags: "a, B, a",
      author: "",
      cover: "",
      cover_alt: "",
      seo_title: "",
      seo_description: "",
      canonical: "",
      published_at: "2026-09-18T10:00:00.000Z",
      modified_at: "",
    };
    for (const [k, v] of Object.entries({ ...base, ...o })) fd.set(k, v);
    return fd;
  };

  it("normalises a valid submission", () => {
    const r = parsePostForm(form(), { legacyCovers: legacy });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toMatchObject({ title: "My title", slug: "my-title", tags: ["a", "B"], author: null, cover: null, canonical: null, modified_at: null });
      expect(r.value.content).toBe("## Body\n\ntext"); // CRLF normalised
    }
  });

  it("ignores any publication flags sent by the browser", () => {
    const fd = form();
    fd.set("draft", "false");
    fd.set("review_status", "approved");
    const r = parsePostForm(fd, { legacyCovers: legacy });
    expect(r.ok && "draft" in r.value).toBe(false);
    expect(r.ok && "review_status" in r.value).toBe(false);
  });

  it.each([
    ["title", { title: "   " }],
    ["title", { title: "x".repeat(LIMITS.title + 1) }],
    ["slug", { slug: "Not Valid" }],
    ["slug", { slug: "page" }],
    ["excerpt", { excerpt: "" }],
    ["content", { content: "  \n " }],
    ["category", { category: "" }],
    ["tags", { tags: Array.from({ length: 25 }, (_, i) => `t${i}`).join(",") }],
    ["canonical", { canonical: "javascript:alert(1)" }],
    ["canonical", { canonical: "https://" }],
    ["cover", { cover: "../../etc/passwd" }],
    ["cover", { cover: "unknown.jpg" }],
    ["cover", { cover: "0123456789abcdef0123.webp" }], // uploaded name but no dimensions
    ["published_at", { published_at: "nonsense" }],
    ["modified_at", { modified_at: "2020-01-01T00:00:00.000Z" }], // before publication
    ["seo_description", { seo_description: "x".repeat(LIMITS.seoDescription + 1) }],
  ])("rejects invalid %s", (field, override) => {
    const r = parsePostForm(form(override), { legacyCovers: legacy });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toContain(field);
  });

  it("accepts bundled and uploaded covers", () => {
    expect(parsePostForm(form({ cover: "blog-a.jpg" }), { legacyCovers: legacy }).ok).toBe(true);
    const up = parsePostForm(form({ cover: "0123456789abcdef0123.webp", cover_width: "1200", cover_height: "800" }), { legacyCovers: legacy });
    expect(up.ok && up.value).toMatchObject({ cover_width: 1200, cover_height: 800 });
    expect(UPLOADED_COVER_RE.test("0123456789abcdef0123.webp")).toBe(true);
    expect(UPLOADED_COVER_RE.test("../0123456789abcdef0123.webp")).toBe(false);
  });

  it("parses tags", () => expect(parseTags(" x ,y\nz,, X ")).toEqual(["x", "y", "z"]));

  it("a live post needs alt text when it has a cover", () => {
    expect(publishBlockers({ title: "t", excerpt: "e", content: "c", cover: "a.webp", cover_alt: null })).toEqual(["alt text for the cover image"]);
    expect(publishBlockers({ title: "t", excerpt: "e", content: "c", cover: null, cover_alt: null })).toEqual([]);
  });
});

describe("SEO guidance", () => {
  const base: SeoCheckInput = {
    title: "A good title",
    slug: "a-good-title",
    excerpt: "Short excerpt.",
    content: "Intro with a [link](/blog/other).\n\n## Section\n\n" + "word ".repeat(200),
    seoTitle: "A descriptive SEO title for this article",
    seoDescription: "x".repeat(120),
    canonical: "",
    cover: "a.webp",
    coverAlt: "alt text",
  };
  const ids = (i: Partial<SeoCheckInput>) => analyzeSeo({ ...base, ...i }).map((f) => f.id);

  it("is quiet for a well-formed article", () => expect(ids({})).toEqual([]));
  it("flags missing / long / short metadata", () => {
    expect(ids({ seoTitle: "" })).toContain("seo-title-missing");
    expect(ids({ seoTitle: "x".repeat(80) })).toContain("seo-title-long");
    expect(ids({ seoDescription: "" })).toContain("seo-desc-missing");
    expect(ids({ seoDescription: "x".repeat(200) })).toContain("seo-desc-long");
    expect(ids({ seoDescription: "short" })).toContain("seo-desc-short");
  });
  it("flags errors: duplicate slug, empty content, invalid canonical, missing title", () => {
    expect(ids({ slugTaken: true })).toContain("slug-taken");
    expect(ids({ content: "" })).toContain("content-empty");
    expect(ids({ canonical: "not a url" })).toContain("canonical-invalid");
    expect(ids({ title: "" })).toContain("title-missing");
  });
  it("flags missing cover alt text", () => expect(ids({ coverAlt: "" })).toContain("cover-alt-missing"));
  it("checks heading structure", () => {
    expect(ids({ content: "# Title in body\n\ntext [x](/a)" })).toContain("body-h1");
    expect(ids({ content: "## A\n\n#### Skipped\n\n[x](/a) " + "w ".repeat(200) })).toContain("heading-skip");
    expect(ids({ content: "### Only h3\n\n[x](/a) " + "w ".repeat(200) })).toContain("h3-without-h2");
  });
  it("suggests internal links, and counts only site-relative ones", () => {
    expect(ids({ content: "No links here. " + "w ".repeat(200) })).toContain("no-internal-links");
    expect(internalLinks("[a](/blog/x) [b](https://example.com) [c](//evil.com) [d](#top)")).toEqual(["/blog/x", "#top"]);
  });
  it("ignores headings inside code fences", () => {
    expect(outline("## Real\n\n```\n## not a heading\n```\n### Sub")).toEqual([
      { level: 2, text: "Real" },
      { level: 3, text: "Sub" },
    ]);
  });
  it("never produces a score or ranking promise", () => {
    const text = analyzeSeo({ ...base, seoTitle: "", content: "" }).map((f) => f.message).join(" ");
    expect(text).not.toMatch(/rank|score|guarantee|boost/i);
  });
});

describe("login throttle", () => {
  it("allows up to max attempts per window, then blocks until the window passes", () => {
    const key = "t:" + Math.random();
    const opts = { max: 3, windowMs: 1000 };
    expect([1, 2, 3].map((i) => checkRateLimit(key, { ...opts, now: i }).allowed)).toEqual([true, true, true]);
    const blocked = checkRateLimit(key, { ...opts, now: 10 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(checkRateLimit(key, { ...opts, now: 2000 }).allowed).toBe(true);
  });
  it("can be reset (successful sign-in) and keys are independent", () => {
    const a = "a:" + Math.random();
    const b = "b:" + Math.random();
    for (let i = 0; i < 3; i++) checkRateLimit(a, { max: 3, windowMs: 1000, now: i });
    expect(checkRateLimit(a, { max: 3, windowMs: 1000, now: 5 }).allowed).toBe(false);
    expect(checkRateLimit(b, { max: 3, windowMs: 1000, now: 5 }).allowed).toBe(true);
    resetRateLimit(a);
    expect(checkRateLimit(a, { max: 3, windowMs: 1000, now: 6 }).allowed).toBe(true);
  });
});

describe("post-login redirect safety (no open redirects)", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/posts/new", "/admin/posts/new"],
    ["/admin/posts/abc/edit", "/admin/posts/abc/edit"],
    ["https://evil.example", "/admin"],
    ["//evil.example", "/admin"],
    ["/blog", "/admin"],
    ["/admin/../etc", "/admin"],
    ["/admin/login", "/admin"],
    ["/admin/forbidden", "/admin"],
    ["/admin\\evil", "/admin"],
    [undefined, "/admin"],
    [42, "/admin"],
  ])("%s -> %s", (input, expected) => expect(safeNextPath(input)).toBe(expected));
});

describe("database helpers", () => {
  it("cleans search text so it cannot alter a PostgREST filter", () => {
    expect(cleanSearch("a,b)(or=1*%\\\"'")).toBe("a b or=1");
    expect(cleanSearch("x".repeat(200))).toHaveLength(80);
  });
  it("turns database errors into editor-friendly messages without internals", () => {
    expect(describeDbError({ code: "23505", message: 'duplicate key value violates unique constraint "blog_posts_slug_unique"' })).toMatch(/slug/);
    expect(describeDbError({ code: "42501", message: "permission denied for table blog_posts" })).toMatch(/permission/);
    const generic = describeDbError({ code: "XX000", message: "secret internal detail" });
    expect(generic).not.toMatch(/secret internal detail/);
  });
});
