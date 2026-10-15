import Image from "next/image";
import { business } from "@/config/business";
import { CtaLink } from "@/components/ui/CtaLink";
import { Reveal } from "@/components/ui/Reveal";
import { SECTION } from "@/lib/site";
import { VehicleGallery } from "./VehicleGallery";
import sideCutout from "@/assets/images/cutout-side.png";

export function VehicleShowcase() {
  const { specs, name } = business.vehicle;

  return (
    <section
      id={SECTION.vehicle}
      aria-labelledby="vehicle-title"
      className="surface-dark section-y overflow-hidden"
    >
      <div className="container-x">
        <div className="grid gap-x-12 gap-y-8 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-6">
            <h2 id="vehicle-title" className="text-display text-ink">
              Made for <span className="font-serif-accent italic text-accent-deep">the journey.</span>
            </h2>
            <p className="text-lead mt-6 max-w-lg text-slate">
              A vehicle designed for bringing people together, with every trip planned around your
              travel needs.
            </p>

            {specs.length > 0 ? (
              <dl className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 border-t border-ink/12 pt-6">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt className="text-sm text-slate">{spec.label}</dt>
                    <dd className="font-heading font-semibold text-ink">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-8">
              <CtaLink kind="whatsapp" topic={`the ${name}`}>
                Ask About This Vehicle
              </CtaLink>
            </div>
          </Reveal>

          {/* Large side profile, contained so the whole vehicle is always visible */}
          <Reveal clip className="lg:col-span-6" delay={100}>
            <Image
              src={sideCutout}
              alt="Grey Force Urbania side profile"
              loading="lazy"
              quality={82}
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="h-auto w-full object-contain drop-shadow-[0_25px_50px_rgba(33,56,67,0.22)]"
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
