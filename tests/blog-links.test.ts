import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SECTION } from "@/lib/site";

const dir = path.resolve("content/blog");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md");
const slugs = new Set(files.map((f) => f.replace(/\.md$/, "")));
const anchors = new Set<string>(Object.values(SECTION));

describe("internal links in content/blog", () => {
  it.each(files)("%s only links to real routes", (file) => {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    const own = file.replace(/\.md$/, "");
    const broken: string[] = [];
    for (const m of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
      const href = m[1];
      if (href.startsWith("/blog/")) {
        const target = href.slice("/blog/".length);
        if (!slugs.has(target) || target === own) broken.push(href);
      } else if (href.startsWith("/#")) {
        if (!anchors.has(href.slice(2))) broken.push(href);
      } else if (href !== "/" && href !== "/blog" && href !== "/privacy") {
        broken.push(href);
      }
    }
    expect(broken).toEqual([]);
  });
});
