"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import sideCutout from "@/assets/images/cutout-side.png";
import frontCutout from "@/assets/images/cutout-front.png";
import rearCutout from "@/assets/images/cutout-rear.png";
import threeQuarter from "@/assets/images/hero.jpg";

interface Slide {
  src: StaticImageData;
  alt: string;
  caption: string;
  cutout?: boolean;
}

const slides: Slide[] = [
  {
    src: frontCutout,
    alt: "Front view of the grey Force Urbania with the OG Tours & Travels windscreen sticker",
    caption: "Front",
    cutout: true,
  },
  {
    src: threeQuarter,
    alt: "Grey Force Urbania parked on a road, front three-quarter view",
    caption: "On the road",
  },
  {
    src: rearCutout,
    alt: "Rear view of the grey Force Urbania with roof ladder and tail lights",
    caption: "Rear",
    cutout: true,
  },
  {
    src: sideCutout,
    alt: "Side profile of the grey Force Urbania with yellow stripes and stag graphic",
    caption: "Side profile",
    cutout: true,
  },
];

/** Swipe/keyboard filmstrip. Every image keeps its aspect ratio at a shared height, so the
    van is never cropped. The container is focusable (arrow keys) with explicit buttons too. */
export function VehicleGallery() {
  const scroller = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" });
  };

  const arrow =
    "inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-soft " +
    "transition-colors hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-white/25 disabled:hover:text-soft";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate">Swipe or use the arrows</p>
        <div className="flex gap-2">
          <button type="button" className={arrow} onClick={() => page(-1)} disabled={edge.start} aria-label="Previous photos">
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button type="button" className={arrow} onClick={() => page(1)} disabled={edge.end} aria-label="Next photos">
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <ul
        ref={scroller}
        onScroll={measure}
        tabIndex={0}
        role="list"
        aria-label="Force Urbania photo gallery"
        className="hide-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-1 sm:-mx-8 sm:scroll-px-8 sm:px-8"
      >
        {slides.map((slide) => (
          <li key={slide.caption} className="shrink-0 snap-start">
            <figure>
              <div className="flex h-[15rem] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 sm:h-[19rem] lg:h-[23rem]">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  loading="lazy"
                  quality={80}
                  sizes="(min-width: 1024px) 540px, (min-width: 640px) 440px, 320px"
                  className={`block h-full w-auto max-w-none ${slide.cutout ? "object-contain py-5" : "rounded-lg"}`}
                />
              </div>
              <figcaption className="mt-2.5 text-sm text-slate">{slide.caption}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
