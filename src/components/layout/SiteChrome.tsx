import type { ReactNode } from "react";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileContactBar } from "@/components/layout/MobileContactBar";
import { DevConfigNotice } from "@/components/layout/DevConfigNotice";
import { StructuredData } from "@/components/seo/StructuredData";

/** Public marketing chrome. Wrapped around every public page; deliberately NOT used by /admin. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <GoogleTagManager />
      <a
        href="#main"
        className="sr-only z-[80] rounded-control bg-accent px-4 py-3 font-semibold text-navy focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <MobileContactBar />
      <StructuredData />
      <DevConfigNotice />
    </>
  );
}
