import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminOrNull, safeNextPath } from "@/lib/admin/auth";
import { business } from "@/config/business";

const REASONS: Record<string, string> = {
  expired: "Your session has expired. Sign in again to continue.",
  "signed-out": "You have been signed out.",
  config: "The CMS is not configured: Supabase environment variables are missing.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;
  const target = safeNextPath(next);

  // Already signed in as an administrator: go straight to the dashboard.
  if (reason !== "config" && (await getAdminOrNull())) redirect(target);

  return (
    <main id="admin-main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-deep">{business.displayName}</p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Admin sign in</h1>
      <p className="mt-2 text-slate">Sign in to manage the travel journal.</p>

      {reason && REASONS[reason] && (
        <p role="status" className="mt-5 rounded-control border border-ink/15 bg-white px-4 py-3 text-sm text-ink">
          {REASONS[reason]}
        </p>
      )}

      <LoginForm next={target} />
    </main>
  );
}
