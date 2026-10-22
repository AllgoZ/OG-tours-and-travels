/** Only same-site /admin paths are valid post-login destinations (prevents open redirects). */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/admin";
  if (!/^\/admin(\/[A-Za-z0-9._~\-\[\]/]*)?$/.test(next) || next.startsWith("//") || next.includes("..")) return "/admin";
  return next === "/admin/login" || next === "/admin/forbidden" ? "/admin" : next;
}
