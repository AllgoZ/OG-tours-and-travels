"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { checkSlug, savePost, type ActionState } from "@/app/admin/actions";
import { slugify } from "@/lib/admin/slug";
import { derivePostState } from "@/lib/admin/workflow";
import { CoverField, type LegacyCover } from "./CoverField";
import { DeleteDraft } from "./DeleteDraft";
import { MarkdownEditor } from "./MarkdownEditor";
import { SeoPanel } from "./SeoPanel";
import { TransitionPanel } from "./TransitionPanel";
import { btn, card, errorCls, field, hintCls, labelCls } from "./styles";

export interface EditorInitial {
  id: string; // "" for a new post
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  author: string;
  cover: string;
  coverWidth: string;
  coverHeight: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  publishedAt: string; // ISO
  modifiedAt: string; // ISO or ""
  draft: boolean;
  reviewStatus: string;
  reviewedAt: string | null;
  createdAt: string; // ISO or ""
  updatedAt: string; // concurrency token ("" for new)
}

interface Props {
  initial: EditorInitial;
  categories: string[];
  legacyCovers: LegacyCover[];
  bucketBase: string;
  siteUrl: string | null;
  siteName: string;
  linkingPosts: { id: string; slug: string; title: string }[];
  flash?: "created";
}

type Values = Omit<EditorInitial, "id" | "draft" | "reviewStatus" | "reviewedAt" | "createdAt" | "updatedAt">;

const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => {
  const d = new Date(v);
  return v && !Number.isNaN(d.getTime()) ? d.toISOString() : "";
};

function pickValues(i: EditorInitial): Values {
  const v: Partial<EditorInitial> = { ...i };
  for (const k of ["id", "draft", "reviewStatus", "reviewedAt", "createdAt", "updatedAt"] as const) delete v[k];
  return v as Values;
}

export function PostEditor({ initial, categories, legacyCovers, bucketBase, siteUrl, siteName, linkingPosts, flash }: Props) {
  const isNew = !initial.id;
  const [values, setValues] = useState<Values>(() => pickValues(initial));
  const [baseline, setBaseline] = useState<Values>(() => pickValues(initial));
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [touchModified, setTouchModified] = useState(false);
  const [slugCheck, setSlugCheck] = useState<{ ok: boolean; message?: string } | null>(null);
  // false during server render + hydration, true afterwards: datetime-local values depend on the browser time zone.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, saving] = useActionState<ActionState, FormData>(savePost, {});

  const set = useCallback(<K extends keyof Values>(key: K, v: Values[K]) => setValues((cur) => ({ ...cur, [key]: v })), []);

  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline]);

  // After a successful save: this content is the new baseline and we hold the fresh concurrency token.
  const lastSaved = useRef<string>("");
  useEffect(() => {
    if (state.ok && state.saved && state.saved.updatedAt !== lastSaved.current) {
      lastSaved.current = state.saved.updatedAt;
      setUpdatedAt(state.saved.updatedAt);
      setBaseline(values);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to a new save result
  }, [state]);

  // Unsaved-changes protection: tab close / reload, and in-app links (capture phase, before Next's router).
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes. Leave this page and discard them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const workflow = { draft: initial.draft, review_status: initial.reviewStatus, published_at: baseline.publishedAt || initial.publishedAt };
  const live = !isNew && !initial.draft;
  const slugChangedOnLive = live && values.slug !== baseline.slug;
  // The date was never customised if it equals the creation time (within a minute).
  const suggestToday =
    !isNew && !!initial.createdAt && Math.abs(new Date(initial.publishedAt).getTime() - new Date(initial.createdAt).getTime()) < 60_000 && initial.draft;

  const errs = state.errors ?? {};
  const coverSrc = values.cover
    ? legacyCovers.find((l) => l.name === values.cover)?.src ?? `${bucketBase}${encodeURIComponent(values.cover)}`
    : "";

  async function verifySlug() {
    if (!values.slug) return setSlugCheck(null);
    try {
      setSlugCheck(await checkSlug(values.slug, initial.id));
    } catch {
      setSlugCheck({ ok: false, message: "Could not check the slug (is your session still active?)." });
    }
  }

  const err = (key: string) => (errs as Record<string, string | undefined>)[key];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-ink underline underline-offset-4">
            ← Back to posts
          </Link>
          <h1 className="mt-1 font-heading text-3xl font-bold text-ink">{isNew ? "New post" : "Edit post"}</h1>
        </div>
        <div className="flex items-center gap-3" aria-live="polite">
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 ring-1 ring-inset ring-amber-300">Unsaved changes</span>
          ) : !isNew ? (
            <span className="text-sm text-slate">All changes saved</span>
          ) : null}
          {!isNew && (
            <Link href={`/admin/posts/${initial.id}/preview`} target="_blank" className={btn.outline}>
              Preview saved version <span className="sr-only">(opens in a new tab)</span>
            </Link>
          )}
        </div>
      </div>

      {flash === "created" && (
        <p role="status" className="rounded-control border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Draft created. It is not public. Keep writing, then record the owner&apos;s review and publish when ready.
        </p>
      )}

      {!isNew && (
        <TransitionPanel
          id={initial.id}
          workflow={workflow}
          slug={baseline.slug}
          dirty={dirty}
          suggestTodayDate={suggestToday}
          reviewedAt={initial.reviewedAt}
          onRebase={setUpdatedAt}
        />
      )}

      <form id="post-form" ref={formRef} action={formAction} className="space-y-6" noValidate>
        <input type="hidden" name="id" value={initial.id} />
        <input type="hidden" name="updated_at" value={updatedAt} />

        <div aria-live="polite">
          {state.formError && (
            <p role="alert" className="rounded-control border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {state.formError}
            </p>
          )}
          {state.ok && state.message && (
            <p role="status" className="rounded-control border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
              {state.message}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* ---------------- main column ---------------- */}
          <div className="space-y-6">
            <section className={`${card} space-y-5`} aria-label="Article">
              <div>
                <label htmlFor="title" className={labelCls}>
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={values.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setValues((cur) => ({ ...cur, title, ...(slugTouched ? {} : { slug: slugify(title) }) }));
                    setSlugCheck(null);
                  }}
                  aria-invalid={Boolean(err("title"))}
                  aria-describedby="title-error"
                  maxLength={200}
                  className={`${field} text-lg font-semibold`}
                />
                <p id="title-error" className={errorCls} role={err("title") ? "alert" : undefined}>
                  {err("title")}
                </p>
              </div>

              <div>
                <label htmlFor="slug" className={labelCls}>
                  URL slug
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    value={values.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", e.target.value.toLowerCase());
                      setSlugCheck(null);
                    }}
                    onBlur={verifySlug}
                    aria-invalid={Boolean(err("slug")) || slugCheck?.ok === false}
                    aria-describedby="slug-hint slug-error"
                    className={`${field} min-w-0 flex-1 font-mono`}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className={btn.outline}
                    onClick={() => {
                      setSlugTouched(true);
                      set("slug", slugify(values.title));
                      setSlugCheck(null);
                    }}
                  >
                    Suggest from title
                  </button>
                </div>
                <p id="slug-hint" className={hintCls}>
                  Public address: {siteUrl ?? "https://yourdomain.com"}/blog/<strong>{values.slug || "…"}</strong>
                  {slugCheck?.ok && <span className="ml-2 font-semibold text-emerald-800">✓ available</span>}
                </p>
                <p id="slug-error" className={errorCls} role={err("slug") || slugCheck?.ok === false ? "alert" : undefined}>
                  {err("slug") ?? (slugCheck?.ok === false ? slugCheck.message : undefined)}
                </p>
                {slugChangedOnLive && (
                  <div role="alert" className="mt-2 rounded-control border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-semibold">This changes the live URL.</p>
                    <p className="mt-1">
                      /blog/{baseline.slug} will permanently redirect (308) to /blog/{values.slug} after you save, so existing links and search results keep working.
                    </p>
                    {linkingPosts.length > 0 && (
                      <>
                        <p className="mt-2">These articles link to the old address. The redirect keeps them working, but you may want to update them:</p>
                        <ul className="mt-1 list-disc pl-5">
                          {linkingPosts.map((p) => (
                            <li key={p.id}>
                              <Link href={`/admin/posts/${p.id}/edit`}>{p.title}</Link>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="excerpt" className={labelCls}>
                  Excerpt
                </label>
                <textarea
                  id="excerpt"
                  name="excerpt"
                  rows={3}
                  value={values.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  aria-invalid={Boolean(err("excerpt"))}
                  aria-describedby="excerpt-hint excerpt-error"
                  maxLength={500}
                  className={field}
                />
                <p id="excerpt-hint" className={hintCls}>
                  {values.excerpt.length}/500 · Shown on cards; also the description when no meta description is set. Lead with the answer.
                </p>
                <p id="excerpt-error" className={errorCls} role={err("excerpt") ? "alert" : undefined}>
                  {err("excerpt")}
                </p>
              </div>
            </section>

            <section className={card} aria-label="Content">
              <MarkdownEditor value={values.content} onChange={(v) => set("content", v)} error={err("content")} />
            </section>

            <SeoPanel
              values={{
                title: values.title,
                slug: values.slug,
                excerpt: values.excerpt,
                content: values.content,
                seoTitle: values.seoTitle,
                seoDescription: values.seoDescription,
                canonical: values.canonical,
                cover: values.cover,
                coverAlt: values.coverAlt,
                slugTaken: slugCheck?.ok === false && /already uses/.test(slugCheck.message ?? ""),
              }}
              siteUrl={siteUrl}
              coverSrc={coverSrc}
              siteName={siteName}
            />
          </div>

          {/* ---------------- side column ---------------- */}
          <aside className="space-y-6" aria-label="Article settings">
            <section className={`${card} space-y-5`}>
              <h2 className="font-heading text-lg font-bold text-ink">Details</h2>
              <div>
                <label htmlFor="category" className={labelCls}>
                  Category
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  list="category-list"
                  value={values.category}
                  onChange={(e) => set("category", e.target.value)}
                  aria-invalid={Boolean(err("category"))}
                  aria-describedby="category-error"
                  className={field}
                />
                <datalist id="category-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p id="category-error" className={errorCls} role={err("category") ? "alert" : undefined}>
                  {err("category")}
                </p>
              </div>
              <div>
                <label htmlFor="tags" className={labelCls}>
                  Tags
                </label>
                <input id="tags" name="tags" type="text" value={values.tags} onChange={(e) => set("tags", e.target.value)} aria-describedby="tags-hint" className={field} />
                <p id="tags-hint" className={hintCls}>
                  Separate with commas.
                </p>
                {err("tags") && <p role="alert" className={errorCls}>{err("tags")}</p>}
              </div>
              <div>
                <label htmlFor="author" className={labelCls}>
                  Author
                </label>
                <input id="author" name="author" type="text" value={values.author} onChange={(e) => set("author", e.target.value)} aria-describedby="author-hint" className={field} />
                <p id="author-hint" className={hintCls}>
                  Leave empty to credit the business. Add a person only if they have agreed to be named.
                </p>
                {err("author") && <p role="alert" className={errorCls}>{err("author")}</p>}
              </div>
            </section>

            <section className={card}>
              <CoverField
                cover={values.cover}
                width={values.coverWidth}
                height={values.coverHeight}
                alt={values.coverAlt}
                legacy={legacyCovers}
                bucketBase={bucketBase}
                onCover={(c) => setValues((cur) => ({ ...cur, cover: c.cover, coverWidth: c.width, coverHeight: c.height }))}
                onAlt={(v) => set("coverAlt", v)}
                errors={{ cover: err("cover"), alt: err("cover_alt") }}
              />
            </section>

            <section className={`${card} space-y-5`}>
              <h2 className="font-heading text-lg font-bold text-ink">Search &amp; sharing</h2>
              <div>
                <label htmlFor="seo_title" className={labelCls}>
                  SEO title
                </label>
                <input id="seo_title" name="seo_title" type="text" value={values.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} aria-describedby="seo_title-hint" className={field} />
                <p id="seo_title-hint" className={hintCls}>
                  {values.seoTitle.length} characters · about 60 or fewer displays in full. Empty = use the title.
                </p>
                {err("seo_title") && <p role="alert" className={errorCls}>{err("seo_title")}</p>}
              </div>
              <div>
                <label htmlFor="seo_description" className={labelCls}>
                  Meta description
                </label>
                <textarea
                  id="seo_description"
                  name="seo_description"
                  rows={3}
                  value={values.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  aria-describedby="seo_description-hint"
                  className={field}
                />
                <p id="seo_description-hint" className={hintCls}>
                  {values.seoDescription.length} characters · 70–160 works well. Empty = use the excerpt.
                </p>
                {err("seo_description") && <p role="alert" className={errorCls}>{err("seo_description")}</p>}
              </div>
              <div>
                <label htmlFor="canonical" className={labelCls}>
                  Canonical URL <span className="font-normal text-slate">(optional)</span>
                </label>
                <input
                  id="canonical"
                  name="canonical"
                  type="url"
                  inputMode="url"
                  value={values.canonical}
                  onChange={(e) => set("canonical", e.target.value)}
                  aria-invalid={Boolean(err("canonical"))}
                  aria-describedby="canonical-hint canonical-error"
                  className={field}
                />
                <p id="canonical-hint" className={hintCls}>
                  Only if this article is also published on another site. Leave empty to use this page&apos;s own address.
                </p>
                <p id="canonical-error" className={errorCls} role={err("canonical") ? "alert" : undefined}>
                  {err("canonical")}
                </p>
              </div>
            </section>

            <section className={`${card} space-y-5`}>
              <h2 className="font-heading text-lg font-bold text-ink">Dates</h2>
              <input type="hidden" name="published_at" value={values.publishedAt} />
              <input type="hidden" name="modified_at" value={values.modifiedAt} />
              <div>
                <label htmlFor="published_at_local" className={labelCls}>
                  Publication date
                </label>
                <input
                  id="published_at_local"
                  type="datetime-local"
                  value={mounted ? toLocalInput(values.publishedAt) : ""}
                  onChange={(e) => set("publishedAt", fromLocalInput(e.target.value))}
                  aria-invalid={Boolean(err("published_at"))}
                  aria-describedby="published-hint"
                  className={field}
                />
                <p id="published-hint" className={hintCls}>
                  A date in the future schedules the article once it is published. Shown in your browser&apos;s time zone.
                </p>
                {err("published_at") && <p role="alert" className={errorCls}>{err("published_at")}</p>}
              </div>
              <div>
                <label htmlFor="modified_at_local" className={labelCls}>
                  Last updated <span className="font-normal text-slate">(optional)</span>
                </label>
                <input
                  id="modified_at_local"
                  type="datetime-local"
                  value={mounted ? toLocalInput(values.modifiedAt) : ""}
                  onChange={(e) => set("modifiedAt", fromLocalInput(e.target.value))}
                  aria-invalid={Boolean(err("modified_at"))}
                  className={field}
                />
                {err("modified_at") && <p role="alert" className={errorCls}>{err("modified_at")}</p>}
              </div>
              {live && (
                <label className="flex items-start gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="touch_modified"
                    checked={touchModified}
                    onChange={(e) => setTouchModified(e.target.checked)}
                    className="mt-1 size-5 accent-[var(--color-accent-deep)]"
                  />
                  <span>Mark as updated now (sets the “last updated” date search engines see). Use for meaningful changes, not typo fixes.</span>
                </label>
              )}
            </section>
          </aside>
        </div>

        {/* Save bar */}
        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          <p className="text-sm text-slate" aria-live="polite">
            {saving ? "Saving…" : dirty ? "You have unsaved changes." : isNew ? "Saving creates a draft. Nothing is published." : "Saving never changes publication status."}
          </p>
          <div className="flex gap-2">
            <Link href="/admin" className={btn.outline}>
              {dirty ? "Cancel" : "Close"}
            </Link>
            <button type="submit" disabled={saving} className={btn.primary}>
              {saving ? "Saving…" : isNew ? "Create draft" : "Save changes"}
            </button>
          </div>
        </div>
      </form>

      {!isNew && initial.draft && <DeleteDraft id={initial.id} title={baseline.title} />}
      {!isNew && !initial.draft && (
        <p className={hintCls}>
          This article is {derivePostState(workflow)}. To delete it, unpublish it first — only drafts can be deleted.
        </p>
      )}
    </div>
  );
}
