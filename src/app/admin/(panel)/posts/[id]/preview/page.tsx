import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/blog/ArticleView";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireAdmin } from "@/lib/admin/auth";
import { getPostById } from "@/lib/admin/posts";
import { derivePostState } from "@/lib/admin/workflow";
import { BlogDataError, parseRow, toSummary } from "@/lib/blog-core";
import { renderMarkdown } from "@/lib/blog-render";

// Authenticated, never cached, never indexed. Drafts are only readable here because the signed-in
// ADMIN's own session passes Row Level Security; nothing about this page is reachable publicly.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Preview · Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;

  const result = await getPostById(supabase, id);
  if (!result.ok) throw new BlogDataError(result.error);
  if (!result.data) notFound();
  const row = result.data;

  // Same validation + rendering pipeline as the public site.
  const stored = parseRow(row);
  const post = { ...toSummary(stored), ...renderMarkdown(stored.content) };
  const state = derivePostState(row);

  const banner = (
    <div className="sticky top-0 z-30 border-b border-amber-300 bg-amber-50 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-6">
        <p>
          <strong>Preview</strong> — only signed-in administrators can see this. It shows the <em>saved</em> version and is not indexed.{" "}
          <StatusBadge post={row} />
          {state !== "published" && " · Not public."}
        </p>
        <div className="flex gap-2">
          <Link href={`/admin/posts/${row.id}/edit`} className="rounded-control border border-amber-700 bg-white px-4 py-2 font-semibold hover:bg-amber-100">
            Back to editor
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="-mx-4 -my-8 sm:-mx-6">
      <ArticleView post={post} related={[]} prev={null} next={null} banner={banner} />
    </div>
  );
}
