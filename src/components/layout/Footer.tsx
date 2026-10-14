import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { business } from "@/config/business";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { CtaLink } from "@/components/ui/CtaLink";
import { hasPhone, hasWhatsApp, phoneDisplay, telHref, whatsappDisplay, whatsappHref } from "@/lib/enquiry";
import { NAV_LINKS } from "@/lib/site";
import { CurrentYear } from "./CurrentYear";

export function Footer() {
  const tel = telHref();
  const wa = whatsappHref();
  const socials = Object.entries(business.socials).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  return (
    <footer className="grain surface-dark border-t border-white/10">
      <div className="container-x section-y pb-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <LogoMark className="size-10" />
              <Wordmark tone="light" />
            </div>
            <p className="mt-5 max-w-sm text-slate">
              Comfortable group travel and private vehicle hire for families, groups, events and
              corporate customers, aboard our Force Urbania.
            </p>
            {hasWhatsApp && (
              <div className="mt-6">
                <CtaLink kind="whatsapp" size="md">
                  Plan Your Trip
                </CtaLink>
              </div>
            )}
          </div>

          <nav aria-label="Footer" className="md:col-span-3">
            <h2 className="text-eyebrow text-slate">Explore</h2>
            <ul className="mt-5 space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center text-soft/90 transition-colors hover:text-lime"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className="text-eyebrow text-slate">Contact</h2>
            <ul className="mt-5 space-y-3 text-soft/90">
              {wa && (
                <li>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center hover:text-lime"
                  >
                    WhatsApp {whatsappDisplay()}
                  </a>
                </li>
              )}
              {tel && (
                <li>
                  <a href={tel} className="inline-flex min-h-11 items-center hover:text-lime">
                    Call {phoneDisplay()}
                  </a>
                </li>
              )}
              {business.email && (
                <li>
                  <a
                    href={`mailto:${business.email}`}
                    className="inline-flex min-h-11 items-center gap-2 hover:text-lime"
                  >
                    <Mail aria-hidden="true" className="size-4" />
                    {business.email}
                  </a>
                </li>
              )}
              {business.serviceArea && (
                <li className="flex gap-2">
                  <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0" />
                  <span>Service area: {business.serviceArea}</span>
                </li>
              )}
              {socials.map(([name, url]) => (
                <li key={name}>
                  <a
                    href={url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="inline-flex min-h-11 items-center capitalize hover:text-lime"
                  >
                    {name}
                  </a>
                </li>
              ))}
              {!hasPhone && !hasWhatsApp && !business.email && (
                <li className="text-slate">Contact details coming soon.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/10 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-sm text-slate sm:flex-row sm:items-center sm:justify-between md:pb-0">
          <p>
            © <CurrentYear /> {business.name}. All rights reserved.
          </p>
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-lime">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
