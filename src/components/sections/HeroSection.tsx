import { Fragment } from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { buttonClass } from "@/components/ui/buttonStyles";
import { business } from "@/config/business";
import { SECTION } from "@/lib/site";
import { HeroSound } from "./HeroSound";
import sideCutout from "@/assets/images/cutout-side.png";

const HEADLINE = ["GO", "BEYOND", "THE", "ORDINARY."];

export function HeroSection() {
  return (
    <section
      id={SECTION.top}
      aria-labelledby="hero-title"
      className="grain surface-dark relative overflow-hidden"
    >
      {/* soft lime glow behind the composition */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 top-0 h-[70%] w-[70%] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(198,243,107,0.08), transparent 68%)" }}
      />

      <div className="container-x relative pt-28 pb-16 sm:pt-32 lg:min-h-[calc(100dvh-4.75rem)] lg:pt-40 lg:pb-20">
        <p
          className="text-eyebrow anim-fade-up flex items-center gap-3 text-slate"
          style={{ "--delay": "0ms" } as React.CSSProperties}
        >
          <span aria-hidden="true" className="h-px w-10 bg-lime" />
          {business.name} / Private Group Mobility
        </p>

        {/* Each word is its own span for the staggered reveal; a literal space between them
            keeps the accessible name and text content correctly spaced. */}
        <h1 id="hero-title" className="text-hero reveal-words relative z-10 mt-7 text-soft">
          {HEADLINE.map((word, i) => (
            <Fragment key={word}>
              <span className="inline-block">
                <span className="word" style={{ "--delay": `${120 + i * 85}ms` } as React.CSSProperties}>
                  {i === HEADLINE.length - 1 ? <span className="text-lime">{word}</span> : word}
                </span>
              </span>
              {i < HEADLINE.length - 1 ? " " : null}
            </Fragment>
          ))}
        </h1>

        {/* Vehicle — single transparent cut-out that drives in from the right on load.
            Full-width on mobile, bleeding right on desktop; sits behind the headline so
            the type always reads. */}
        <HeroSound />
        <div className="anim-drive relative z-0 mt-6 lg:absolute lg:inset-y-0 lg:right-[-6%] lg:mt-0 lg:flex lg:w-[58%] lg:items-center">
          <Image
            src={sideCutout}
            alt={`OG Tours and Travels' grey Force Urbania with yellow side stripes — registration ${business.vehicle.registration}`}
            preload
            fetchPriority="high"
            quality={80}
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="h-auto w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
          />
        </div>

        <div className="relative mt-8 max-w-xl lg:mt-16 lg:max-w-lg">
          <p className="text-lead anim-fade-up text-slate" style={{ "--delay": "480ms" } as React.CSSProperties}>
            Comfortable group travel, private vehicle hire, and journeys planned around you.
          </p>
          <div
            className="anim-fade-up mt-7 flex flex-col gap-3 sm:flex-row"
            style={{ "--delay": "560ms" } as React.CSSProperties}
          >
            <a href={`#${SECTION.enquire}`} className={buttonClass("lime", "lg", "w-full sm:w-auto")}>
              Plan Your Trip
            </a>
            <a href={`#${SECTION.vehicle}`} className={buttonClass("outline-dark", "lg", "w-full sm:w-auto")}>
              Explore the Vehicle
            </a>
          </div>
        </div>

        {/* bottom caption + scroll cue */}
        <div
          className="anim-fade-in relative mt-10 flex items-center justify-between lg:absolute lg:inset-x-0 lg:bottom-8 lg:mt-0 lg:px-8 xl:px-10"
          style={{ "--delay": "720ms" } as React.CSSProperties}
        >
          <p className="text-xs uppercase tracking-[0.18em] text-slate">
            Force Urbania · <span className="text-soft">{business.vehicle.registration}</span>
          </p>
          <a
            href={`#${SECTION.vehicle}`}
            className="hidden items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate transition-colors hover:text-lime lg:inline-flex"
          >
            Scroll
            <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/20">
              <ArrowDown aria-hidden="true" className="size-4" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
