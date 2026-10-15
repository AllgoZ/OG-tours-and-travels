import { business } from "@/config/business";

export const SITE_TITLE = "OG Tours and Travels | Force Urbania Rental & Group Travel";
export const SITE_DESCRIPTION =
  "Looking for comfortable group travel or vehicle hire? Contact OG Tours and Travels to enquire about Force Urbania availability, trip details, and rental pricing.";

/** Validated, trailing-slash-free production URL, or null while it is unconfirmed. */
export function getSiteUrl(): string | null {
  const raw = business.siteUrl;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.origin + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Absolute URL for a path when the domain is known, else the path itself. */
export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  return base ? `${base}${path}` : path;
}

/** Section ids used for in-page navigation on the home page. */
export const SECTION = {
  top: "top",
  vehicle: "vehicle",
  services: "services",
  how: "how-it-works",
  enquire: "enquire",
  destinations: "destinations",
  blog: "latest-stories",
  faq: "faq",
  contact: "contact",
} as const;

/** Nav links. Home-page sections use "/#id"; Blog is a real route. */
export const NAV_LINKS = [
  { href: "/", label: "Home", match: "top" },
  { href: `/#${SECTION.vehicle}`, label: "Vehicle", match: SECTION.vehicle },
  { href: `/#${SECTION.services}`, label: "Services", match: SECTION.services },
  { href: "/blog", label: "Journal", match: "blog-route" },
  { href: `/#${SECTION.contact}`, label: "Contact", match: SECTION.contact },
] as const;
