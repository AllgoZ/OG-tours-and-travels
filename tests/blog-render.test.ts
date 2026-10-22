import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/blog-render";

describe("renderMarkdown", () => {
  it("builds headings with unique ids and a table of contents for h2/h3 only", () => {
    const { html, headings } = renderMarkdown("## Plan\n\ntext\n\n### Pack\n\n## Plan\n\n#### Deep");
    expect(headings).toEqual([
      { id: "plan", text: "Plan", level: 2 },
      { id: "pack", text: "Pack", level: 3 },
      { id: "plan-1", text: "Plan", level: 2 },
    ]);
    expect(html).toContain('<h2 id="plan">Plan</h2>');
    expect(html).toContain('<h2 id="plan-1">Plan</h2>');
  });

  it("demotes a body H1 so the page keeps a single H1", () => {
    const { html } = renderMarkdown("# Title in body\n\ntext");
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2");
  });

  it("strips scripts, event handlers, iframes and images from untrusted Markdown", () => {
    const evil = [
      "<script>alert(1)</script>",
      '<img src=x onerror="alert(1)">',
      '<iframe src="https://evil.example"></iframe>',
      '<p onclick="steal()">hi</p>',
      "![pic](https://example.com/a.png)",
    ].join("\n\n");
    const { html } = renderMarkdown(evil);
    expect(html).not.toMatch(/<script|onerror|onclick|<iframe|<img/i);
    expect(html).toContain("hi");
  });

  it("removes javascript: and data: links but keeps safe ones", () => {
    const { html } = renderMarkdown(
      "[bad](javascript:alert(1)) [data](data:text/html;base64,AAAA) [ok](https://example.com) [rel](/blog) [mail](mailto:a@b.co)",
    );
    expect(html).not.toMatch(/javascript:|data:/i);
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="/blog"');
    expect(html).toContain('href="mailto:a@b.co"');
  });

  it("escapes markup smuggled into heading text", () => {
    const { html, headings } = renderMarkdown("## Hello <img src=x onerror=alert(1)>");
    expect(html).not.toMatch(/<img|onerror=/i);
    expect(headings[0].text).toBe("Hello");
  });

  it("keeps normal formatting", () => {
    const { html } = renderMarkdown("Some **bold** and *em*\n\n- one\n- two\n\n> quote");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<blockquote>");
  });
});

describe("renderMarkdown — images", () => {
  const BASE = "https://proj.supabase.co";
  const own = `${BASE}/storage/v1/object/public/blog-covers/0123456789abcdef0123.webp`;

  it("allows images only from the site's own blog-covers bucket", async () => {
    const { vi } = await import("vitest");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", BASE);
    const { html } = renderMarkdown(`![ok](${own})\n\n![ext](https://evil.example/a.png)\n\n![sub](${BASE}/storage/v1/object/public/blog-covers/x/y.webp)\n\n![other](${BASE}/storage/v1/object/public/private-bucket/a.webp)`);
    expect(html).toContain(`src="${own}"`);
    expect(html).toContain('alt="ok"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("private-bucket");
    expect(html).not.toContain("x/y.webp");
    vi.unstubAllEnvs();
  });

  it("allows no images at all when Supabase is not configured", async () => {
    const { vi } = await import("vitest");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(renderMarkdown(`![x](${own})`).html).not.toContain("<img");
    vi.unstubAllEnvs();
  });
});
