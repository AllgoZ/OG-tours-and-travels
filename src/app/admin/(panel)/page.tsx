import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { btn, card, field, labelCls } from "@/components/admin/styles";
import { requireAdmin } from "@/lib/admin/auth";
import { getDashboardStats, listCategories, listPosts, PAGE_SIZE, type ListQuery } from "@/lib/admin/posts";
import { formatDate } from "@/lib/blog-core";
import { derivePostState } from "@/lib/admin/workflow";

const STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft · needs review" },
  { value: "approved", label: "Approved · ready to publish" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
] as const;

type Params = { q?: string; status?: string; category?: string; sort?: string; page?: string; deleted?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const query: ListQuery = {
    q: sp.q?.slice(0, 80),
    status: STATUSES.some((s) => s.value === sp.status) ? (sp.status as ListQuery["status"]) : "all",
    category: sp.category?.slice(0, 80) || undefined,
    sort: sp.sort === "published" ? "published" : "updated",
    page: Math.max(1, Number(sp.page) || 1),
  };

  const [stats, list, categories] = await Promise.all([
    getDashboardStats(supabase),
    listPosts(supabase, query),
    listCategories(supabase),
  ]);

  const total = list.ok ? list.data.total : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (page: number) => {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (query.status && query.status !== "all") p.set("status", query.status);
    if (query.category) p.set("category", query.category);
    if (query.sort === "published") p.set("sort", "published");
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Posts</h1>
          <p className="mt-1 text-slate">Write, review and publish journal articles.</p>
        </div>
        <Link href="/admin/posts/new" className={btn.primary}>
          New post
        </Link>
      </div>

      {sp.deleted && (
        <p role="status" className="rounded-control border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          The draft was deleted.
        </p>
      )}

      {/* Stats: real counts, or an honest error */}
      {stats.ok ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Total posts", stats.data.total],
            ["Published", stats.data.published],
            ["Scheduled", stats.data.scheduled],
            ["Drafts", stats.data.drafts],
            ["Awaiting review", stats.data.awaitingReview],
          ].map(([label, value]) => (
            <div key={label} className={card}>
              <dt className="text-sm font-semibold text-slate">{label}</dt>
              <dd className="mt-1 font-heading text-3xl font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="alert" className="rounded-control border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Could not load the post counts. {stats.error}
        </p>
      )}

      {/* Filters: a plain GET form (works without JavaScript) */}
      <form method="get" action="/admin" className={`${card} grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end`}>
        <div>
          <label htmlFor="q" className={labelCls}>
            Search title or slug
          </label>
          <input id="q" name="q" type="search" defaultValue={query.q} className={field} />
        </div>
        <div>
          <label htmlFor="status" className={labelCls}>
            Status
          </label>
          <select id="status" name="status" defaultValue={query.status} className={field}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category" className={labelCls}>
            Category
          </label>
          <select id="category" name="category" defaultValue={query.category ?? ""} className={field}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className={labelCls}>
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={query.sort} className={field}>
            <option value="updated">Recently updated</option>
            <option value="published">Publication date</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={btn.dark}>
            Apply
          </button>
          <Link href="/admin" className={btn.outline}>
            Reset
          </Link>
        </div>
      </form>

      {/* List */}
      {!list.ok ? (
        <p role="alert" className="rounded-control border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          Could not load the posts. {list.error}
        </p>
      ) : list.data.posts.length === 0 ? (
        <div className={`${card} text-center`}>
          <p className="font-heading text-lg font-semibold text-ink">
            {stats.ok && stats.data.total === 0 ? "No posts yet" : "No posts match these filters"}
          </p>
          <p className="mt-1 text-slate">
            {stats.ok && stats.data.total === 0 ? "Create your first article to get started." : "Try a different search or reset the filters."}
          </p>
          {stats.ok && stats.data.total === 0 && (
            <Link href="/admin/posts/new" className={`${btn.primary} mt-4`}>
              New post
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-slate" aria-live="polite">
            {total} post{total === 1 ? "" : "s"}
            {pages > 1 && ` · page ${query.page} of ${pages}`}
          </p>
          <ul className="divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-white">
            {list.data.posts.map((p) => {
              const state = derivePostState(p);
              return (
                <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/posts/${p.id}/edit`} className="font-heading text-lg font-semibold text-ink underline-offset-4 hover:underline">
                        {p.title}
                      </Link>
                      <StatusBadge post={p} />
                    </p>
                    <p className="mt-1 truncate text-sm text-slate">
                      /blog/{p.slug} · {p.category} · {state === "published" || state === "scheduled" ? "Publish date" : "Dated"}{" "}
                      {formatDate(p.published_at)} · Updated {formatDate(p.updated_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/admin/posts/${p.id}/edit`} className={btn.outline}>
                      Edit<span className="sr-only">: {p.title}</span>
                    </Link>
                    <Link href={`/admin/posts/${p.id}/preview`} className={btn.outline}>
                      Preview<span className="sr-only">: {p.title}</span>
                    </Link>
                    {state === "published" && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noopener" className={btn.outline}>
                        View live<span className="sr-only"> (new tab): {p.title}</span>
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between">
              {query.page! > 1 ? (
                <Link href={hrefFor(query.page! - 1)} className={btn.outline}>
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {query.page! < pages && (
                <Link href={hrefFor(query.page! + 1)} className={btn.outline}>
                  Next →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
