import { derivePostState, STATE_LABEL, type PostState, type WorkflowFields } from "@/lib/admin/workflow";

const TONE: Record<PostState, string> = {
  draft: "bg-amber-100 text-amber-900 ring-amber-300",
  approved: "bg-sky-100 text-sky-900 ring-sky-300",
  published: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  scheduled: "bg-violet-100 text-violet-900 ring-violet-300",
};

export function StatusBadge({ post }: { post: WorkflowFields }) {
  const state = derivePostState(post);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE[state]}`}>
      {STATE_LABEL[state]}
    </span>
  );
}
