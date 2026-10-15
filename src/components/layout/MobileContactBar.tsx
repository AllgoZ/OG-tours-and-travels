"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { buildEnquiryMessage, hasPhone, hasWhatsApp, telHref, whatsappHref } from "@/lib/enquiry";

/**
 * Floating Call / WhatsApp buttons, mobile breakpoints only. Minimal icon-only FABs in the
 * bottom-right corner. Renders only the actions that are configured, and slides out of the
 * way while a form field is focused so it never collides with the on-screen keyboard.
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

  // The container spans the full width only to place the two FABs at opposite corners, so it
  // must not swallow clicks in its empty middle — only the buttons are interactive.
  const fab =
    "pointer-events-auto group-data-[hidden=true]:pointer-events-none inline-flex size-13 items-center " +
    "justify-center rounded-full shadow-[0_8px_24px_-6px_rgba(33,56,67,0.22)] transition-transform active:scale-95";

  return (
    <div
      role="region"
      aria-label="Quick contact"
      data-hidden={typing}
      className="group pointer-events-none fixed inset-x-4 z-40 flex items-center transition-[transform,opacity] duration-200 data-[hidden=true]:translate-y-6 data-[hidden=true]:opacity-0 md:hidden"
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {tel && (
        <a href={tel} aria-label="Call us" className={`${fab} border border-ink/15 bg-midnight text-ink active:bg-ink/10`}>
          <Phone aria-hidden="true" className="size-5" />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Enquire on WhatsApp (opens in a new tab)"
          className={`${fab} ml-auto bg-wa text-white active:brightness-95`}
        >
          <MessageCircle aria-hidden="true" className="size-6" />
        </a>
      )}
    </div>
  );
}
