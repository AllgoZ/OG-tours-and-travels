import type { Metadata } from "next";
import { business } from "@/config/business";
import { BlogListing } from "@/components/blog/BlogListing";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

const TITLE = "Travel Journal — Group Travel & Vehicle Hire Guides";
const DESCRIPTION =
  "Practical guides on planning comfortable group road trips, family outstation travel, event transport and Force Urbania hire from OG Tours and Travels.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: getSiteUrl() ? { canonical: "/blog" } : undefined,
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/blog", type: "website" },
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const perPage = business.blog.postsPerPage;
  const [featured, ...rest] = posts;
  const totalPages = Math.max(1, Math.ceil(rest.length / perPage));

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    ...(getSiteUrl() && { url: absoluteUrl("/blog") }),
    hasPart: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      datePublished: p.date,
      ...(getSiteUrl() && { url: absoluteUrl(`/blog/${p.slug}`) }),
    })),
  };

  return (
    <>
      <JsonLd data={collectionLd} />
      <BlogListing
        description={DESCRIPTION}
        featured={featured ?? null}
        posts={rest.slice(0, perPage)}
        currentPage={1}
        totalPages={totalPages}
      />
    </>
  );
}
