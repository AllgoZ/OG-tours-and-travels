import { Accordion } from "@/components/ui/Accordion";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { faqs } from "@/content/faq";
import { SECTION } from "@/lib/site";

export function FAQSection() {
  return (
    <section id={SECTION.faq} aria-labelledby="faq-title" className="surface-light section-y">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-4">
          <SectionHeading
            id="faq-title"
            title="Questions, answered"
            tone="light"
          />
        </Reveal>
        <Reveal className="lg:col-span-8" delay={80}>
          <Accordion items={faqs} />
        </Reveal>
      </div>
    </section>
  );
}
