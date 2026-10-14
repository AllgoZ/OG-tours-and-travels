"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { buildEnquiryMessage, hasPhone, hasWhatsApp, telHref, whatsappHref } from "@/lib/enquiry";

/**
 * Fixed bottom Call / WhatsApp bar, mobile breakpoints only. Renders only the actions that
 * are configured. Steps out of the way while a form field is focused so it never collides
 * with the on-screen keyboard.
 */
export function MobileContactBar() {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = () => setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  const tel = telHref();
  const wa = whatsappHref(buildEnquiryMessage({}));
  if (!(hasPhone || hasWhatsApp)) return null;

  return (
    <div
      role="region"
      aria-label="Quick contact"
      data-hidden={typing}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-midnight/95 px-3 pt-2.5 backdrop-blur-md transition-transform duration-200 data-[hidden=true]:translate-y-full md:hidden"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className={`mx-auto grid max-w-lg gap-2.5 ${tel && wa ? "grid-cols-2" : "grid-cols-1"}`}>
        {tel && (
          <a
            href={tel}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-white/25 text-sm font-semibold uppercase tracking-[0.04em] text-soft active:bg-white/10"
          >
            <Phone aria-hidden="true" className="size-[1.1em]" />
            Call Now
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-lime text-sm font-semibold uppercase tracking-[0.04em] text-ink active:brightness-95"
          >
            <MessageCircle aria-hidden="true" className="size-[1.1em]" />
            WhatsApp
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </div>
  );
}
