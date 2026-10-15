import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Breadcrumbs } from "@/components/blog/Breadcrumbs";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { coverImage } from "@/lib/blog-covers";
import { formatDate, type PostSummary } from "@/lib/blog";

interface BlogListingProps {
  description: string;
  featured: PostSummary | null; // only on page 1
  posts: PostSummary[];
  currentPage: number;
  totalPages: number;
}

export function BlogListing({ description, featured, posts, currentPage, totalPages }: BlogListingProps) {
  return (
    <div className="surface-dark">
      <div className="container-x pt-28 pb-16 sm:pt-32 lg:pt-36">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Journal" }]} />
        <p className="text-eyebrow mt-8 flex items-center gap-3 text-slate">
          <span aria-hidden="true" className="h-px w-10 bg-coral" />
          The journal
        </p>
        <h1 className="text-display mt-5 max-w-3xl text-ink">
          Travel notes &amp; <span className="font-serif-accent italic text-accent-deep">planning guides</span>
        </h1>
        <p className="text-lead mt-5 max-w-2xl text-slate">{description}</p>
      </div>

      {featured && (
        <div className="container-x pb-14">
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid gap-6 overflow-hidden rounded-2xl border border-ink/10 lg:grid-cols-2 lg:items-stretch"
          >
            <div className="aspect-[16/10] overflow-hidden lg:aspect-auto">
              <Image
                src={coverImage(featured.cover)}
                alt={featured.coverAlt}
                priority
                quality={80}
                sizes="(min-width: 1024px) 600px, 100vw"
                className="zoom-img h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center p-2 pb-6 lg:p-10">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate">
                <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-navy">Featured</span>
                <span className="text-accent-deep">{featured.category}</span>
                <span aria-hidden="true">·</span>
                <span>{featured.readingMinutes} min read</span>
              </div>
              <h2 className="mt-4 font-heading text-2xl font-bold leading-tight text-ink transition-colors group-hover:text-accent-deep lg:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-xl text-slate">{featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                Read article
                <ArrowUpRight aria-hidden="true" className="arrow-slide size-4" />
              </span>
              <p className="mt-4 text-xs text-slate/80">{formatDate(featured.date)}</p>
            </div>
          </Link>
        </div>
      )}

      <div className="container-x pb-24">
        <h2 className="sr-only">Articles</h2>
        <ul className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <ArticleCard post={post} />
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={n === 1 ? "/blog" : `/blog/page/${n}`}
                aria-current={n === currentPage ? "page" : undefined}
                className={`inline-flex size-11 items-center justify-center rounded-control border text-sm font-semibold transition-colors ${
                  n === currentPage
                    ? "border-accent bg-accent text-navy"
                    : "border-ink/15 text-slate hover:border-ink/40 hover:text-ink"
                }`}
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
