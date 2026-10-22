import { describe, expect, it } from "vitest";
import {
  BlogDataError,
  formatDate,
  isPubliclyVisible,
  parseRow,
  readingTime,
  selectAdjacent,
  selectRelated,
  sortNewestFirst,
  toSummary,
} from "@/lib/blog-core";
import { post, row } from "./helpers";

const NOW = new Date("2026-10-20T00:00:00Z");
const vis = (o: Partial<{ draft: boolean; review_status: string; published_at: string }>) =>
  isPubliclyVisible({ draft: false, review_status: "approved", published_at: "2026-09-18T00:00:00Z", ...o }, NOW);

describe("isPubliclyVisible (must match the RLS policy)", () => {
  it("shows an approved, non-draft, already-published post", () => expect(vis({})).toBe(true));
  it("hides drafts", () => expect(vis({ draft: true })).toBe(false));
  it("hides posts awaiting business review", () => expect(vis({ review_status: "needs-business-review" })).toBe(false));
  it("hides scheduled (future) posts", () => expect(vis({ published_at: "2026-12-01T00:00:00Z" })).toBe(false));
  it("shows a post published exactly now", () => expect(vis({ published_at: NOW.toISOString() })).toBe(true));
});

describe("parseRow", () => {
  it("maps a database row to the app model", () => {
    const p = parseRow(row({ author: "Asha", modified_at: "2026-10-01T00:00:00Z", seo_title: "T", seo_description: "D" }));
    expect(p).toMatchObject({
      slug: "sample-post",
      coverAlt: "Alt text",
      author: "Asha",
      date: "2026-09-18T00:00:00.000Z",
      updated: "2026-10-01T00:00:00.000Z",
      seoTitle: "T",
      seoDescription: "D",
      tags: ["a", "b"],
      draft: false,
      reviewStatus: "approved",
    });
  });

  it("falls back for optional fields (cover, alt, empty tags)", () => {
    const p = parseRow(row({ cover: null, cover_alt: null, tags: [] }));
    expect(p.cover).toBe("");
    expect(p.coverAlt).toBe("Sample post");
    expect(p.tags).toBeUndefined();
  });

  it.each([
    ["invalid slug", { slug: "Bad Slug" }],
    ["unknown review status", { review_status: "maybe" }],
    ["non-boolean draft", { draft: "no" }],
    ["missing title", { title: "" }],
    ["missing content", { content: null }],
    ["bad date", { published_at: "not-a-date" }],
    ["bad canonical", { canonical: "javascript:alert(1)" }],
    ["bad tags", { tags: [1, 2] }],
  ])("rejects %s", (_name, override) => {
    expect(() => parseRow(row(override))).toThrow(BlogDataError);
  });

  it("rejects non-objects", () => expect(() => parseRow(null)).toThrow(BlogDataError));
});

describe("ordering, related and adjacent", () => {
  const a = post({ slug: "a", date: "2026-01-01T00:00:00.000Z", category: "X" });
  const b = post({ slug: "b", date: "2026-03-01T00:00:00.000Z", category: "Y" });
  const c = post({ slug: "c", date: "2026-02-01T00:00:00.000Z", category: "X" });
  const d = post({ slug: "d", date: "2026-03-01T00:00:00.000Z", category: "Z" });

  it("sorts newest first with slug as a stable tiebreak", () => {
    expect(sortNewestFirst([a, d, c, b]).map((p) => p.slug)).toEqual(["b", "d", "c", "a"]);
  });

  it("related: same category first, then most recent, never itself", () => {
    const sorted = sortNewestFirst([a, b, c, d]);
    expect(selectRelated(sorted, "a", 2).map((p) => p.slug)).toEqual(["c", "b"]);
    expect(selectRelated(sorted, "a", 5).map((p) => p.slug)).not.toContain("a");
  });

  it("adjacent: prev is older, next is newer", () => {
    const sorted = sortNewestFirst([a, b, c, d]); // b d c a
    expect(selectAdjacent(sorted, "c")).toMatchObject({ prev: { slug: "a" }, next: { slug: "d" } });
    expect(selectAdjacent(sorted, "b").next).toBeNull();
    expect(selectAdjacent(sorted, "a").prev).toBeNull();
    expect(selectAdjacent(sorted, "missing")).toEqual({ prev: null, next: null });
  });
});

describe("reading time and dates", () => {
  it("is at least one minute and ~200 wpm", () => {
    expect(readingTime("short")).toBe(1);
    expect(readingTime(Array(600).fill("word").join(" "))).toBe(3);
  });
  it("toSummary drops the Markdown source", () => {
    const s = toSummary(post());
    expect(s).not.toHaveProperty("content");
    expect(s.readingMinutes).toBeGreaterThanOrEqual(1);
  });
  it("formats dates in India time regardless of server timezone", () => {
    expect(formatDate("2026-09-18T00:00:00.000Z")).toBe("18 September 2026");
  });
});
