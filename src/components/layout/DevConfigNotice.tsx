import { business } from "@/config/business";
import { hasPhone, hasWhatsApp } from "@/lib/enquiry";
import { getSiteUrl } from "@/lib/site";

/** Development-only reminder of unconfirmed business details. Never rendered in production. */
export function DevConfigNotice() {
  if (process.env.NODE_ENV === "production") return null;

  const missing = [
    !hasWhatsApp && "WhatsApp number",
    !hasPhone && "phone number",
    !getSiteUrl() && "site URL",
    !business.serviceArea && "service area",
  ].filter(Boolean);
  if (missing.length === 0) return null;

  return (
    <div className="fixed left-3 top-20 z-[70] hidden max-w-xs rounded-control border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 shadow-lg md:block">
      <strong>Dev notice:</strong> not configured in <code>src/config/business.ts</code>:{" "}
      {missing.join(", ")}.
    </div>
  );
}
