"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { blogCovers } from "@/lib/blog-covers";
import { renderMarkdown } from "@/lib/blog-render";
import { COVER_BUCKET } from "@/lib/covers";
import { requireAdmin, safeNextPath } from "@/lib/admin/auth";
import { parsePostForm, publishBlockers, UPLOADED_COVER_RE, type FieldErrors } from "@/lib/admin/post-input";
import {
  applyTransition,
  coverUsageCount,
  createPost,
  deleteDraft,
  getPostById,
  redirectSourcesFor,
  slugTaken,
  updatePost,
  UUID_RE,
} from "@/lib/admin/posts";
import { checkRateLimit, resetRateLimit } from "@/lib/admin/rate-limit";
import { revalidatePublicBlog } from "@/lib/admin/revalidate";
import { validateSlug } from "@/lib/admin/slug";
import { allowedTransitions, derivePostState, isTransition, TRANSITION_LABEL } from "@/lib/admin/workflow";
import { createSessionClient } from "@/lib/supabase/session";

// Every exported function here is a public HTTP endpoint (a Server Action). Each one therefore
// authorises the caller itself with requireAdmin()/the session client — never trust the caller's page.
// Next.js additionally rejects cross-origin Server Action calls (Origin must match Host).

export interface ActionState {
  ok?: boolean;
  message?: string;
  formError?: string;
  errors?: FieldErrors;
  /** Fresh concurrency token + slug after a successful save. */
  saved?: { id: string; slug: string; updatedAt: string };
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim().slice(0, 64);
}

/**
 * Email + password sign-in via Supabase Auth. Responses never reveal whether an address is registered:
 * unknown email and wrong password produce the same message after the same delay.
 */
export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!EMAIL_RE.test(email) || email.length > 254 || password.length < 1 || password.length > 200) {
    return { formError: "Enter your email address and password." };
  }

  const ip = await clientIp();
  const emailKey = `login:email:${createHash("sha256").update(email).digest("hex").slice(0, 24)}`;
  const byIp = checkRateLimit(`login:ip:${ip}`, { max: 20, windowMs: 15 * 60_000 });
  const byEmail = checkRateLimit(emailKey, { max: 6, windowMs: 15 * 60_000 });
  if (!byIp.allowed || !byEmail.allowed) {
    const wait = Math.ceil(Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds) / 60);
    return { formError: `Too many sign-in attempts. Try again in about ${wait} minute${wait === 1 ? "" : "s"}.` };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await sleep(500);
    return { formError: "Incorrect email or password." };
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { formError: "This account is not authorised to manage the blog." };
  }

  resetRateLimit(emailKey);
  redirect(next);
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login?reason=signed-out");
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------
const LEGACY_COVERS = Object.keys(blogCovers);

/** Create (no id) or update (id) a post's CONTENT. Publication flags are never touched here. */
export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();

  const parsed = parsePostForm(formData, { legacyCovers: LEGACY_COVERS });
  if (!parsed.ok) return { errors: parsed.errors, formError: "Fix the highlighted fields and save again." };
  const input = parsed.value;

  const id = String(formData.get("id") ?? "");

  // --- create ---
  if (!id) {
    const created = await createPost(supabase, input);
    if (!created.ok) {
      if (created.code === "23505") return { errors: { slug: created.error }, formError: created.error };
      return { formError: created.error };
    }
    redirect(`/admin/posts/${created.data.id}/edit?created=1`);
  }

  // --- update ---
  if (!UUID_RE.test(id)) return { formError: "Invalid article." };
  const current = await getPostById(supabase, id);
  if (!current.ok) return { formError: current.error };
  if (!current.data) return { formError: "This article no longer exists." };
  const before = current.data;

  const wasLive = !before.draft;
  if (wasLive) {
    const missing = publishBlockers(input);
    if (missing.length > 0) return { formError: `A published article needs ${missing.join(", ")}.` };
  }

  // A newly chosen uploaded cover must really be in the bucket.
  if (input.cover && UPLOADED_COVER_RE.test(input.cover) && input.cover !== before.cover) {
    const { data: exists } = await supabase.storage.from(COVER_BUCKET).exists(input.cover);
    if (!exists) return { errors: { cover: "That cover image is not in storage. Upload it again." }, formError: "Fix the highlighted fields and save again." };
  }

  // "Mark as updated" stamps dateModified on live articles (never earlier than the publication date).
  if (wasLive && formData.get("touch_modified") === "on") {
    const now = new Date().toISOString();
    input.modified_at = now > input.published_at ? now : input.published_at;
  }

  const expected = String(formData.get("updated_at") ?? "");
  const result = await updatePost(supabase, id, input, expected);
  if (!result.ok) {
    if ("conflict" in result) return { formError: result.error };
    if (result.code === "23505") return { errors: { slug: result.error }, formError: result.error };
    return { formError: result.error };
  }
  const after = result.data;

  // Replaced cover: drop the old uploaded file only if nothing else still uses it.
  if (before.cover && before.cover !== after.cover && UPLOADED_COVER_RE.test(before.cover)) {
    if ((await coverUsageCount(supabase, before.cover, id)) === 0) {
      await supabase.storage.from(COVER_BUCKET).remove([before.cover]);
    }
  }

  const slugChanged = before.slug !== after.slug;
  if (wasLive || slugChanged) revalidatePublicBlog([before.slug, after.slug, ...(await redirectSourcesFor(supabase, after.slug))]);

  return {
    ok: true,
    message: wasLive
      ? `Saved. The public page updates on its next visit${slugChanged ? `; the old URL /blog/${before.slug} now redirects to the new one` : ""}.`
      : "Draft saved. It is not public.",
    saved: { id: after.id, slug: after.slug, updatedAt: after.updated_at },
  };
}

/** Workflow transitions (approve / publish / unpublish / request review), validated server-side. */
export async function transitionPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const t = formData.get("transition");
  if (!UUID_RE.test(id) || !isTransition(t)) return { formError: "Invalid request." };

  const current = await getPostById(supabase, id);
  if (!current.ok) return { formError: current.error };
  const post = current.data;
  if (!post) return { formError: "This article no longer exists." };

  if (!allowedTransitions(post).includes(t)) {
    return { formError: `“${TRANSITION_LABEL[t]}” is not available while the article is ${derivePostState(post)}. Reload the page.` };
  }
  if (t === "approve" && formData.get("confirm") !== "yes") {
    return { formError: "Confirm that the business owner has reviewed this article before approving it." };
  }

  let extra: { published_at?: string } = {};
  if (t === "publish") {
    const missing = publishBlockers({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      cover: post.cover,
      cover_alt: post.cover_alt,
    });
    if (missing.length > 0) return { formError: `Add ${missing.join(", ")} before publishing.` };
    if (formData.get("date_now") === "on") extra = { published_at: new Date().toISOString() };
  }

  const wasPublic = !post.draft;
  const result = await applyTransition(supabase, id, t, user.id, new Date(), extra);
  if (!result.ok) return { formError: result.error };
  if (!result.data) return { formError: "The article changed while you were working. Reload and try again." };

  if (t === "publish" || wasPublic) revalidatePublicBlog([post.slug, ...(await redirectSourcesFor(supabase, post.slug))]);

  const messages = {
    approve: "Marked as reviewed and approved. It is still a draft — publish when you are ready.",
    publish: "Published. The public site updates on the next visit to each page (the sitemap and RSS feed included).",
    unpublish: "Unpublished. The article is removed from the site, sitemap and RSS feed.",
    request_review: "Sent back for review. The article is a draft again and is not public.",
  } as const;
  return {
    ok: true,
    message: messages[t],
    saved: { id, slug: result.data.slug, updatedAt: result.data.updated_at },
  };
}

/** Deletes a DRAFT (published articles must be unpublished first). */
export async function deletePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { formError: "Invalid request." };
  if (formData.get("confirm") !== "yes") return { formError: "Confirm the deletion first." };

  const current = await getPostById(supabase, id);
  if (!current.ok) return { formError: current.error };
  if (!current.data) redirect("/admin?deleted=1");
  if (!current.data.draft) return { formError: "Only drafts can be deleted. Unpublish the article first." };

  const res = await deleteDraft(supabase, id);
  if (!res.ok) return { formError: res.error };

  const cover = current.data.cover;
  if (cover && UPLOADED_COVER_RE.test(cover) && (await coverUsageCount(supabase, cover, id)) === 0) {
    await supabase.storage.from(COVER_BUCKET).remove([cover]);
  }
  revalidatePublicBlog([current.data.slug, ...(await redirectSourcesFor(supabase, current.data.slug))]);
  redirect("/admin?deleted=1");
}

// ---------------------------------------------------------------------------
// Editor helpers
// ---------------------------------------------------------------------------
/** Renders Markdown with the same sanitising pipeline the public site uses (for the live preview). */
export async function previewMarkdown(content: string): Promise<{ html: string; headings: { id: string; text: string; level: number }[] } | { error: string }> {
  await requireAdmin();
  if (typeof content !== "string" || content.length > 200_000) return { error: "The article is too long to preview." };
  return renderMarkdown(content);
}

export async function checkSlug(slug: string, id: string): Promise<{ ok: boolean; message?: string }> {
  const { supabase } = await requireAdmin();
  const problem = validateSlug(String(slug ?? ""));
  if (problem) return { ok: false, message: problem };
  const taken = await slugTaken(supabase, slug, id || undefined);
  if (!taken.ok) return { ok: false, message: taken.error };
  return taken.data ? { ok: false, message: "Another article already uses this slug." } : { ok: true };
}
