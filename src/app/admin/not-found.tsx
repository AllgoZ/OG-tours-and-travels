import Link from "next/link";
import { btn, card } from "@/components/admin/styles";

/**
 * CMS-specific 404 (unknown post id). Without it Next would fall back to the public 404, which brings the
 * public chrome — and the public-only analytics (Google Tag Manager) — into the private admin area.
 */
export default function AdminNotFound() {
  return (
    <main id="admin-main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className={card}>
        <h1 className="font-heading text-2xl font-bold text-ink">Not found</h1>
        <p className="mt-3 text-slate">That post doesn&apos;t exist, or it was deleted.</p>
        <p className="mt-6">
          <Link href="/admin" className={btn.dark}>
            Back to dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
