import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BlogDataError } from "@/lib/blog-core";

/**
 * Public, read-only Supabase client for server components and build-time reads.
 *
 * Uses the publishable (anon-equivalent) key only: it can see exactly what the RLS policy on
 * blog_posts allows (published rows) and nothing else. No session is stored. Privileged
 * credentials (service_role / secret key / DATABASE_URL) are intentionally NOT used here.
 *
 * Both variables are NEXT_PUBLIC_* (safe to expose by design) and are read as literal
 * `process.env.X` so they are inlined at build time like the rest of the site config.
 */
export function createPublicSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new BlogDataError(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY " +
        "(see .env.example), or set BLOG_SOURCE=markdown to use the Markdown files in content/blog.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
