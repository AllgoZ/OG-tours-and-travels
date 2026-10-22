import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/session-options";

/**
 * Admin gate, first layer ONLY: refreshes the Supabase session cookies and bounces visitors without
 * a valid session to /admin/login. It is an optimistic check (and a convenience) — authorization is
 * re-verified independently in every admin page, server action and route handler via requireAdmin(),
 * because a Proxy matcher can silently stop covering a route.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return isLogin ? NextResponse.next() : NextResponse.redirect(new URL("/admin/login?reason=config", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, { ...options, ...SESSION_COOKIE_OPTIONS });
        }
      },
    },
  });

  // getUser() validates the token with the Auth server (getSession() alone would trust the cookie).
  const { data } = await supabase.auth.getUser();

  // Page navigations are bounced here. Non-GET requests (Server Action calls, the upload endpoint) are NOT
  // redirected: they reach their handler, which authorises with requireAdmin()/getAdminOrNull() and answers
  // correctly (the framework follows a redirect() from an action; the upload endpoint returns 401 JSON).
  const navigation = request.method === "GET" || request.method === "HEAD";
  if (!data.user && !isLogin && navigation) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(login);
    // Carry over any cookies the refresh attempt cleared.
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
