import { MapPin } from "lucide-react";
import { business } from "@/config/business";
import { CtaLink } from "@/components/ui/CtaLink";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SECTION } from "@/lib/site";

/**
 * Only rendered once the business confirms real destinations in src/config/business.ts.
 * With an empty list this section does not exist.
 */
export function DestinationsSection() {
  const { destinations } = business;
  if (destinations.length === 0) return null;

  return (
    <section id={SECTION.destinations} aria-labelledby="destinations-title" className="surface-light section-y">
      <div className="container-x">
        <Reveal>
          <SectionHeading
            id="destinations-title"
            eyebrow="Destinations"
            title="Where would you like to go?"
            tone="light"
          />
        </Reveal>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((d, i) => (
            <Reveal as="li" key={d.name} delay={(i % 3) * 80}>
              <article className="lift h-full rounded-xl border border-ink/12 bg-white p-6">
                <MapPin aria-hidden="true" className="size-5 text-ink" />
                <h3 className="mt-3 font-heading text-xl font-bold text-ink">{d.name}</h3>
                <p className="mt-2 text-ink/75">{d.description}</p>
              </article>
            </Reveal>
          ))}
        </ul>
        <div className="mt-8">
          <CtaLink kind="whatsapp" topic="a trip" variant="dark" className="w-full sm:w-auto">
            Plan Your Trip
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
