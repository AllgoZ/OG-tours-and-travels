"use client";

import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms. */
  delay?: number;
  /** Use a clip-path (mask) reveal instead of the default translate. */
  clip?: boolean;
  as?: "div" | "li" | "article" | "section" | "figure";
}

/**
 * Once-only scroll reveal. Content is fully visible in the server-rendered HTML; after
 * hydration a single shared IntersectionObserver reveals elements as they enter view.
 *
 * No per-element getBoundingClientRect (avoids layout thrash during hydration) and one
 * observer for the whole page. An element only hides if the observer reports it off-screen
 * on first sight — and since that happens below the fold, there is no visible flash.
 * Transform/opacity/clip-path only (no layout shift); reduced-motion disables it entirely.
 */

type RevealEl = HTMLElement & { _revealSeen?: boolean };
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        const el = entry.target as RevealEl;
        if (entry.isIntersecting) {
          el.dataset.reveal = "shown";
          obs.unobserve(el);
        } else if (!el._revealSeen) {
          // First sighting and off-screen → hide so it can animate in on scroll.
          el.dataset.reveal = "hidden";
        }
        el._revealSeen = true;
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  return observer;
}

export function Reveal({ children, className = "", delay = 0, clip = false, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = getObserver();
    if (!obs) return;
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);

  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      className={`${clip ? "reveal reveal-clip" : "reveal"} ${className}`}
      style={delay ? ({ "--delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
