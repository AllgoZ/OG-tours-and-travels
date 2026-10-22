import { redirect } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { getAdminOrNull } from "@/lib/admin/auth";
import { btn, card } from "@/components/admin/styles";

/** Shown to a signed-in user who is NOT on the administrator allow-list. Reveals nothing about content. */
export default async function ForbiddenPage() {
  if (await getAdminOrNull()) redirect("/admin");
  return (
    <main id="admin-main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className={card}>
        <h1 className="font-heading text-2xl font-bold text-ink">Not authorised</h1>
        <p className="mt-3 text-slate">
          You are signed in, but this account is not an administrator of the blog. Ask the site owner to grant access, or
          sign in with a different account.
        </p>
        <form action={signOut} className="mt-6">
          <button type="submit" className={btn.dark}>
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
