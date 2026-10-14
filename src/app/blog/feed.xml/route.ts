import { business } from "@/config/business";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

const escape = (s: string | undefined) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function GET() {
  const site = getSiteUrl() ?? "";
  const posts = getAllPosts();
  const updated = posts[0]?.date ?? new Date().toISOString();

  const items = posts
    .map((p) => {
      const link = absoluteUrl(`/blog/${p.slug}`);
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <category>${escape(p.category)}</category>
      <description>${escape(p.excerpt)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(business.displayName)} — Journal</title>
    <link>${site}/blog</link>
    <description>Group travel and vehicle hire guides from ${escape(business.displayName)}.</description>
    <language>en</language>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
