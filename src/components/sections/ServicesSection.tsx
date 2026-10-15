import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { business } from "@/config/business";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buildTopicMessage, hasWhatsApp, whatsappHref } from "@/lib/enquiry";
import { SECTION } from "@/lib/site";

// Related reading per service (internal links help both users and SEO).
const relatedArticle: Record<string, { slug: string; label: string }> = {
  outstation: { slug: "plan-group-road-trip-tamil-nadu", label: "Read: planning a group road trip" },
  "family-group": { slug: "family-outstation-trip-checklist", label: "Read: family outstation checklist" },
  airport: { slug: "road-trip-with-multiple-passengers", label: "Read: travelling with a big group" },
  "events-corporate": { slug: "group-transport-weddings-events", label: "Read: transport for weddings & events" },
};

export function ServicesSection() {
  const services = business.services.filter((s) => s.enabled);
  if (services.length === 0) return null;

  return (
    <section id={SECTION.services} aria-labelledby="services-title" className="surface-light section-y">
      <div className="container-x">
        <Reveal>
          <SectionHeading
            id="services-title"
            title="Travel solutions for every occasion"
            tone="light"
          />
        </Reveal>

        <ul className="mt-12 border-t border-ink/12">
          {services.map((service, i) => {
            const href = hasWhatsApp ? whatsappHref(buildTopicMessage(service.title.toLowerCase())) : null;
            const article = relatedArticle[service.id];
            return (
              <Reveal as="li" key={service.id} delay={i * 60}>
                <div className="group relative grid gap-4 border-b border-ink/12 py-8 md:grid-cols-12 md:items-baseline md:gap-6">
                  <h3 className="font-heading text-2xl font-bold tracking-tight text-ink md:col-span-5 lg:text-[1.75rem]">
                    {service.title}
                  </h3>
                  <p className="text-ink/70 md:col-span-5">{service.description}</p>
                  <div className="flex flex-col gap-2 md:col-span-2 md:items-end">
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink"
                      >
                        Enquire
                        <span className="sr-only"> about {service.title} (opens WhatsApp in a new tab)</span>
                        <ArrowUpRight aria-hidden="true" className="arrow-slide size-4" />
                      </a>
                    )}
                    {article && (
                      <Link
                        href={`/blog/${article.slug}`}
                        className="inline-flex min-h-9 items-center text-xs font-medium text-ink/70 underline underline-offset-2 hover:text-ink"
                      >
                        {article.label}
                      </Link>
                    )}
                  </div>
                  {/* accent underline on hover */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-0.5 origin-left scale-x-0 bg-coral transition-transform duration-500 group-hover:scale-x-100"
                  />
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
