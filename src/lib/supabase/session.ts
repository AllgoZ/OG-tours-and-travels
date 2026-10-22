import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BlogDataError } from "@/lib/blog-core";
import { SESSION_COOKIE_OPTIONS } from "./session-options";

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new BlogDataError(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return { url, key };
}

/**
 * Supabase client bound to the visitor's session cookies (publishable key + the user's own JWT).
 * Every query it makes is subject to Row Level Security as that user, so a non-admin can never
 * read drafts or write posts even if application code had a bug. No service_role key is used.
 */
export async function createSessionClient(): Promise<SupabaseClient> {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS });
          }
        } catch {
          // Called from a Server Component render, where cookies are read-only. The proxy refreshes
          // the session on every /admin request, so this is safe to ignore.
        }
      },
    },
  });
}
