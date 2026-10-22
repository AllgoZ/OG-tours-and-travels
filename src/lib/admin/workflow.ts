/**
 * Editorial workflow: the explicit state machine for a post. Pure, shared by the server actions
 * (which enforce it) and the UI (which only decides which buttons to show).
 *
 * Stored flags:   draft (boolean)  +  review_status ('needs-business-review' | 'approved')
 * Derived state:
 *   draft  + needs-business-review  -> "draft"      editing; the owner has not signed off
 *   draft  + approved               -> "approved"   signed off, ready to publish (not public)
 *   !draft + approved, date <= now  -> "published"  public after the site regenerates
 *   !draft + approved, date  > now  -> "scheduled"  will be public once the date passes
 * A live post is always approved (also enforced by a CHECK constraint in the database), so
 * "publish" can never bypass business review.
 *
 * Transitions (each is its own action; saving a form never changes these flags):
 *   approve         draft -> approved           records who/when; an explicit confirmation is required
 *   publish         approved -> published       only if approved
 *   unpublish       published|scheduled -> approved(draft)   keeps the sign-off, removes it from the site
 *   request_review  any -> draft                clears the sign-off (also takes a live post offline)
 */
export type PostState = "draft" | "approved" | "published" | "scheduled";
export type Transition = "approve" | "publish" | "unpublish" | "request_review";

export interface WorkflowFields {
  draft: boolean;
  review_status: string;
  published_at: string;
}

export function derivePostState(p: WorkflowFields, now: Date = new Date()): PostState {
  if (p.draft) return p.review_status === "approved" ? "approved" : "draft";
  return new Date(p.published_at).getTime() > now.getTime() ? "scheduled" : "published";
}

export const STATE_LABEL: Record<PostState, string> = {
  draft: "Draft · needs review",
  approved: "Approved · ready to publish",
  published: "Published",
  scheduled: "Scheduled",
};

export function allowedTransitions(p: WorkflowFields, now: Date = new Date()): Transition[] {
  switch (derivePostState(p, now)) {
    case "draft":
      return ["approve"];
    case "approved":
      return ["publish", "request_review"];
    case "published":
    case "scheduled":
      return ["unpublish", "request_review"];
  }
}

export const TRANSITION_LABEL: Record<Transition, string> = {
  approve: "Mark as reviewed & approved",
  publish: "Publish",
  unpublish: "Unpublish",
  request_review: "Send back for review",
};

/** Column changes for a transition. `userId` is the authenticated admin, never browser-supplied. */
export function transitionPatch(t: Transition, ctx: { now: Date; userId: string }) {
  switch (t) {
    case "approve":
      return { review_status: "approved" as const, reviewed_at: ctx.now.toISOString(), reviewed_by: ctx.userId };
    case "publish":
      return { draft: false };
    case "unpublish":
      return { draft: true };
    case "request_review":
      return { review_status: "needs-business-review" as const, draft: true, reviewed_at: null, reviewed_by: null };
  }
}

/**
 * Preconditions on the CURRENT row, applied inside the UPDATE's WHERE clause so the check and the
 * write are one atomic statement (no read-then-write race).
 */
export function transitionPrecondition(t: Transition): { draft?: boolean; review_status?: string } {
  switch (t) {
    case "approve":
      return { draft: true, review_status: "needs-business-review" };
    case "publish":
      return { draft: true, review_status: "approved" };
    case "unpublish":
      return { draft: false };
    case "request_review":
      return {};
  }
}

export function isTransition(v: unknown): v is Transition {
  return v === "approve" || v === "publish" || v === "unpublish" || v === "request_review";
}
