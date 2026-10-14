import Image from "next/image";
import { CtaLink } from "@/components/ui/CtaLink";
import { Reveal } from "@/components/ui/Reveal";
import { SECTION } from "@/lib/site";
import detail from "@/assets/images/front-detail.jpg";

export function FinalCTA() {
  return (
    <section
      id={SECTION.contact}
      aria-labelledby="cta-title"
      className="relative isolate overflow-hidden surface-dark"
    >
      <Image
        src={detail}
        alt=""
        aria-hidden="true"
        fill
        loading="lazy"
        quality={70}
        sizes="100vw"
        className="-z-10 object-cover object-[50%_42%] opacity-25"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-midnight/65" />
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-lime" />

      <div className="container-x py-20 sm:py-28 lg:py-36">
        <Reveal className="max-w-2xl">
          <p className="text-eyebrow flex items-center gap-3 text-slate">
            <span aria-hidden="true" className="h-px w-8 bg-lime" />
            Plan your trip
          </p>
          <h2 id="cta-title" className="text-display mt-5 text-soft">
            Where are you <span className="font-serif-accent italic text-lime">heading next?</span>
          </h2>
          <p className="text-lead mt-6 text-slate">
            Tell us about your trip. Let&apos;s plan your journey together.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <CtaLink kind="whatsapp" className="w-full sm:w-auto">
              Enquire on WhatsApp
            </CtaLink>
            <CtaLink kind="call" variant="outline-dark" className="w-full sm:w-auto">
              Call Us
            </CtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
