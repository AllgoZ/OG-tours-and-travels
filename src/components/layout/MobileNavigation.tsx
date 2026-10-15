"use client";

import Link from "next/link";
import { CtaLink } from "@/components/ui/CtaLink";
import { phoneDisplay, telHref, whatsappDisplay } from "@/lib/enquiry";
import { NAV_LINKS } from "@/lib/site";

interface MobileNavigationProps {
  id: string;
  open: boolean;
  isActive: (match: string) => boolean;
  onNavigate: () => void;
}

/**
 * Mobile menu as a solid drawer that slides in from the right, over a dimmed scrim.
 * `inert` + pointer-events disabled when closed, so it is out of the tab order and the
 * a11y tree. Items reveal with a small stagger once open.
 */
export function MobileNavigation({ id, open, isActive, onNavigate }: MobileNavigationProps) {
  const tel = telHref();
  return (
    <div
      id={id}
      inert={!open}
      className={`fixed inset-0 top-[4.5rem] z-[45] overflow-hidden lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      {/* Scrim — redundant tap-to-close; the header close button and Escape are the
          accessible close paths, so this is hidden from assistive tech. */}
      <div
        aria-hidden="true"
        onClick={onNavigate}
        className={`absolute inset-0 bg-ink/35 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* Drawer panel */}
      <div
        className={`absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col border-l border-ink/10 bg-graphite shadow-[-24px_0_60px_-20px_rgba(33,56,67,0.22)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav
          aria-label="Mobile"
          className="grid h-full grid-rows-[1fr_auto] overflow-y-auto px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link, i) => (
              <li key={link.href} className="border-b border-ink/10">
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={isActive(link.match) ? "page" : undefined}
                  style={{ transitionDelay: open ? `${120 + i * 55}ms` : "0ms" }}
                  className={`flex min-h-16 items-center gap-4 text-2xl font-semibold tracking-tight transition-all duration-500 ${
                    open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  } ${isActive(link.match) ? "text-accent-deep" : "text-ink"}`}
                >
                  <span className="font-heading text-xs text-slate tabular-nums">0{i + 1}</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div
            style={{ transitionDelay: open ? "380ms" : "0ms" }}
            className={`flex flex-col gap-3 pt-6 transition-all duration-500 ${
              open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
            }`}
          >
            <CtaLink kind="whatsapp" size="lg" onClick={onNavigate} className="w-full">
              WhatsApp {whatsappDisplay()}
            </CtaLink>
            {tel && (
              <CtaLink kind="call" variant="outline-dark" size="lg" onClick={onNavigate} className="w-full">
                Call {phoneDisplay()}
              </CtaLink>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
