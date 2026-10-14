/**
 * SINGLE SOURCE OF TRUTH for business details.
 *
 * Every value marked "CONFIRM" is unknown at build time and is deliberately left empty
 * (null / []). Nothing here is invented. Components and structured data only render what
 * is filled in, and no contact link is ever produced from an empty value.
 *
 * Contact values may be set here OR through environment variables (handy on hosting
 * dashboards): NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_PHONE, NEXT_PUBLIC_WHATSAPP,
 * NEXT_PUBLIC_EMAIL. See README.md and LAUNCH-CHECKLIST.md.
 *
 * Keep this file free of imports and TS-only syntax beyond type annotations so that
 * scripts/check-launch.mjs can load it directly with Node.
 */

// NOTE: Next.js only inlines *literal* process.env.NEXT_PUBLIC_* references into client
// bundles, so each variable is read by name below (not through a dynamic key).
const clean = (value: string | undefined): string | null => {
  const v = value?.trim();
  return v ? v : null;
};

export interface Service {
  id: string;
  title: string;
  description: string;
  /** Set to false to hide a service the owner has not confirmed. */
  enabled: boolean;
}

export interface Destination {
  name: string;
  description: string;
}

export interface VehicleSpec {
  label: string;
  value: string;
}

export interface Review {
  author: string;
  /** 1–5 */
  rating: number;
  text: string;
  date?: string;
  /** Only verified (genuine) reviews are shown in production. */
  verified?: boolean;
}

export const business = {
  name: "OG TOURS AND TRAVELS",
  displayName: "OG Tours and Travels",
  tagline: "Premium group travel",

  /** CONFIRM — production domain, e.g. "https://www.example.com" (no trailing slash). */
  siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL),

  // Confirmed by the owner (visible on the vehicle). Env vars may override for staging.
  /** Call number. tel:+918124012407 */
  phone: clean(process.env.NEXT_PUBLIC_PHONE) ?? "+918124012407",
  /** WhatsApp number (separate from the call number). https://wa.me/919159541288 */
  whatsapp: clean(process.env.NEXT_PUBLIC_WHATSAPP) ?? "+919159541288",
  /** CONFIRM (optional). */
  email: clean(process.env.NEXT_PUBLIC_EMAIL),

  /** CONFIRM (optional) — postal address; only used when all of these are filled. */
  address: null as null | {
    street: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string; // ISO 3166-1 alpha-2, e.g. "IN"
  },

  /** CONFIRM — human-readable service area for the footer, e.g. "Chennai and nearby cities". */
  serviceArea: null as string | null,
  /** CONFIRM — list of areas for structured data (areaServed). */
  areaServed: [] as string[],

  /** CONFIRM (optional) — full URLs. */
  socials: {
    instagram: null as string | null,
    facebook: null as string | null,
    youtube: null as string | null,
  },
  /** CONFIRM (optional) — Google Business Profile / Maps listing URL. */
  googleBusinessProfileUrl: null as string | null,

  vehicle: {
    name: "Force Urbania",
    /** Registration visible in the supplied photographs. */
    registration: "TN94 X 8971",
    /**
     * CONFIRM — add only owner-verified specifications, e.g.
     * { label: "Seating", value: "…" }. Left empty on purpose: nothing is invented.
     */
    specs: [] as VehicleSpec[],
  },

  /** The four services from the brief. Disable any the client has not confirmed. */
  services: [
    {
      id: "outstation",
      title: "Outstation Trips",
      description: "Plan comfortable journeys to destinations beyond your city.",
      enabled: true,
    },
    {
      id: "family-group",
      title: "Family & Group Travel",
      description:
        "Travel together with space for your group and luggage, subject to vehicle capacity.",
      enabled: true,
    },
    {
      id: "airport",
      title: "Airport Transfers",
      description: "Arrange convenient transfers to and from the airport.",
      enabled: true,
    },
    {
      id: "events-corporate",
      title: "Events & Corporate Travel",
      description: "Coordinate transport for functions, celebrations, and business travel.",
      enabled: true,
    },
  ] as Service[],

  /**
   * CONFIRM — destinations the business really serves. While this list is empty the
   * "Destinations" section is not rendered at all.
   */
  destinations: [] as Destination[],

  /**
   * Google reviews shown in the scrolling reviews section.
   *
   * IMPORTANT — do NOT invent reviews. Paste only GENUINE reviews here and set
   * `verified: true` on each real one. Only verified reviews appear in production; the
   * sample entries below (verified: false) show in `npm run dev` so you can preview the
   * scroll, and never appear on the live site. The section is hidden when there is nothing
   * verified to show.
   */
  reviews: [
    {
      author: "Sample review",
      rating: 5,
      text: "Replace this with a real Google review. Add genuine reviews to `reviews` in src/config/business.ts and set verified: true.",
      verified: false,
    },
    {
      author: "Sample review",
      rating: 5,
      text: "Only reviews marked verified: true are shown on the live site — these samples are for previewing the layout in development.",
      verified: false,
    },
    {
      author: "Sample review",
      rating: 4,
      text: "Keep the wording exactly as the customer left it on Google, and link the section to your Google reviews page.",
      verified: false,
    },
  ] as Review[],

  /** CONFIRM — Privacy Policy last-updated date shown on /privacy (ISO date). */
  privacyUpdated: null as string | null,

  /** Blog authorship/publisher defaults (used for metadata and JSON-LD). */
  blog: {
    defaultAuthor: "OG Tours and Travels",
    postsPerPage: 6,
  },
};

export type Business = typeof business;
