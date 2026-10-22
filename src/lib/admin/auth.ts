import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSessionClient } from "@/lib/supabase/session";

export { safeNextPath } from "./paths";

export interface AdminContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * The single authorization primitive for the CMS. Call it at the top of EVERY admin page, server
 * action and route handler — never rely on the Proxy, a layout or a hidden link.
 *
 *  1. getUser() asks the Supabase Auth server to validate the session token (cookies alone are not trusted).
 *  2. is_admin() asks the database whether this user is on the admin allow-list (admin_users).
 *
 * No session / expired session -> redirect to /admin/login. Signed in but not an admin -> /admin/forbidden.
 * Row Level Security enforces the same rule again on every query the returned client makes.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/admin/login?reason=expired");

  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError) throw new Error(`Could not verify administrator access (${rpcError.code ?? "error"}).`);
  if (isAdmin !== true) redirect("/admin/forbidden");

  return { supabase, user: data.user };
}

/** Like requireAdmin but returns null instead of redirecting (for the login page). */
export async function getAdminOrNull(): Promise<AdminContext | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin === true ? { supabase, user: data.user } : null;
}
