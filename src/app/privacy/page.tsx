import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/config/business";
import { Breadcrumbs } from "@/components/blog/Breadcrumbs";
import { phoneDisplay, telHref, whatsappDisplay, whatsappHref } from "@/lib/enquiry";
import { getSiteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${business.displayName} handles information on this website.`,
  alternates: getSiteUrl() ? { canonical: "/privacy" } : undefined,
};

export default function PrivacyPage() {
  const tel = telHref();
  const wa = whatsappHref();
  return (
    <div className="surface-dark">
      <article className="container-x max-w-3xl pt-28 pb-24 sm:pt-32 lg:pt-36">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
        <p className="text-eyebrow mt-8 text-slate">Legal</p>
        <h1 className="text-display mt-4 text-ink">Privacy Policy</h1>
        {business.privacyUpdated && (
          <p className="mt-3 text-slate">Last updated: {business.privacyUpdated}</p>
        )}

        <div className="mt-10 space-y-8 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:text-slate [&_p]:mt-2 [&_p]:text-slate [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <section>
            <h2>Who we are</h2>
            <p>
              This website is operated by {business.name}, a tours, travels and vehicle rental
              business.
            </p>
          </section>

          <section>
            <h2>What this website collects</h2>
            <p>
              This website does not use advertising or analytics trackers, and it does not store what
              you type into the trip form on any server. The form only prepares a message on your own
              device. Nothing is sent to us until you choose to send that message yourself in
              WhatsApp.
            </p>
          </section>

          <section>
            <h2>When you contact us</h2>
            <p>
              If you message or call us, we receive the details you choose to share, such as your
              name, phone number, pickup location, destination, travel date and number of passengers.
              We use them only to answer your enquiry, discuss availability and prepare a quotation.
              WhatsApp messages are also subject to WhatsApp&apos;s own terms and privacy policy.
            </p>
          </section>

          <section>
            <h2>Hosting and technical data</h2>
            <p>
              Like most websites, our hosting provider may keep standard technical logs (for example
              IP address, browser type and the pages requested) for security and reliability.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <p>
              You can ask us to delete the details you have shared with us, or to correct them, by
              contacting us using the details below.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <ul>
              {wa && <li>WhatsApp: {whatsappDisplay()}</li>}
              {tel && <li>Phone: {phoneDisplay()}</li>}
              {business.email && <li>Email: {business.email}</li>}
            </ul>
          </section>
        </div>

        <p className="mt-10">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-semibold text-accent-deep underline underline-offset-4"
          >
            Back to home
          </Link>
        </p>
      </article>
    </div>
  );
}
