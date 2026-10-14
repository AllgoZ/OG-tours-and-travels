"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";

interface AccordionProps {
  items: { question: string; answer: string }[];
}

/**
 * Accessible accordion for a light surface. Real <button> headers with aria-expanded /
 * aria-controls, labelled region panels, closed panels `inert` (and kept in the DOM so
 * answers stay indexable). Items toggle independently.
 */
export function Accordion({ items }: AccordionProps) {
  const base = useId();
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="border-t border-ink/12">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        const buttonId = `${base}-btn-${i}`;
        const panelId = `${base}-panel-${i}`;
        return (
          <div key={item.question} className="border-b border-ink/12">
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className="flex min-h-16 w-full items-center justify-between gap-4 py-5 text-left font-heading text-lg font-semibold leading-snug text-ink transition-colors hover:text-ink/70"
              >
                {item.question}
                <Plus
                  aria-hidden="true"
                  className={`size-5 shrink-0 text-ink transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="collapsible"
              data-open={isOpen}
              inert={!isOpen}
            >
              <div>
                <p className="pb-6 pr-10 text-ink/70">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
