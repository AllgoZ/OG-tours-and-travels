/* eslint-disable @typescript-eslint/no-explicit-any -- loosely-typed JSON-LD assertions */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { faqs } from "@/content/faq";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, serializeJsonLd } from "@/lib/seo";
import { toSummary } from "@/lib/blog-core";
import { post } from "./helpers";

// ---- mocks for sitemap / robots / feed --------------------------------------------------
let siteUrl: string | null = null;
let posts: ReturnType<typeof toSummary>[] = [];
vi.mock("@/lib/site", () => ({
  getSiteUrl: () => siteUrl,
  absoluteUrl: (p: string) => (siteUrl ? `${siteUrl}${p}` : p),
}));
vi.mock("@/lib/blog", () => ({ getAllPosts: async () => posts }));

const live = toSummary(post({ slug: "live-post", title: "Live & <great>", date: "2026-09-18T00:00:00.000Z" }));
const ctx = { siteUrl: "https://example.com", businessName: "OG Tours and Travels", defaultAuthor: "OG Tours and Travels" };

beforeEach(() => {
  siteUrl = null;
  posts = [];
});

describe("robots", () => {
  it("disallows everything while the production domain is unset", async () => {
    const { default: robots } = await import("@/app/robots");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
  it("allows crawling and links the sitemap once the domain is set", async () => {
    siteUrl = "https://example.com";
    const { default: robots } = await import("@/app/robots");
    expect(robots()).toMatchObject({ rules: { userAgent: "*", allow: "/" }, sitemap: "https://example.com/sitemap.xml" });
  });
});

describe("sitemap", () => {
  it("is empty without a production domain (noindex safety gate)", async () => {
    posts = [live];
    const { default: sitemap } = await import("@/app/sitemap");
    expect(await sitemap()).toEqual([]);
  });
  it("lists only the posts the blog layer returns, with absolute URLs", async () => {
    siteUrl = "https://example.com";
    posts = [live];
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://example.com/blog/live-post");
    expect(urls).toContain("https://example.com/blog");
    expect(urls.every((u) => u.startsWith("https://example.com"))).toBe(true);
  });
  it("omits the empty /blog index when there are no published posts", async () => {
    siteUrl = "https://example.com";
    posts = [];
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).not.toContain("https://example.com/blog");
    expect(urls.some((u) => u.includes("/blog/"))).toBe(false);
  });
});

describe("RSS feed", () => {
  it("contains only the returned posts and escapes XML", async () => {
    siteUrl = "https://example.com";
    posts = [live];
    const { GET } = await import("@/app/(site)/blog/feed.xml/route");
    const xml = await (await GET()).text();
    expect(xml).toContain("<link>https://example.com/blog/live-post</link>");
    expect(xml).toContain("Live &amp; &lt;great&gt;");
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });
  it("has no items when nothing is published", async () => {
    posts = [];
    const { GET } = await import("@/app/(site)/blog/feed.xml/route");
    expect(await (await GET()).text()).not.toContain("<item>");
  });
});

describe("JSON-LD", () => {
  it("BlogPosting matches the post that is rendered", () => {
    const p = { ...post({ slug: "s", tags: ["x", "y"], updated: "2026-10-01T00:00:00.000Z" }) };
    const ld = articleJsonLd(p, ctx) as Record<string, any>;
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.headline).toBe(p.title);
    expect(ld.datePublished).toBe(p.date);
    expect(ld.dateModified).toBe("2026-10-01T00:00:00.000Z");
    expect(ld.mainEntityOfPage["@id"]).toBe("https://example.com/blog/s");
    expect(ld.keywords).toBe("x, y");
    expect(ld.author.name).toBe("OG Tours and Travels");
  });
  it("omits absolute URLs and invented fields when the domain is unset", () => {
    const ld = articleJsonLd(post(), { ...ctx, siteUrl: null }) as Record<string, any>;
    expect(ld.mainEntityOfPage).toBeUndefined();
    expect(ld.image).toBeUndefined();
    expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|review|offers|price/i);
  });
  it("prefers the seo description and a verified author", () => {
    const ld = articleJsonLd(post({ seoDescription: "SEO", author: "Asha" }), ctx) as Record<string, any>;
    expect(ld.description).toBe("SEO");
    expect(ld.author.name).toBe("Asha");
  });
  it("BreadcrumbList is Home > Journal > post", () => {
    const ld = breadcrumbJsonLd({ title: "T", slug: "s" }, "https://example.com") as Record<string, any>;
    expect(ld.itemListElement.map((i: any) => i.name)).toEqual(["Home", "Journal", "T"]);
    expect(ld.itemListElement[2].item).toBe("https://example.com/blog/s");
  });
  it("FAQPage mirrors the visible FAQ exactly", () => {
    const ld = faqJsonLd(faqs) as Record<string, any>;
    expect(ld.mainEntity).toHaveLength(faqs.length);
    expect(ld.mainEntity[0].name).toBe(faqs[0].question);
    expect(ld.mainEntity[0].acceptedAnswer.text).toBe(faqs[0].answer);
  });
  it("serializer cannot be broken out of the script tag", () => {
    const out = serializeJsonLd({ t: "</script><script>alert(1)</script> & " + String.fromCharCode(0x2028) });
    expect(out).not.toMatch(/<|>|&/);
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(JSON.parse(out).t).toContain("</script>");
  });
});

describe("JSON-LD — uploaded cover", () => {
  it("uses the article's own cover as the image when one is supplied", () => {
    const ld = articleJsonLd(post(), { ...ctx, imageUrl: "https://x.supabase.co/storage/v1/object/public/blog-covers/a.webp" }) as Record<string, any>;
    expect(ld.image).toBe("https://x.supabase.co/storage/v1/object/public/blog-covers/a.webp");
    expect((articleJsonLd(post(), ctx) as Record<string, any>).image).toBe("https://example.com/og.jpg");
  });
});
