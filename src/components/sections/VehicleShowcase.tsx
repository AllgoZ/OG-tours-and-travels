import Image from "next/image";
import { business } from "@/config/business";
import { CtaLink } from "@/components/ui/CtaLink";
import { Reveal } from "@/components/ui/Reveal";
import { SECTION } from "@/lib/site";
import { VehicleGallery } from "./VehicleGallery";
import sideCutout from "@/assets/images/cutout-side.png";

export function VehicleShowcase() {
  const { specs, name, registration } = business.vehicle;

  return (
    <section
      id={SECTION.vehicle}
      aria-labelledby="vehicle-title"
      className="grain surface-dark section-y overflow-hidden"
    >
      <div className="container-x">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-6">
            <p className="text-eyebrow flex items-center gap-3 text-slate">
              <span aria-hidden="true" className="h-px w-8 bg-lime" />
              Our vehicle
            </p>
            <h2 id="vehicle-title" className="text-display mt-5 text-soft">
              Made for <span className="font-serif-accent italic text-lime">the journey.</span>
            </h2>
            <p className="text-lead mt-6 max-w-lg text-slate">
              A vehicle designed for bringing people together, with every trip planned around your
              travel needs.
            </p>

            {specs.length > 0 ? (
              <dl className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 border-t border-white/12 pt-6">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt className="text-sm text-slate">{spec.label}</dt>
                    <dd className="font-heading font-semibold text-soft">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-6 max-w-md text-slate/90">
                Want to know about seating, luggage space or facilities? Ask us and we&apos;ll
                confirm the details for your trip directly.
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <CtaLink kind="whatsapp" topic={`the ${name}`}>
                Ask About This Vehicle
              </CtaLink>
              <span className="text-xs uppercase tracking-[0.18em] text-slate">
                {name} · {registration}
              </span>
            </div>
          </Reveal>

          {/* Large side profile, contained so the whole vehicle is always visible */}
          <Reveal clip className="lg:col-span-6" delay={100}>
            <Image
              src={sideCutout}
              alt={`Grey Force Urbania side profile — registration ${registration}`}
              loading="lazy"
              quality={82}
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="h-auto w-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)]"
            />
          </Reveal>
        </div>

        <Reveal className="mt-12 lg:mt-16">
          <VehicleGallery />
        </Reveal>
      </div>
    </section>
  );
}
