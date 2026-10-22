import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const url = getSiteUrl();
  // No confirmed production domain yet: ask crawlers to stay out (staging / preview safety).
  if (!url) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin"] }, // the CMS is also noindex via header + meta
    sitemap: `${url}/sitemap.xml`,
    host: url,
  };
}
