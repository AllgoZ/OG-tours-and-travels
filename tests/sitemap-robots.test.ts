import { afterEach, describe, expect, it, vi } from "vitest";

const posts = vi.fn();
vi.mock("@/lib/blog", () => ({ getAllPosts: () => posts() }));

// Config is read from the environment at import time, so each case re-imports the modules.
async function load(site: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", site);
  const [{ default: sitemap }, { default: robots }] = await Promise.all([import("@/app/sitemap"), import("@/app/robots")]);
  return { sitemap, robots };
}

afterEach(() => {
  vi.unstubAllEnvs();
  posts.mockReset();
});

describe("robots.txt", () => {
  it("asks crawlers to stay out while no production domain is set", async () => {
    const { robots } = await load("");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  it("allows the site, hides /admin and points at the sitemap once the domain is set", async () => {
    const { robots } = await load("https://www.ogtravels.in/");
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/admin"] });
    expect(r.sitemap).toBe("https://www.ogtravels.in/sitemap.xml");
    expect(r.host).toBe("https://www.ogtravels.in");
  });
});

describe("sitemap.xml", () => {
  it("is empty without a production domain", async () => {
    const { sitemap } = await load("");
    expect(await sitemap()).toEqual([]);
  });

  it("lists only home and privacy while there are no published articles (no /blog, no dates)", async () => {
    posts.mockResolvedValue([]);
    const { sitemap } = await load("https://www.ogtravels.in");
    const entries = await sitemap();
    expect(entries.map((e) => e.url)).toEqual(["https://www.ogtravels.in/", "https://www.ogtravels.in/privacy"]);
    expect(entries.every((e) => e.lastModified === undefined)).toBe(true);
  });

  it("lists published articles with absolute URLs and dates the home page and journal index by the newest change", async () => {
    posts.mockResolvedValue([
      { slug: "newer", date: "2026-10-23T00:00:00.000Z" },
      { slug: "older", date: "2026-09-18T00:00:00.000Z", updated: "2026-10-30T00:00:00.000Z" },
    ]);
    const { sitemap } = await load("https://www.ogtravels.in");
    const entries = await sitemap();
    const byUrl = new Map(entries.map((e) => [e.url, e]));

    expect([...byUrl.keys()]).toEqual([
      "https://www.ogtravels.in/",
      "https://www.ogtravels.in/blog",
      "https://www.ogtravels.in/privacy",
      "https://www.ogtravels.in/blog/newer",
      "https://www.ogtravels.in/blog/older",
    ]);
    const newest = new Date("2026-10-30T00:00:00.000Z");
    expect(byUrl.get("https://www.ogtravels.in/")?.lastModified).toEqual(newest);
    expect(byUrl.get("https://www.ogtravels.in/blog")?.lastModified).toEqual(newest);
    expect(byUrl.get("https://www.ogtravels.in/blog/older")?.lastModified).toEqual(newest);
    expect(byUrl.get("https://www.ogtravels.in/privacy")?.lastModified).toBeUndefined();
  });
});
