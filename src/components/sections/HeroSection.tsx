import { Fragment } from "react";
import Image from "next/image";
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
      className="surface-night relative overflow-hidden"
    >
      {/* soft amber glow behind the composition */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-1/4 top-0 h-[70%] w-[70%] rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(245,181,10,0.16), transparent 68%)" }}
      />

      <div className="container-x relative pt-28 pb-16 sm:pt-32 lg:min-h-[calc(100dvh-4.75rem)] lg:pt-40 lg:pb-20">
        <p
          className="text-eyebrow anim-fade-up flex items-center gap-3 text-slate"
          style={{ "--delay": "0ms" } as React.CSSProperties}
        >
          <span aria-hidden="true" className="h-px w-10 bg-coral" />
          {business.name} / Private Group Mobility
        </p>

        {/* Each word is its own span for the staggered reveal; a literal space between them
            keeps the accessible name and text content correctly spaced. */}
        <h1 id="hero-title" className="text-hero reveal-words relative z-10 mt-7 text-ink">
          {HEADLINE.map((word, i) => (
            <Fragment key={word}>
              <span className="inline-block">
                <span className="word" style={{ "--delay": `${120 + i * 85}ms` } as React.CSSProperties}>
                  {i === HEADLINE.length - 1 ? <span className="text-accent-deep">{word}</span> : word}
                </span>
              </span>
              {i < HEADLINE.length - 1 ? " " : null}
            </Fragment>
          ))}
        </h1>

        {/* Vehicle — single transparent cut-out. It drives in from the left on load (silent);
            clicking/tapping it replays the drive-in with the engine + honk sound (a click is a
            user gesture, so audio is allowed). Reduced-motion/no-JS: shown in place.
            Full-width on mobile, bleeding right on desktop; sits behind the headline so the
            type always reads. */}
        <HeroSound />
        <div
          id="hero-vehicle"
          className="anim-drive relative z-0 mt-6 cursor-pointer lg:absolute lg:inset-y-0 lg:right-[-6%] lg:mt-0 lg:flex lg:w-[58%] lg:items-center"
        >
          <Image
            src={sideCutout}
            alt="OG Tours and Travels' grey Force Urbania with yellow side stripes"
            preload
            fetchPriority="high"
            quality={80}
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="h-auto w-full drop-shadow-[0_30px_50px_rgba(4,20,32,0.45)]"
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
            <a href={`#${SECTION.enquire}`} className={buttonClass("accent", "lg", "w-full sm:w-auto")}>
              Plan Your Trip
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
