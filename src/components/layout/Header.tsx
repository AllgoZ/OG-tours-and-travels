"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MessageCircle, Menu, X } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { CtaLink } from "@/components/ui/CtaLink";
import { buildEnquiryMessage, hasWhatsApp, whatsappHref } from "@/lib/enquiry";
import { NAV_LINKS, SECTION } from "@/lib/site";
import { MobileNavigation } from "./MobileNavigation";

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("top");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track the section in view (home only).
  useEffect(() => {
    if (!isHome) return;
    const ids = [SECTION.top, SECTION.vehicle, SECTION.services, SECTION.contact];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0 || !("IntersectionObserver" in window)) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const current = elements.find((el) => visible.has(el.id));
        if (current) setActive(current.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0, 0.01, 1] },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu(true);
    };
    const mq = window.matchMedia("(min-width: 64rem)");
    const onChange = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
    };
  }, [open, closeMenu]);

  const isActive = (match: string) =>
    match === "blog-route" ? pathname.startsWith("/blog") : isHome && active === match;

  const solid = scrolled || open || !isHome;
  const waLink = whatsappHref(buildEnquiryMessage({}));

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          solid ? "border-b border-white/10 bg-midnight/90 backdrop-blur-md" : "border-b border-transparent"
        }`}
      >
      <div className="container-x flex h-[4.5rem] items-center justify-between gap-3 lg:h-[4.75rem]">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5"
          aria-label="OG Tours and Travels, home"
          onClick={() => closeMenu()}
        >
          <LogoMark className="size-9 lg:size-10" />
          <Wordmark />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const act = isActive(link.match);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={act ? "page" : undefined}
                    className={`relative inline-flex min-h-11 items-center px-3.5 text-[0.9rem] font-medium transition-colors ${
                      act ? "text-soft" : "text-slate hover:text-soft"
                    }`}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3.5 bottom-1.5 h-px origin-left bg-lime transition-transform duration-300 ${
                        act ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <CtaLink kind="whatsapp" size="md">
              Enquire
            </CtaLink>
          </div>

          {hasWhatsApp && waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Enquire on WhatsApp (opens in a new tab)"
              className="inline-flex size-11 items-center justify-center rounded-control bg-lime text-ink transition-colors hover:bg-[#d4ff82] active:scale-95 lg:hidden"
            >
              <MessageCircle aria-hidden="true" className="size-5" />
            </a>
          )}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex size-11 items-center justify-center rounded-control border border-white/15 text-soft transition-colors hover:border-white/40 lg:hidden"
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </div>
      </header>

      {/* Rendered as a sibling of <header> (not inside it) so the header's backdrop-filter
          doesn't become the menu's containing block and collapse its height. */}
      <MobileNavigation id={menuId} open={open} isActive={isActive} onNavigate={() => closeMenu()} />
    </>
  );
}
