import { ArrowUpRight, Star } from "lucide-react";
import { business, type Review } from "@/config/business";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const isDev = process.env.NODE_ENV !== "production";

/** Google "G" mark, used to label the review source and the link to Google. */
function GoogleG({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${r} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={`size-4 ${i < r ? "fill-[#FFC53D] text-[#FFC53D]" : "fill-ink/15 text-ink/15"}`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex w-[19rem] shrink-0 flex-col rounded-2xl border border-ink/10 bg-white/60 p-6 sm:w-[21rem]">
      <div className="flex items-center justify-between">
        <Stars rating={review.rating} />
        <GoogleG />
      </div>
      <p className="mt-4 line-clamp-5 text-sm leading-relaxed text-ink/85">{review.text}</p>
      <div className="mt-5 flex items-center gap-3 border-t border-ink/10 pt-4">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-ink/10 font-heading text-sm font-bold text-ink">
          {review.author.trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{review.author}</p>
          <p className="text-xs text-slate">{review.date ? `${review.date} · ` : ""}Posted on Google</p>
        </div>
      </div>
    </article>
  );
}

export function GoogleReviews() {
  // Only genuine (verified) reviews go to production; samples preview the layout in dev.
  const reviews = business.reviews.filter((r) => (isDev ? true : r.verified));
  if (reviews.length === 0) return null;

  const hasSamples = isDev && reviews.some((r) => !r.verified);
  // Duplicate the list so the marquee loops seamlessly (translateX 0 → -50%).
  const loop = [...reviews, ...reviews];
  const reviewsUrl = business.googleBusinessProfileUrl;

  return (
    <section aria-labelledby="reviews-title" className="surface-dark section-y overflow-hidden">
      <div className="container-x">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              id="reviews-title"
              eyebrow="Reviews"
              title="What travellers say"
            />
            {reviewsUrl && (
              <a
                href={reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink transition-colors hover:text-accent-deep"
              >
                <GoogleG className="size-4" />
                See all reviews on Google
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            )}
          </div>
        </Reveal>

        {hasSamples && (
          <p className="mt-4 inline-block rounded-control border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-deep">
            Sample reviews shown in development — add your real Google reviews in
            <code className="mx-1">src/config/business.ts</code>. Only verified reviews appear on the live site.
          </p>
        )}
      </div>

      {/* Full-bleed scrolling track */}
      <Reveal className="marquee-viewport mt-10" delay={80}>
        <ul className="marquee-track flex gap-5 px-5 sm:px-8" aria-label="Customer reviews from Google">
          {loop.map((review, i) => (
            <li key={i} aria-hidden={i >= reviews.length ? true : undefined}>
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
