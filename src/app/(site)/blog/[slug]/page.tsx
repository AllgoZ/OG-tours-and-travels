import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { business } from "@/config/business";
import { ArticleView } from "@/components/blog/ArticleView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getAdjacentPosts, getAllSlugs, getPost, getRedirectTarget, getRelatedPosts } from "@/lib/blog";
import { blogCovers } from "@/lib/blog-covers";
import { coverPublicUrl } from "@/lib/covers";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

// Slugs published after the last build are rendered on first request (and cached) instead of 404ing.
// Admin publish/unpublish calls revalidatePath, so changes appear without a rebuild.
export const dynamicParams = true;

/** Social/JSON-LD image: the uploaded cover when there is one, else the site-wide image. */
function articleImage(post: { cover: string; coverWidth?: number; coverHeight?: number; coverAlt: string }) {
  const uploaded = post.cover && !(post.cover in blogCovers) && post.coverWidth && post.coverHeight;
  return uploaded
    ? { url: coverPublicUrl(post.cover), width: post.coverWidth, height: post.coverHeight, alt: post.coverAlt }
    : { url: "/og.jpg" };
}

export async function generateStaticParams() {
  return (await getAllSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  const canonical = post.canonical ?? (getSiteUrl() ? absoluteUrl(`/blog/${slug}`) : undefined);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${slug}`,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author ?? business.blog.defaultAuthor],
      images: [articleImage(post)],
    },
    twitter: { card: "summary_large_image", title, description, images: [articleImage(post).url] },
    ...(post.draft ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    // A renamed article keeps working: old URL -> 308 to the new one (only while the target is public).
    const target = await getRedirectTarget(slug);
    if (target && target !== slug) permanentRedirect(`/blog/${target}`);
    notFound();
  }

  const [related, { prev, next }] = await Promise.all([getRelatedPosts(slug), getAdjacentPosts(slug)]);
  const url = getSiteUrl();

  const articleLd = articleJsonLd(post, {
    siteUrl: url,
    businessName: business.displayName,
    defaultAuthor: business.blog.defaultAuthor,
    imageUrl: articleImage(post).url.startsWith("http") ? articleImage(post).url : undefined,
  });
  const breadcrumbLd = breadcrumbJsonLd(post, url);

  return (
    <>
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <ArticleView post={post} related={related} prev={prev} next={next} />
    </>
  );
}
