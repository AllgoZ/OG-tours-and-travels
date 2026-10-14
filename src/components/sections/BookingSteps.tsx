import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SECTION } from "@/lib/site";
import { TripEnquiryForm } from "./TripEnquiryForm";

const steps = [
  { n: "01", title: "Share your journey details", text: "Pickup, destination, travel date, time and passenger count." },
  { n: "02", title: "Discuss availability & pricing", text: "We confirm availability and share a trip quotation." },
  { n: "03", title: "Confirm your trip", text: "Finalise the booking directly with OG Tours and Travels." },
];

export function BookingSteps() {
  return (
    <section id={SECTION.enquire} aria-labelledby="how-title" className="surface-light section-y">
      <div className="container-x">
        <Reveal>
          <SectionHeading
            id="how-title"
            eyebrow="How it works"
            title="Plan your trip in three steps"
            tone="light"
          />
        </Reveal>

        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 90} className="border-t border-ink/15 pt-5">
              <span aria-hidden="true" className="font-heading text-4xl font-bold text-ink/55">{step.n}</span>
              <h3 className="mt-3 font-heading text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-ink/75">{step.text}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-12" delay={60}>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-4">
              <h3 className="font-heading text-2xl font-bold text-ink">Send your enquiry</h3>
              <p className="mt-3 text-ink/70">
                Fill in your trip and we&apos;ll open WhatsApp with everything prefilled. We only
                receive it once you press Send — and nothing here checks live availability.
              </p>
            </div>
            <div className="lg:col-span-8">
              <TripEnquiryForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
