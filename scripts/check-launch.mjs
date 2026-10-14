// Lists the business details that must be confirmed before launch.
//   npm run check:launch              -> prints the report
//   npm run check:launch -- --strict  -> exits 1 if a REQUIRED item is missing (use in CI/deploys)
//
// Loads src/config/business.ts directly (Node 22.18+/24 strips the type annotations).
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const { business } = await import(pathToFileURL(path.resolve("src/config/business.ts")).href);
const strict = process.argv.includes("--strict");

// Count blog posts still flagged for business review.
const blogDir = path.resolve("content/blog");
let postsToReview = 0;
let totalPosts = 0;
if (fs.existsSync(blogDir)) {
  for (const file of fs.readdirSync(blogDir).filter((f) => f.endsWith(".md") && f !== "README.md" && !f.startsWith("_"))) {
    totalPosts++;
    const raw = fs.readFileSync(path.join(blogDir, file), "utf8");
    if (/reviewStatus:\s*needs-business-review/.test(raw)) postsToReview++;
  }
}

const phoneOk = (v) => typeof v === "string" && /^[1-9]\d{7,14}$/.test(v.replace(/[^\d+]/g, "").replace(/^\+/, ""));
const urlOk = (v) => {
  try {
    return Boolean(v) && new URL(v).protocol.startsWith("http");
  } catch {
    return false;
  }
};

const checks = [
  { required: true, label: "Production domain (siteUrl / NEXT_PUBLIC_SITE_URL)", ok: urlOk(business.siteUrl) },
  { required: true, label: "WhatsApp number (whatsapp / NEXT_PUBLIC_WHATSAPP)", ok: phoneOk(business.whatsapp) },
  { required: false, label: "Phone number for Call buttons (phone / NEXT_PUBLIC_PHONE)", ok: phoneOk(business.phone) },
  { required: false, label: "Service area text for the footer (serviceArea)", ok: Boolean(business.serviceArea) },
  { required: false, label: "Service areas for structured data (areaServed)", ok: business.areaServed.length > 0 },
  { required: false, label: "Business address (address) — needed for local SEO", ok: Boolean(business.address) },
  { required: false, label: "Email (email)", ok: Boolean(business.email) },
  { required: false, label: "Google Business Profile URL (googleBusinessProfileUrl)", ok: Boolean(business.googleBusinessProfileUrl) },
  { required: false, label: "Social profile URLs (socials)", ok: Object.values(business.socials).some(Boolean) },
  { required: false, label: "Verified vehicle specifications (vehicle.specs)", ok: business.vehicle.specs.length > 0 },
  { required: false, label: "Confirmed destinations (destinations) — section stays hidden until set", ok: business.destinations.length > 0 },
  { required: false, label: "Privacy policy last-updated date (privacyUpdated)", ok: Boolean(business.privacyUpdated) },
  {
    required: false,
    label: "Services confirmed by the owner (services[].enabled)",
    ok: false,
    note: "Review the 4 services; set enabled:false for any not offered.",
  },
  {
    required: false,
    label: `Blog articles reviewed (${postsToReview} of ${totalPosts} still flagged needs-business-review)`,
    ok: postsToReview === 0 && totalPosts > 0,
    note: "Review each starter article; set reviewStatus: approved in its frontmatter once signed off.",
  },
  {
    required: false,
    label: "Real Google reviews (reviews[] with verified: true)",
    ok: business.reviews.some((r) => r.verified),
    note: "Paste genuine Google reviews and set verified: true; the reviews section is hidden until then. Do not invent reviews.",
  },
];

let blocking = 0;
console.log("\nOG TOURS AND TRAVELS — launch readiness\n");
for (const c of checks) {
  const mark = c.ok ? "✔" : c.required ? "✖" : "•";
  console.log(`${mark} ${c.required ? "[required]" : "[confirm] "} ${c.label}${c.ok || !c.note ? "" : `\n    ${c.note}`}`);
  if (!c.ok && c.required) blocking++;
}
console.log(
  blocking
    ? `\n${blocking} required item(s) missing.${strict ? " Failing (--strict)." : " Run with --strict to fail builds."}\n`
    : "\nAll required items are set. Review the [confirm] items with the owner.\n",
);
if (strict && blocking) process.exit(1);
