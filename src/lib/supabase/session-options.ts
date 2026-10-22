import type { CookieOptions } from "@supabase/ssr";

/**
 * Cookie hardening for the admin session. Auth is handled entirely on the server (there is no
 * Supabase browser client), so the session cookies can be HttpOnly: scripts in the page can never
 * read the tokens. SameSite=Lax blocks cross-site POSTs; Secure in production.
 * (Separate from session.ts so the Proxy can import it without pulling in `next/headers`.)
 */
export const SESSION_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // a week; Supabase still expires/rotates the underlying tokens sooner
};
