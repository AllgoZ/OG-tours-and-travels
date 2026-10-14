import { business } from "@/config/business";
import { telHref, whatsappHref } from "@/lib/enquiry";
import { JsonLd } from "./JsonLd";
import { SITE_DESCRIPTION, getSiteUrl } from "@/lib/site";

type Json = Record<string, unknown>;

/**
 * Site-wide JSON-LD (TravelAgency + WebSite). Optional `graph` appends page-specific nodes
 * (e.g. BlogPosting, BreadcrumbList). Every property is emitted only when confirmed: no
 * invented address, coordinates, hours, prices, ratings or reviews.
 */
export function StructuredData({ graph = [] }: { graph?: Json[] }) {
  const url = getSiteUrl();
  const abs = (path: string) => (url ? `${url}${path}` : undefined);

  const sameAs = [...Object.values(business.socials), business.googleBusinessProfileUrl].filter(
    (v): v is string => Boolean(v),
  );
  const tel = telHref()?.replace("tel:", "");
  const wa = whatsappHref();

  const contactPoints: Json[] = [];
  if (tel) contactPoints.push({ "@type": "ContactPoint", telephone: tel, contactType: "reservations" });
  if (wa) contactPoints.push({ "@type": "ContactPoint", url: wa, contactType: "customer service", name: "WhatsApp" });

  const agency: Json = {
    "@type": "TravelAgency",
    ...(url && { "@id": `${url}/#business` }),
    name: business.name,
    alternateName: business.displayName,
    description: SITE_DESCRIPTION,
    ...(url && { url: `${url}/` }),
    image: abs("/og.jpg"),
    logo: abs("/icon.png"),
    ...(tel && { telephone: tel }),
    ...(business.email && { email: business.email }),
    ...(contactPoints.length > 0 && { contactPoint: contactPoints }),
    ...(business.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: business.address.street,
        addressLocality: business.address.locality,
        addressRegion: business.address.region,
        postalCode: business.address.postalCode,
        addressCountry: business.address.country,
      },
    }),
    ...(business.areaServed.length > 0 && {
      areaServed: business.areaServed.map((name) => ({ "@type": "Place", name })),
    }),
    ...(sameAs.length > 0 && { sameAs }),
  };

  const website: Json = {
    "@type": "WebSite",
    ...(url && { "@id": `${url}/#website`, url: `${url}/` }),
    name: business.displayName,
    inLanguage: "en",
    ...(url && { publisher: { "@id": `${url}/#business` } }),
  };

  return <JsonLd data={{ "@context": "https://schema.org", "@graph": [agency, website, ...graph] }} />;
}
