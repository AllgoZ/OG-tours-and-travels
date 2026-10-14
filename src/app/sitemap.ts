import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = getSiteUrl();
  // Absolute URLs are required; without a confirmed domain there is nothing valid to list.
  if (!url) return [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${url}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${url}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const posts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${url}/blog/${post.slug}`,
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
