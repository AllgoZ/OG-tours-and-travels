import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { business } from "@/config/business";
import { btn } from "./styles";

/** Admin chrome: deliberately separate from the public header/footer/floating contact buttons. */
export function AdminShell({ email, children }: { email: string | undefined; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/admin" className="font-heading text-lg font-bold text-ink">
              {business.displayName} <span className="font-normal text-slate">· Admin</span>
            </Link>
            <nav aria-label="Admin" className="flex items-center gap-1 text-sm font-semibold">
              <Link href="/admin" className="rounded-control px-3 py-2 hover:bg-ink/[0.05]">
                Posts
              </Link>
              <Link href="/admin/posts/new" className="rounded-control px-3 py-2 hover:bg-ink/[0.05]">
                New post
              </Link>
              <a href="/blog" target="_blank" rel="noopener" className="rounded-control px-3 py-2 hover:bg-ink/[0.05]">
                View site <span className="sr-only">(opens in a new tab)</span>
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {email && <span className="hidden text-sm text-slate sm:inline">{email}</span>}
            <form action={signOut}>
              <button type="submit" className={btn.outline}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="admin-main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
