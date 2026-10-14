import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { getAllPosts } from "@/lib/blog";
import { SECTION } from "@/lib/site";

export function LatestStories() {
  const posts = getAllPosts().slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section id={SECTION.blog} aria-labelledby="stories-title" className="grain surface-dark section-y">
      <div className="container-x">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              id="stories-title"
              eyebrow="The journal"
              title="Travel notes & planning guides"
            />
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-soft transition-colors hover:text-lime"
            >
              All articles
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </Reveal>

        <ul className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal as="li" key={post.slug} delay={i * 90}>
              <ArticleCard post={post} />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
