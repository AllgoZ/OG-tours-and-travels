import Image from "next/image";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SECTION } from "@/lib/site";
import detail from "@/assets/images/front-detail.jpg";

const benefits = [
  {
    n: "01",
    title: "A convenient enquiry process",
    text: "Message or call and share your plan. No accounts, no lengthy booking funnels.",
  },
  {
    n: "02",
    title: "Your whole group in one vehicle",
    text: "Travel together on one journey instead of splitting across several cars.",
  },
  {
    n: "03",
    title: "Trip details discussed directly",
    text: "Timings, pickup points, route and the final quote are confirmed with you.",
  },
  {
    n: "04",
    title: "Arrangements tailored to your journey",
    text: "Tell us what the trip needs and we plan around it, within the vehicle's capacity.",
  },
];

export function BenefitsSection() {
  return (
    <section
      id={SECTION.whyUs}
      aria-labelledby="why-title"
      className="grain surface-graphite section-y overflow-hidden"
    >
      <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionHeading
              id="why-title"
              eyebrow="Why travel with OG"
              title="The easy way to move a group"
              intro="A straightforward way to plan group travel: tell us what you need and deal with us directly."
            />
          </Reveal>
          <Reveal clip className="mt-10 hidden lg:block" delay={120}>
            <Image
              src={detail}
              alt="Close detail of the Force Urbania front grille and registration plate"
              loading="lazy"
              quality={78}
              sizes="40vw"
              className="h-auto w-full rounded-xl border border-white/10 object-cover"
            />
          </Reveal>
        </div>

        <ul className="lg:col-span-7">
          {benefits.map((b, i) => (
            <Reveal as="li" key={b.n} delay={(i % 2) * 90} className="border-t border-white/12 py-7 first:border-t-0 first:pt-0">
              <div className="flex gap-5">
                <span className="font-heading text-sm font-semibold text-lime">{b.n}</span>
                <div>
                  <h3 className="text-h3 text-soft">{b.title}</h3>
                  <p className="mt-2 max-w-md text-slate">{b.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
