import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { coverImage } from "@/lib/blog-covers";
import { formatDate, type PostSummary } from "@/lib/blog";

interface ArticleCardProps {
  post: PostSummary;
  priority?: boolean;
}

/** Editorial article card (no boxy white card): image on top, metadata, title, excerpt. */
export function ArticleCard({ post, priority }: ArticleCardProps) {
  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/blog/${post.slug}`}
        className="relative block overflow-hidden rounded-xl border border-ink/10"
      >
        <div className="aspect-[16/10] overflow-hidden">
          <Image
            src={coverImage(post.cover)}
            alt={post.coverAlt}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            quality={78}
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 90vw"
            className="zoom-img h-full w-full object-cover"
          />
        </div>
      </Link>
      <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-slate">
        <span className="text-accent-deep">{post.category}</span>
        <span aria-hidden="true">·</span>
        <span>{post.readingMinutes} min read</span>
      </div>
      <h3 className="mt-3 font-heading text-xl font-bold leading-tight text-ink">
        <Link href={`/blog/${post.slug}`} className="transition-colors group-hover:text-accent-deep">
          {post.title}
          <ArrowUpRight aria-hidden="true" className="arrow-slide ml-1 inline size-4 align-text-top text-slate" />
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-slate">{post.excerpt}</p>
      <p className="mt-3 text-xs text-slate/80">{formatDate(post.date)}</p>
    </article>
  );
}
