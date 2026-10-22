import { business } from "@/config/business";
import { getSiteUrl } from "@/lib/site";

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;

/**
 * The Google Tag Manager container to load, or null when GTM must not run.
 *
 * GTM runs only when ALL of these hold, so development, previews and staging never pollute the
 * production analytics (same "safe by default" gate as indexing):
 *  - a container ID is configured and has the `GTM-XXXX` shape (it is interpolated into a script),
 *  - this is a production build,
 *  - a production domain is configured (`NEXT_PUBLIC_SITE_URL`).
 */
export function getGtmId(): string | null {
  const id = business.analytics.gtmId;
  if (!id || !GTM_ID_PATTERN.test(id)) return null;
  if (process.env.NODE_ENV !== "production") return null;
  if (!getSiteUrl()) return null;
  return id;
}
