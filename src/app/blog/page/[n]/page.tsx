import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { business } from "@/config/business";
import { BlogListing } from "@/components/blog/BlogListing";
import { getAllPosts } from "@/lib/blog";
import { getSiteUrl } from "@/lib/site";

const DESCRIPTION =
  "Practical guides on planning comfortable group road trips, family outstation travel, event transport and Force Urbania hire from OG Tours and Travels.";

function pageCount(): number {
  const rest = Math.max(0, getAllPosts().length - 1); // featured sits on page 1
  return Math.max(1, Math.ceil(rest / business.blog.postsPerPage));
}

/** Static params for pages 2..N only (page 1 is /blog). */
export function generateStaticParams() {
  const total = pageCount();
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => ({ n: String(i + 2) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n } = await params;
  const title = `Travel Journal — Page ${n}`;
  return {
    title,
    description: DESCRIPTION,
    alternates: getSiteUrl() ? { canonical: `/blog/page/${n}` } : undefined,
    robots: { index: false, follow: true }, // canonical signal points to /blog; avoid thin paginated dupes
  };
}

export default async function BlogPageN({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const pageNum = Number(n);
  const total = pageCount();
  if (!Number.isInteger(pageNum) || pageNum < 2 || pageNum > total) notFound();

  const perPage = business.blog.postsPerPage;
  const [, ...rest] = getAllPosts();
  const posts = rest.slice((pageNum - 1) * perPage, pageNum * perPage);

  return (
    <BlogListing
      description={DESCRIPTION}
      featured={null}
      posts={posts}
      currentPage={pageNum}
      totalPages={total}
    />
  );
}
