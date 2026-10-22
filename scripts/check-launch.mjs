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

// Blog source: Supabase (default) or the Markdown rollback source.
const blogSource = process.env.BLOG_SOURCE ?? "supabase";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// What the PUBLIC site can see right now (same view the build gets): published posts only.
let publicPosts = null;
let publicPostsError = null;
if (blogSource === "supabase" && supabaseConfigured) {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/blog_posts?select=slug`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    publicPosts = (await res.json()).length;
  } catch (err) {
    publicPostsError = err.message;
  }
}

// Posts still awaiting business review: from the database when an admin DATABASE_URL is available
// (RLS hides them from the public key), else from the Markdown files.
let postsToReview = 0;
let totalPosts = 0;
let reviewSource = "Markdown files";
let adminCount = null; // CMS administrators provisioned (needs DATABASE_URL)
if (blogSource === "supabase" && process.env.DATABASE_URL) {
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const r = await client.query("select count(*)::int total, count(*) filter (where review_status <> 'approved' or draft)::int pending from public.blog_posts");
    adminCount = (await client.query("select count(*)::int c from public.admin_users")).rows[0].c;
    await client.end();
    totalPosts = r.rows[0].total;
    postsToReview = r.rows[0].pending;
    reviewSource = "database";
  } catch {
    reviewSource = "database unreachable";
  }
}
const blogDir = path.resolve("content/blog");
if (reviewSource === "Markdown files" && fs.existsSync(blogDir)) {
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
  {
    required: blogSource === "supabase",
    label: "Supabase blog configured (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), or BLOG_SOURCE=markdown",
    ok: blogSource === "markdown" || supabaseConfigured,
  },
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
  {
    required: false,
    label: `Google Tag Manager container (analytics.gtmId${business.analytics.gtmId ? `: ${business.analytics.gtmId}` : ""})`,
    ok: /^GTM-[A-Z0-9]{4,12}$/.test(business.analytics.gtmId ?? ""),
    note: "No valid GTM container configured; the site loads no analytics. Check NEXT_PUBLIC_GTM_ID.",
  },
  { required: false, label: "Privacy policy last-updated date (privacyUpdated)", ok: Boolean(business.privacyUpdated) },
  {
    required: false,
    label: "Services confirmed by the owner (services[].enabled)",
    ok: false,
    note: "Review the 4 services; set enabled:false for any not offered.",
  },
  {
    required: false,
    label: `Blog articles reviewed (${postsToReview} of ${totalPosts} still pending review or draft — ${reviewSource})`,
    ok: postsToReview === 0 && totalPosts > 0,
    note:
      blogSource === "supabase"
        ? "Review each article, then in the CMS (/admin) record the owner's sign-off and publish it. Only approved, published posts are public."
        : "Review each starter article; set reviewStatus: approved in its frontmatter once signed off.",
  },
  ...(adminCount === null
    ? []
    : [
        {
          required: false,
          label: `CMS administrator provisioned (${adminCount} in admin_users)`,
          ok: adminCount > 0,
          note: "Create a Supabase Auth user, then run: npm run admin:users -- grant <email> (see docs/admin-cms.md).",
        },
      ]),
  ...(blogSource === "supabase" && supabaseConfigured
    ? [
        {
          required: false,
          label: publicPostsError
            ? `Supabase blog reachable with the public key (FAILED: ${publicPostsError})`
            : `Articles publicly visible to the build: ${publicPosts}`,
          ok: publicPostsError ? false : publicPosts > 0,
          note: publicPostsError
            ? "Check the project URL/key and that supabase/migrations/001_create_blog_posts.sql has been applied (npm run db:migrate)."
            : "No approved article is public yet: /blog stays noindex and out of the sitemap until at least one is approved.",
        },
      ]
    : []),
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
