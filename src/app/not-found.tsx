import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { buttonClass } from "@/components/ui/buttonStyles";

// The root not-found renders outside app/(site)/layout.tsx, so it brings the public chrome itself.
export default function NotFound() {
  return (
    <SiteChrome>
      <div className="surface-dark flex min-h-[70vh] items-center">
        <div className="container-x py-24 text-center">
          <p className="text-eyebrow text-accent-deep">404</p>
          <h1 className="text-display mx-auto mt-5 max-w-xl text-ink">This page took a different route.</h1>
          <p className="text-lead mx-auto mt-5 max-w-md text-slate">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonClass("accent", "lg")}>
              Back Home
            </Link>
            <Link href="/blog" className={buttonClass("outline-dark", "lg")}>
              Read the Journal
            </Link>
          </div>
        </div>
      </div>
    </SiteChrome>
  );
}
