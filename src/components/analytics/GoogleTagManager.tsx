import Script from "next/script";
import { getGtmId } from "@/lib/gtm";

/**
 * Google Tag Manager, installed the way Google's snippet prescribes:
 *  - the loader script (here via next/script, `afterInteractive`, so it never blocks first paint), and
 *  - the `<noscript>` iframe fallback, which must come first in <body> — SiteChrome renders this
 *    component before anything else.
 *
 * Rendered by SiteChrome only, so every public page (including the 404) has it and /admin never does.
 * Renders nothing unless `getGtmId()` allows it. No consent mode is configured here: tags that need
 * consent must be gated inside the GTM container (see docs/seo-aeo.md).
 */
export function GoogleTagManager() {
  const id = getGtmId();
  if (!id) return null;

  // `id` matches /^GTM-[A-Z0-9]+$/ (lib/gtm.ts) and is JSON-encoded, so it cannot break out of the string.
  const loader = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(id)});`;

  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
      <Script id="google-tag-manager" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: loader }} />
    </>
  );
}
