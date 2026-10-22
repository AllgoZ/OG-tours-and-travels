"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { transitionPost, type ActionState } from "@/app/admin/actions";
import { StatusBadge } from "./StatusBadge";
import { btn, card, errorCls, hintCls } from "./styles";
import {
  allowedTransitions,
  derivePostState,
  TRANSITION_LABEL,
  type Transition,
  type WorkflowFields,
} from "@/lib/admin/workflow";

interface Props {
  id: string;
  workflow: WorkflowFields;
  slug: string;
  /** True when the form has unsaved edits: workflow actions use the SAVED version, so they are disabled. */
  dirty: boolean;
  /** Publication date was never customised -> offer to use today's date when publishing. */
  suggestTodayDate: boolean;
  reviewedAt: string | null;
  onRebase: (updatedAt: string) => void;
}

const EXPLAIN: Record<ReturnType<typeof derivePostState>, string> = {
  draft: "This article is a draft and is not public. Once the business owner has reviewed it, record the sign-off below.",
  approved: "Reviewed and approved, but still a draft. Publishing makes it public.",
  published: "Live. Edits you save here update the public page on its next visit.",
  scheduled: "Approved and scheduled: it becomes public once its publication date passes.",
};

const CONFIRM_TEXT: Partial<Record<Transition, string>> = {
  unpublish: "Unpublish this article? It will be removed from the site, the sitemap and the RSS feed.",
  request_review: "Send this article back for review? It will be taken offline (if live) and the sign-off cleared.",
};

export function TransitionPanel({ id, workflow, slug, dirty, suggestTodayDate, reviewedAt, onRebase }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(transitionPost, {});
  const current = derivePostState(workflow);
  // The confirmation belongs to one review cycle: it un-ticks itself when the status or sign-off changes.
  const cycle = `${current}:${reviewedAt ?? ""}`;
  const [confirmedCycle, setConfirmedCycle] = useState<string | null>(null);
  const confirmed = confirmedCycle === cycle;
  const options = allowedTransitions(workflow);

  useEffect(() => {
    if (state.ok && state.saved) {
      onRebase(state.saved.updatedAt);
      router.refresh(); // pull the new flags into the page
    }
  }, [state, onRebase, router]);

  return (
    <section aria-labelledby="status-heading" className={`${card} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="status-heading" className="font-heading text-lg font-bold text-ink">
          Publication status
        </h2>
        <StatusBadge post={workflow} />
      </div>
      <p className="text-sm text-slate">{EXPLAIN[current]}</p>
      {reviewedAt && workflow.review_status === "approved" && (
        <p className="text-sm text-slate">Review sign-off recorded {new Date(reviewedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.</p>
      )}

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        {options.includes("approve") && (
          <label className="flex items-start gap-3 text-sm text-ink">
            <input
              type="checkbox"
              name="confirm"
              value="yes"
              checked={confirmed}
              onChange={(e) => setConfirmedCycle(e.target.checked ? cycle : null)}
              className="mt-1 size-5 accent-[var(--color-accent-deep)]"
            />
            <span>I confirm the business owner has reviewed this article and approves it for publication.</span>
          </label>
        )}

        {options.includes("publish") && (
          <label className="flex items-start gap-3 text-sm text-ink">
            <input type="checkbox" name="date_now" defaultChecked={suggestTodayDate} className="mt-1 size-5 accent-[var(--color-accent-deep)]" />
            <span>Use today as the publication date (leave unticked to keep the date in the form, or to schedule a future date).</span>
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          {options.map((t) => {
            const style = t === "publish" ? btn.primary : t === "approve" ? btn.dark : btn.outline;
            return (
              <button
                key={t}
                type="submit"
                name="transition"
                value={t}
                disabled={pending || dirty || (t === "approve" && !confirmed)}
                className={style}
                onClick={(e) => {
                  const msg = CONFIRM_TEXT[t];
                  if (msg && !window.confirm(msg)) e.preventDefault();
                }}
              >
                {pending ? "Working…" : TRANSITION_LABEL[t]}
              </button>
            );
          })}
        </div>
        {dirty && <p className={hintCls}>Save your changes first. These actions apply to the saved version of the article.</p>}
        {options.includes("publish") && (
          <p className={hintCls}>
            Publishing updates /blog/{slug}, the journal index, the home page, sitemap and RSS feed. If your host serves a cached copy, the change
            appears on the next visit to each page.
          </p>
        )}
      </form>

      {state.message && (
        <p role="status" className="rounded-control border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          {state.message}
        </p>
      )}
      {state.formError && (
        <p role="alert" className={errorCls}>
          {state.formError}
        </p>
      )}
    </section>
  );
}
