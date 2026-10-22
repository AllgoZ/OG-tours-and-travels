-- 001_create_blog_posts.sql
-- Blog content for OG Tours and Travels. Idempotent: safe to re-run.
--
-- Canonical content format: Markdown in `content`. It is rendered and sanitised on the server
-- at build time (src/lib/blog-render.ts); it is never trusted as raw HTML.
--
-- A post is PUBLIC when ALL of these hold (this exact rule is enforced by RLS below and
-- mirrored in src/lib/blog-core.ts `isPubliclyVisible`; keep the two in sync):
--     draft = false  AND  review_status = 'approved'  AND  published_at <= now()

create extension if not exists pgcrypto;  -- gen_random_uuid() (built in on PG13+, kept for safety)

create table if not exists public.blog_posts (
  id              uuid primary key default gen_random_uuid(),

  slug            text not null,
  title           text not null,
  excerpt         text not null,
  content         text not null,                       -- Markdown source (no H1: the page title is the H1)

  cover           text,                                -- filename resolved by src/lib/blog-covers.ts
  cover_alt       text,
  author          text,                                -- only when verified; site falls back to business.blog.defaultAuthor
  category        text not null,
  tags            text[] not null default '{}',

  published_at    timestamptz not null,                -- publication date (frontmatter `date`)
  modified_at     timestamptz,                         -- editorial "last updated" (frontmatter `updated`)

  seo_title       text,
  seo_description text,
  canonical       text,

  draft           boolean not null default true,       -- safe default: new rows are hidden
  review_status   text not null default 'needs-business-review',

  created_at      timestamptz not null default now(),  -- row bookkeeping
  updated_at      timestamptz not null default now(),  -- row bookkeeping (trigger-maintained)

  constraint blog_posts_slug_unique        unique (slug),
  constraint blog_posts_slug_format        check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  constraint blog_posts_title_len          check (char_length(btrim(title)) between 1 and 200),
  constraint blog_posts_excerpt_len        check (char_length(btrim(excerpt)) between 1 and 500),
  constraint blog_posts_content_not_empty  check (char_length(btrim(content)) > 0),
  constraint blog_posts_category_len       check (char_length(btrim(category)) between 1 and 80),
  constraint blog_posts_cover_format       check (cover is null or cover ~ '^[A-Za-z0-9._-]+$'),
  constraint blog_posts_canonical_format   check (canonical is null or canonical ~ '^https?://[^\s]+$'),
  constraint blog_posts_review_status      check (review_status in ('needs-business-review', 'approved')),
  constraint blog_posts_modified_order     check (modified_at is null or modified_at >= published_at)
);

comment on table  public.blog_posts is 'Blog articles. Public read access is limited to published rows by RLS.';
comment on column public.blog_posts.content is 'Markdown source. Rendered + sanitised server-side; never emitted as trusted HTML.';
comment on column public.blog_posts.modified_at is 'Editorial last-updated date (schema.org dateModified). Distinct from updated_at (row bookkeeping).';
comment on column public.blog_posts.draft is 'true = hidden. Public needs draft=false AND review_status=approved AND published_at<=now().';

-- Indexes (slug already has one via the unique constraint).
create index if not exists blog_posts_published_idx
  on public.blog_posts (published_at desc)
  where draft = false and review_status = 'approved';

create index if not exists blog_posts_category_published_idx
  on public.blog_posts (category, published_at desc)
  where draft = false and review_status = 'approved';

create index if not exists blog_posts_tags_idx on public.blog_posts using gin (tags);

-- Keep updated_at honest.
create or replace function public.blog_posts_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.blog_posts_set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.blog_posts enable row level security;
alter table public.blog_posts no force row level security;  -- table owner (postgres) bypasses RLS; only anon/authenticated are restricted

-- Public (anon + signed-in) visitors: SELECT of published rows only.
drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts"
  on public.blog_posts
  for select
  to anon, authenticated
  using (
    draft = false
    and review_status = 'approved'
    and published_at <= now()
  );

-- Deliberately NO insert/update/delete policies: with RLS enabled, that denies all public writes.
-- Defence in depth: also remove the table privileges so a future permissive policy cannot
-- accidentally open writes.
revoke all on table public.blog_posts from anon, authenticated;
grant select on table public.blog_posts to anon, authenticated;

-- Editorial writes happen out-of-band (migration/import script via a direct database
-- connection, or the Supabase dashboard as the project owner) — never from the public site.
