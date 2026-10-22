import type { Metadata } from "next";

// The CMS is never indexed (also enforced by the X-Robots-Tag header in next.config.ts and robots.txt).
export const metadata: Metadata = {
  title: { absolute: "OG Tours and Travels · Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-light text-ink">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-control bg-accent px-4 py-3 font-semibold text-navy focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      {children}
    </div>
  );
}
