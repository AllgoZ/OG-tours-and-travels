import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, Space_Grotesk } from "next/font/google";
import { business } from "@/config/business";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileContactBar } from "@/components/layout/MobileContactBar";
import { DevConfigNotice } from "@/components/layout/DevConfigNotice";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { StructuredData } from "@/components/seo/StructuredData";
import { SITE_DESCRIPTION, SITE_TITLE, getSiteUrl } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  // Falls back to localhost only so relative OG image URLs resolve locally; the launch
  // check (npm run check:launch) fails until the real domain is configured.
  metadataBase: new URL(siteUrl ?? "http://localhost:3000"),
  title: { default: SITE_TITLE, template: `%s | ${business.displayName}` },
  description: SITE_DESCRIPTION,
  applicationName: business.displayName,
  alternates: siteUrl ? { canonical: "/" } : undefined,
  openGraph: {
    type: "website",
    siteName: business.displayName,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_IN",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "OG Tours and Travels — Force Urbania group travel and vehicle hire",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og.jpg"],
  },
  // Until a production domain is configured, keep staging/preview deployments out of search.
  robots: siteUrl
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } }
    : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // enables env(safe-area-inset-*) for the mobile contact bar
  themeColor: "#10141B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${inter.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[80] rounded-control bg-lime px-4 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Skip to main content
        </a>
        <ScrollProgress />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <MobileContactBar />
        <StructuredData />
        <DevConfigNotice />
      </body>
    </html>
  );
}
