import { CtaLink } from "@/components/ui/CtaLink";
import { Reveal } from "@/components/ui/Reveal";
import { SECTION } from "@/lib/site";

export function FinalCTA() {
  return (
    <section
      id={SECTION.contact}
      aria-labelledby="cta-title"
      className="relative surface-night"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-coral" />

      <div className="container-x py-20 sm:py-28 lg:py-36">
        <Reveal className="max-w-2xl">
          <h2 id="cta-title" className="text-display text-ink">
            Where are you <span className="font-serif-accent italic text-accent-deep">heading next?</span>
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
