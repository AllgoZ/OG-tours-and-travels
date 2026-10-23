import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = getSiteUrl();
  // Absolute URLs are required; without a confirmed domain there is nothing valid to list.
  if (!url) return [];

  const published = await getAllPosts();

  // Most recent editorial change among published articles. The home page ("Latest stories") and the
  // journal index change whenever an article does; with no articles there is no honest date, so omit it.
  const newest = published.reduce<Date | null>((latest, post) => {
    const d = new Date(post.updated ?? post.date);
    return !latest || d > latest ? d : latest;
  }, null);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${url}/`, ...(newest && { lastModified: newest }), changeFrequency: "weekly", priority: 1 },
    // The journal index is only listed once it has an article (an empty index is noindex).
    ...(published.length > 0
      ? [{ url: `${url}/blog`, ...(newest && { lastModified: newest }), changeFrequency: "weekly" as const, priority: 0.8 }]
      : []),
    { url: `${url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const posts: MetadataRoute.Sitemap = published.map((post) => ({
    url: `${url}/blog/${post.slug}`,
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
