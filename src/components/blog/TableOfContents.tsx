"use client";

import { useEffect, useRef, useState } from "react";
import type { Heading } from "@/lib/blog";

/** Sticky table of contents with scroll-spy and a accent reading-progress bar. */
export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headings.length === 0) return;
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] },
    );
    els.forEach((el) => observer.observe(el));

    const article = document.getElementById("article-body");
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (article && progressRef.current) {
          const rect = article.getBoundingClientRect();
          const total = rect.height - window.innerHeight;
          const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
          progressRef.current.style.transform = `scaleX(${total > 0 ? scrolled / total : 0})`;
        }
        ticking = false;
      });
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <div className="sticky top-28">
        <p className="text-eyebrow text-slate">On this page</p>
        <div aria-hidden="true" className="mt-4 h-0.5 w-full overflow-hidden rounded bg-ink/10">
          <div ref={progressRef} className="h-full origin-left scale-x-0 bg-coral" />
        </div>
        <ul className="mt-4 space-y-2.5 text-sm">
          {headings.map((h) => (
            <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
              <a
                href={`#${h.id}`}
                className={`transition-colors ${activeId === h.id ? "text-accent-deep" : "text-slate hover:text-ink"}`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
