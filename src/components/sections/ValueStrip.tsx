import { CalendarClock, MessageCircle, Route, Users } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const items = [
  { icon: Users, title: "One vehicle, whole group", text: "Travel together instead of splitting across cars." },
  { icon: Route, title: "Local & outstation", text: "City runs, airport transfers and long trips." },
  { icon: MessageCircle, title: "Enquire in a tap", text: "WhatsApp or call — no forms, no accounts." },
  { icon: CalendarClock, title: "Planned around you", text: "Share your route and dates; we work to them." },
];

export function ValueStrip() {
  return (
    <section aria-label="Why travel with us" className="surface-light">
      <div className="container-x py-14 sm:py-16">
        <ul className="grid gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, text }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 70}
              className="lg:border-l lg:border-ink/10 lg:pl-6 lg:first:border-l-0 lg:first:pl-0"
            >
              <Icon aria-hidden="true" className="size-6 text-ink" />
              <h3 className="mt-4 font-heading text-base font-bold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-ink/75">{text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
