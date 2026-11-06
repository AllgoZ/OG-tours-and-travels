/* eslint-disable @typescript-eslint/no-explicit-any -- loosely-typed JSON-LD assertions */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadPostsFromMarkdown } from "@/lib/blog-source-markdown";
import { mapMarkdownToRow, readMarkdownPosts, sameContent } from "../scripts/lib/blog-import.mjs";

const VALID = `---
title: Hello
excerpt: Short.
cover: blog-x.jpg
coverAlt: Alt
author: Asha
date: 2026-09-18
updated: 2026-10-01
category: Guides
tags: [a, b]
seoTitle: SEO T
seoDescription: SEO D
canonical: https://example.com/hello
draft: true
reviewStatus: needs-business-review
---

## Body

Text here.
`;

describe("mapMarkdownToRow", () => {
  it("preserves slug, SEO fields, dates, category, tags, cover, author and restrictions", () => {
    const { row } = mapMarkdownToRow("hello.md", VALID);
    expect(row).toMatchObject({
      slug: "hello",
      title: "Hello",
      excerpt: "Short.",
      cover: "blog-x.jpg",
      cover_alt: "Alt",
      author: "Asha",
      category: "Guides",
      tags: ["a", "b"],
      published_at: "2026-09-18T00:00:00.000Z",
      modified_at: "2026-10-01T00:00:00.000Z",
      seo_title: "SEO T",
      seo_description: "SEO D",
      canonical: "https://example.com/hello",
      draft: true,
      review_status: "needs-business-review",
    });
  });

  it("keeps the Markdown body verbatim", () => {
    const { row } = mapMarkdownToRow("hello.md", VALID);
    expect(row!.content).toBe("\n## Body\n\nText here.\n");
  });

  it("defaults: not a draft, approved (how the site already treated such posts)", () => {
    const { row } = mapMarkdownToRow("p.md", "---\ntitle: T\nexcerpt: E\ncategory: C\ndate: 2026-01-01\n---\n\nBody");
    expect(row).toMatchObject({ draft: false, review_status: "approved", tags: [], cover: null, author: null });
  });

  it.each([
    ["missing title", VALID.replace("title: Hello\n", ""), /title/],
    ["bad date", VALID.replace("date: 2026-09-18", "date: nonsense"), /date/],
    ["unknown status", VALID.replace("needs-business-review", "wat"), /reviewStatus/],
    ["bad canonical", VALID.replace("https://example.com/hello", "ftp://x"), /canonical/],
    ["updated before date", VALID.replace("updated: 2026-10-01", "updated: 2026-01-01"), /before/],
    ["empty body", "---\ntitle: T\nexcerpt: E\ncategory: C\ndate: 2026-01-01\n---\n", /body/],
  ])("reports invalid content: %s", (_n, raw, re) => {
    const { row, errors } = mapMarkdownToRow("p.md", raw);
    expect(row).toBeNull();
    expect(errors.join(" ")).toMatch(re);
  });

  it("rejects a filename that is not a valid slug", () => {
    expect(mapMarkdownToRow("Bad Name.md", VALID).errors.join(" ")).toMatch(/slug/);
  });
});

describe("readMarkdownPosts", () => {
  it("reads the repository's real posts without failures", () => {
    const { rows, failures } = readMarkdownPosts(path.resolve("content/blog"));
    expect(failures).toEqual([]);
    expect(rows).toHaveLength(39);
  });

  it("is idempotent: mapping the same files twice yields identical rows (so re-runs are 'unchanged')", () => {
    const a = readMarkdownPosts(path.resolve("content/blog")).rows;
    const b = readMarkdownPosts(path.resolve("content/blog")).rows;
    expect(b).toEqual(a);
    for (const r of a) expect(sameContent(r, r)).toBe(true);
  });

  it("matches what the Markdown runtime source publishes (same slugs, same dates)", () => {
    const rows = readMarkdownPosts(path.resolve("content/blog")).rows;
    const runtime = loadPostsFromMarkdown();
    expect(rows.map((r: any) => r.slug).sort()).toEqual(runtime.map((p) => p.slug).sort());
    for (const r of rows) {
      const p = runtime.find((x) => x.slug === r.slug)!;
      expect(r.published_at).toBe(p.date);
      expect(r.title).toBe(p.title);
    }
  });

  it("detects invalid files and skips non-post files", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-"));
    fs.writeFileSync(path.join(dir, "good.md"), VALID);
    fs.writeFileSync(path.join(dir, "bad.md"), "---\ntitle: only title\n---\nx");
    fs.writeFileSync(path.join(dir, "README.md"), "# readme");
    fs.writeFileSync(path.join(dir, "_draft-template.md"), VALID);
    const { rows, failures } = readMarkdownPosts(dir);
    expect(rows.map((r: any) => r.slug)).toEqual(["good"]);
    expect(failures.map((f: any) => f.file)).toEqual(["bad.md"]);
    fs.rmSync(dir, { recursive: true });
  });

  it("sameContent notices a changed body", () => {
    const { row } = mapMarkdownToRow("hello.md", VALID);
    expect(sameContent({ ...row, content: "changed" }, row)).toBe(false);
  });
});

describe("publication invariant in the import", () => {
  it("a post awaiting business review is imported as a draft (a live post must be approved)", () => {
    const raw = "---\ntitle: T\nexcerpt: E\ncategory: C\ndate: 2026-01-01\nreviewStatus: needs-business-review\n---\n\nBody";
    expect(mapMarkdownToRow("p.md", raw).row).toMatchObject({ draft: true, review_status: "needs-business-review" });
  });
  it("an approved post without draft:true stays live", () => {
    const raw = "---\ntitle: T\nexcerpt: E\ncategory: C\ndate: 2026-01-01\nreviewStatus: approved\n---\n\nBody";
    expect(mapMarkdownToRow("p.md", raw).row).toMatchObject({ draft: false, review_status: "approved" });
  });
});

describe("backup round trip (export -> import)", () => {
  it("rowToMarkdown output re-imports to the identical row", async () => {
    const { rowToMarkdown } = await import("../scripts/lib/blog-import.mjs");
    const { row } = mapMarkdownToRow("hello.md", VALID);
    const again = mapMarkdownToRow("hello.md", rowToMarkdown({ ...row!, cover_width: 1200, cover_height: 800 }));
    expect(again.errors).toEqual([]);
    expect(again.row).toEqual({ ...row, cover_width: 1200, cover_height: 800 });
  });
  it("rejects half-specified cover dimensions", () => {
    const raw = "---\ntitle: T\nexcerpt: E\ncategory: C\ndate: 2026-01-01\ncoverWidth: 800\n---\n\nBody";
    expect(mapMarkdownToRow("p.md", raw).errors.join(" ")).toMatch(/together/);
  });
});
