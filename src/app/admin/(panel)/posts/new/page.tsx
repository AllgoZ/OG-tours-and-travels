import { PostEditor } from "@/components/admin/PostEditor";
import { requireAdmin } from "@/lib/admin/auth";
import { blankPost, editorEnv } from "@/lib/admin/editor-props";
import { listCategories } from "@/lib/admin/posts";

export const metadata = { title: "New post · Admin" };

export default async function NewPostPage() {
  const { supabase } = await requireAdmin();
  const categories = await listCategories(supabase);
  return <PostEditor initial={blankPost()} categories={categories} linkingPosts={[]} {...editorEnv()} />;
}
