import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { btn, card } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { editorEnv, toEditorInitial } from "@/lib/admin/editor-props";
import { getPostById, listCategories, postsLinkingTo } from "@/lib/admin/posts";

export const metadata = { title: "Edit post · Admin" };

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const result = await getPostById(supabase, id);
  if (!result.ok) {
    return (
      <div className={`${card} space-y-3`}>
        <h1 className="font-heading text-2xl font-bold text-ink">Could not load this post</h1>
        <p role="alert" className="text-red-800">
          {result.error}
        </p>
        <Link href="/admin" className={btn.outline}>
          Back to posts
        </Link>
      </div>
    );
  }
  if (!result.data) notFound();
  const post = result.data;

  const [categories, linking] = await Promise.all([
    listCategories(supabase),
    post.draft ? Promise.resolve([]) : postsLinkingTo(supabase, post.slug, post.id),
  ]);

  return (
    <PostEditor
      initial={toEditorInitial(post)}
      categories={categories}
      linkingPosts={linking}
      flash={sp.created ? "created" : undefined}
      {...editorEnv()}
    />
  );
}
