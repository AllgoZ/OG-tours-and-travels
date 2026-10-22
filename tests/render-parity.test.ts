import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/blog-render";

/** The pre-Supabase renderer (verbatim logic from the old src/lib/blog.ts). */
function legacyRender(md: string) {
  const slugify = (t: string) => t.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  const headings: { id: string; text: string; level: number }[] = [];
  const renderer = new marked.Renderer();
  const seen = new Map<string, number>();
  renderer.heading = ({ tokens, depth }) => {
    const text = tokens.map((t) => ("text" in t ? t.text : "")).join("");
    const base = slugify(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const id = n ? `${base}-${n}` : base;
    if (depth === 2 || depth === 3) headings.push({ id, text, level: depth });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  return { html: marked.parse(md, { renderer, async: false }) as string, headings };
}

/** Quote entities are encoded differently by the sanitiser but render identically. */
const norm = (html: string) => html.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ");

describe("article rendering is unchanged by the sanitiser for the existing posts", () => {
  const dir = path.resolve("content/blog");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
  it.each(files)("%s", (file) => {
    const { content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
    const before = legacyRender(content);
    const after = renderMarkdown(content);
    expect(norm(after.html)).toBe(norm(before.html));
    expect(after.headings).toEqual(before.headings);
  });
});
