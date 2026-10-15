import { business } from "@/config/business";

/** Strip formatting; accept only plausible international numbers (E.164-ish, 8–15 digits). */
function normalizeNumber(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

const phoneDigits = normalizeNumber(business.phone);
const whatsappDigits = normalizeNumber(business.whatsapp);

export const hasPhone = phoneDigits !== null;
export const hasWhatsApp = whatsappDigits !== null;

/** tel: link, or null when no valid phone number is configured. */
export function telHref(): string | null {
  return phoneDigits ? `tel:+${phoneDigits}` : null;
}

/** wa.me chat link with a URL-encoded message, or null when WhatsApp is not configured. */
export function whatsappHref(message?: string): string | null {
  if (!whatsappDigits) return null;
  const base = `https://wa.me/${whatsappDigits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Human-readable phone, grouped like +91 81240 12407. */
export function phoneDisplay(): string | null {
  if (!phoneDigits) return null;
  const m = phoneDigits.match(/^(\d{2})(\d{5})(\d{5})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]}` : (business.phone as string);
}

/** Human-readable WhatsApp number, grouped like +91 81108 11003. */
export function whatsappDisplay(): string | null {
  if (!whatsappDigits) return null;
  const m = whatsappDigits.match(/^(\d{2})(\d{5})(\d{5})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]}` : (business.whatsapp as string);
}

export interface TripDetails {
  pickup?: string;
  destination?: string;
  date?: string;
  time?: string;
  passengers?: string;
  requirements?: string;
}

const line = (label: string, value?: string) => `${label}: ${value?.trim() || ""}`.trimEnd();

/**
 * The standard trip enquiry message (v2 template). Unfilled fields are left blank for the
 * customer to complete. Optional `requirements` is omitted when empty.
 */
export function buildEnquiryMessage(trip: TripDetails = {}): string {
  const lines = [
    `Hello ${business.name}! I would like to enquire about a trip.`,
    "",
    line("Pickup Location", trip.pickup),
    line("Destination", trip.destination),
    line("Travel Date", trip.date),
    line("Pickup Time", trip.time),
    line("Number of Passengers", trip.passengers),
  ];
  if (trip.requirements?.trim()) lines.push(line("Additional Requirements", trip.requirements));
  lines.push("", "Please let me know the availability and total trip quotation.", "", "Thank you.");
  return lines.join("\n");
}

/** A short topical enquiry (e.g. the vehicle or a single service). */
export function buildTopicMessage(topic: string): string {
  return [
    `Hello ${business.name}! I would like to enquire about ${topic}.`,
    "",
    "Please let me know the availability and total trip quotation.",
    "",
    "Thank you.",
  ].join("\n");
}
