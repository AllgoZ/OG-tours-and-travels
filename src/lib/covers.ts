/**
 * Cover images come from two places:
 *   1. legacy bundled images, registered by filename in lib/blog-covers.ts (statically imported), and
 *   2. uploads made in the admin CMS, stored in the public Supabase Storage bucket `blog-covers`.
 * The `cover` column holds the filename / object name; these helpers keep the bucket details in one place.
 */
export const COVER_BUCKET = "blog-covers";

/** Public URL of an uploaded cover (the bucket is public; objects are immutable, content-hashed names). */
export function coverPublicUrl(objectName: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${COVER_BUCKET}/${encodeURIComponent(objectName)}`;
}

/** Host + path pattern for next.config `images.remotePatterns`. */
export function coverRemotePattern(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    return {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      pathname: `/storage/v1/object/public/${COVER_BUCKET}/**`,
    };
  } catch {
    return null;
  }
}
