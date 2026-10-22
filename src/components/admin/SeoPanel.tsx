"use client";

import { useMemo } from "react";
import { analyzeSeo, outline, type SeoCheckInput, type SeoLevel } from "@/lib/admin/seo-check";
import { card } from "./styles";

interface Props {
  values: SeoCheckInput;
  /** Production origin, or null before the domain is configured. */
  siteUrl: string | null;
  coverSrc: string;
  siteName: string;
}

const LEVEL: Record<SeoLevel, { label: string; cls: string }> = {
  error: { label: "Fix", cls: "bg-red-100 text-red-900 ring-red-300" },
  warn: { label: "Check", cls: "bg-amber-100 text-amber-900 ring-amber-300" },
  tip: { label: "Tip", cls: "bg-sky-100 text-sky-900 ring-sky-300" },
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * Actionable writing guidance + how the page may look in search and when shared. It does not produce a
 * score: nothing here predicts rankings, citations or traffic.
 */
export function SeoPanel({ values, siteUrl, coverSrc, siteName }: Props) {
  const findings = useMemo(() => analyzeSeo(values), [values]);
  const heads = useMemo(() => outline(values.content), [values.content]);

  const title = values.seoTitle.trim() || values.title.trim() || "Untitled article";
  const description = values.seoDescription.trim() || values.excerpt.trim() || "No description yet.";
  const host = siteUrl ? new URL(siteUrl).host : "yourdomain.com";
  const urlPath = `${host} › blog › ${values.slug || "…"}`;

  return (
    <section aria-labelledby="seo-heading" className={`${card} space-y-6`}>
      <div>
        <h2 id="seo-heading" className="font-heading text-lg font-bold text-ink">
          SEO &amp; answer-readiness
        </h2>
        <p className="mt-1 text-sm text-slate">
          Practical checks on this article. They are guidance, not a score — good titles, clear answers and accurate facts matter more
          than any number.
        </p>
      </div>

      {findings.length === 0 ? (
        <p role="status" className="rounded-control bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          No issues found by these checks.
        </p>
      ) : (
        <ul className="space-y-2" aria-label="SEO findings">
          {findings.map((f) => (
            <li key={f.id} className="flex gap-2 text-sm text-ink">
              <span className={`mt-0.5 inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-semibold ring-1 ring-inset ${LEVEL[f.level].cls}`}>
                {LEVEL[f.level].label}
              </span>
              <span>{f.message}</span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="text-sm font-semibold text-ink">Search result preview</h3>
        <div className="mt-2 rounded-control border border-ink/15 bg-white p-4" aria-label="Search result preview">
          <p className="truncate text-xs text-slate">{urlPath}</p>
          <p className="mt-0.5 text-lg leading-snug text-[#1a0dab]">{clip(title, 60)}</p>
          <p className="mt-0.5 text-sm text-slate">{clip(description, 160)}</p>
        </div>
        {!siteUrl && (
          <p className="mt-1.5 text-xs text-slate">The production domain is not set yet, so the real URL is not known. Set NEXT_PUBLIC_SITE_URL before launch.</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Social share preview</h3>
        <div className="mt-2 overflow-hidden rounded-control border border-ink/15 bg-white">
          {coverSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-only preview
            <img src={coverSrc} alt="" className="aspect-[1.91/1] w-full object-cover" />
          ) : (
            <div className="flex aspect-[1.91/1] items-center justify-center bg-light text-xs text-slate">Default site image</div>
          )}
          <div className="border-t border-ink/10 p-3">
            <p className="text-xs uppercase tracking-wide text-slate">{host}</p>
            <p className="font-semibold text-ink">{clip(title, 70)}</p>
            <p className="text-sm text-slate">{clip(description, 110)}</p>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-slate">
          Uploaded covers are used as the social image for {siteName}; otherwise the site-wide image is shown.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Heading outline</h3>
        {heads.length === 0 ? (
          <p className="mt-1 text-sm text-slate">No headings yet. Add ## sections to build the table of contents.</p>
        ) : (
          <ol className="mt-2 space-y-1 text-sm" aria-label="Heading outline">
            {heads.map((h, i) => (
              <li key={`${h.text}-${i}`} style={{ paddingLeft: `${Math.max(0, h.level - 2) * 1}rem` }} className="text-ink">
                <span className="mr-1.5 rounded bg-light px-1 text-xs font-semibold text-slate">H{h.level === 1 ? "2*" : h.level}</span>
                {h.text}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
