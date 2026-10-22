import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = getSiteUrl();
  // Absolute URLs are required; without a confirmed domain there is nothing valid to list.
  if (!url) return [];

  const published = await getAllPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${url}/`, changeFrequency: "monthly", priority: 1 },
    // The journal index is only listed once it has an article (an empty index is noindex).
    ...(published.length > 0 ? [{ url: `${url}/blog`, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
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
