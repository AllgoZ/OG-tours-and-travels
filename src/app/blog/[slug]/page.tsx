import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { business } from "@/config/business";
import { Breadcrumbs } from "@/components/blog/Breadcrumbs";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { CtaLink } from "@/components/ui/CtaLink";
import { JsonLd } from "@/components/seo/JsonLd";
import { coverImage } from "@/lib/blog-covers";
import { formatDate, getAdjacentPosts, getAllSlugs, getPost, getRelatedPosts } from "@/lib/blog";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
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
      images: [{ url: `/og.jpg` }],
    },
    twitter: { card: "summary_large_image", title, description },
    ...(post.draft ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug);
  const { prev, next } = getAdjacentPosts(slug);
  const author = post.author ?? business.blog.defaultAuthor;
  const url = getSiteUrl();

  const articleLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: author },
    publisher: {
      "@type": "Organization",
      name: business.displayName,
      ...(url && { logo: { "@type": "ImageObject", url: `${url}/icon.png` } }),
    },
    ...(url && {
      mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${slug}`) },
      image: `${url}/og.jpg`,
    }),
    articleSection: post.category,
    ...(post.tags && { keywords: post.tags.join(", ") }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", ...(url && { item: `${url}/` }) },
      { "@type": "ListItem", position: 2, name: "Journal", ...(url && { item: absoluteUrl("/blog") }) },
      { "@type": "ListItem", position: 3, name: post.title, ...(url && { item: absoluteUrl(`/blog/${slug}`) }) },
    ],
  };

  return (
    <div className="surface-dark">
      <JsonLd data={[articleLd, breadcrumbLd]} />

      <article>
        {/* Header */}
        <div className="container-x pt-28 pb-10 sm:pt-32 lg:pt-36">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Journal", href: "/blog" }, { label: post.title }]}
          />
          <p className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.14em]">
            <span className="text-accent-deep">{post.category}</span>
          </p>
          <h1 className="text-display mt-4 max-w-4xl text-ink">{post.title}</h1>
          <p className="text-lead mt-5 max-w-2xl text-slate">{post.excerpt}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate">
            <span className="text-ink">{author}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 aria-hidden="true" className="size-4" />
              {post.readingMinutes} min read
            </span>
          </div>
          {post.reviewStatus === "needs-business-review" && (
            <p className="mt-6 inline-block rounded-control border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-deep">
              Example article — pending business review before publishing.
            </p>
          )}
        </div>

        {/* Cover */}
        <div className="container-x">
          <div className="overflow-hidden rounded-2xl border border-ink/10">
            <Image
              src={coverImage(post.cover)}
              alt={post.coverAlt}
              priority
              quality={82}
              sizes="(min-width: 1280px) 1120px, 100vw"
              className="h-auto w-full object-cover"
            />
          </div>
        </div>

        {/* Body + TOC */}
        <div className="container-x py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_16rem] lg:gap-14">
            <div id="article-body" className="prose-article max-w-2xl" dangerouslySetInnerHTML={{ __html: post.html }} />
            <aside>
              <TableOfContents headings={post.headings} />
            </aside>
          </div>

          {/* In-context enquiry CTA */}
          <div className="mt-12 max-w-2xl rounded-2xl border border-ink/10 bg-graphite p-6 sm:p-8">
            <h2 className="font-heading text-xl font-bold text-ink">Planning a trip like this?</h2>
            <p className="mt-2 text-slate">
              Tell us your route, dates and group size, and we&apos;ll help you plan a comfortable
              journey.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <CtaLink kind="whatsapp">Enquire on WhatsApp</CtaLink>
              <CtaLink kind="call" variant="outline-dark">
                Call Us
              </CtaLink>
            </div>
          </div>

          {/* Prev / next */}
          {(prev || next) && (
            <nav aria-label="More articles" className="mt-14 grid gap-4 border-t border-ink/10 pt-8 sm:grid-cols-2">
              {prev ? (
                <Link href={`/blog/${prev.slug}`} className="group flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-slate">
                    <ArrowLeft aria-hidden="true" className="size-4" /> Previous
                  </span>
                  <span className="font-heading font-semibold text-ink transition-colors group-hover:text-accent-deep">
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link href={`/blog/${next.slug}`} className="group flex flex-col gap-1 sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-slate sm:justify-end">
                    Next <ArrowRight aria-hidden="true" className="size-4" />
                  </span>
                  <span className="font-heading font-semibold text-ink transition-colors group-hover:text-accent-deep">
                    {next.title}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="container-x pb-24">
            <h2 className="text-h3 text-ink">Related reading</h2>
            <ul className="mt-8 grid gap-x-7 gap-y-12 sm:grid-cols-2">
              {related.map((p) => (
                <li key={p.slug}>
                  <ArticleCard post={p} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  );
}
