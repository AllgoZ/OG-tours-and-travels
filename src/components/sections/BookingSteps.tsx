import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SECTION } from "@/lib/site";
import { TripEnquiryForm } from "./TripEnquiryForm";

export function BookingSteps() {
  return (
    <section id={SECTION.enquire} aria-labelledby="enquire-title" className="surface-light section-y">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-4">
          <SectionHeading
            id="enquire-title"
            title="Plan your trip"
            intro="Share your trip details and we'll open WhatsApp with your message ready. Pricing and availability are confirmed with you directly."
            tone="light"
          />
        </Reveal>
        <Reveal className="lg:col-span-8" delay={80}>
          <TripEnquiryForm />
        </Reveal>
      </div>
    </section>
  );
}
