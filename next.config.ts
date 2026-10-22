import type { NextConfig } from "next";
import { coverRemotePattern } from "./src/lib/covers";

// Uploaded blog covers are served from the public Supabase Storage bucket; allow exactly that path
// (and nothing else) through the Next image optimiser.
const coverPattern = coverRemotePattern(process.env.NEXT_PUBLIC_SUPABASE_URL);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Required allow-list of image qualities (Next.js 16).
    qualities: [70, 75, 80],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    ...(coverPattern ? { remotePatterns: [coverPattern] } : {}),
  },
  async headers() {
    return [
      {
        // The CMS must never be cached, indexed, framed or leak its URLs via Referer.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
