-- 002_admin_cms.sql
-- Admin CMS support. Idempotent: safe to re-run. Builds on 001_create_blog_posts.sql.
--
--   * admin_users + is_admin()           explicit, server-verifiable administrator allow-list
--   * blog_posts policies for admins     editorial reads/writes through the admin's own session (no service_role key)
--   * publish-requires-approval rule     a post cannot be live unless review_status = 'approved' (DB-enforced)
--   * cover image columns + review audit
--   * blog_slug_redirects                old slug -> new slug, maintained by a trigger
--   * blog-covers Storage bucket         public read, admin-only write/delete
--
-- The anonymous (public website) policy from 001 is NOT changed.

-- ---------------------------------------------------------------------------
-- 1. Administrators
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,                                   -- informational copy, never used for authorisation
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Allow-list of Supabase Auth users who may manage blog content. Rows are created only by the owner (npm run admin:grant); users can never add themselves.';

alter table public.admin_users enable row level security;

-- A signed-in user may see ONLY their own row (so the app can show "you are an admin"). No write policies exist.
drop policy if exists "Users can read their own admin row" on public.admin_users;
create policy "Users can read their own admin row"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

-- Authorisation primitive used by every admin policy (and by the app, server-side).
-- SECURITY DEFINER so it can read admin_users/auth.users regardless of the caller's own privileges; it only
-- ever answers about the CALLER (auth.uid()), requires a confirmed email and an unbanned account.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admin_users a
      join auth.users u on u.id = a.user_id
     where a.user_id = (select auth.uid())
       and u.email_confirmed_at is not null
       and (u.banned_until is null or u.banned_until <= now())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. blog_posts: new columns
-- ---------------------------------------------------------------------------
alter table public.blog_posts add column if not exists cover_width  integer;
alter table public.blog_posts add column if not exists cover_height integer;
alter table public.blog_posts add column if not exists reviewed_at  timestamptz;                                    -- when the business owner signed off
alter table public.blog_posts add column if not exists reviewed_by  uuid references auth.users (id) on delete set null; -- which admin recorded it

comment on column public.blog_posts.cover is
  'Either a legacy filename registered in src/lib/blog-covers.ts, or an object name in the blog-covers Storage bucket (uploaded via the CMS).';
comment on column public.blog_posts.cover_width  is 'Pixel width of an uploaded (Storage) cover. NULL for legacy bundled covers.';
comment on column public.blog_posts.cover_height is 'Pixel height of an uploaded (Storage) cover. NULL for legacy bundled covers.';

-- Both dimensions or neither (a bare "between" check would let a lone NULL slip through).
alter table public.blog_posts drop constraint if exists blog_posts_cover_dims;
alter table public.blog_posts add constraint blog_posts_cover_dims check (
  (cover_width is null) = (cover_height is null)
  and (cover_width is null or (cover_width between 1 and 10000 and cover_height between 1 and 10000))
);

-- ---------------------------------------------------------------------------
-- 3. Publication workflow invariant: live => approved
--    (Imported rows that were "not draft but awaiting review" were never public; make them honest drafts first.)
-- ---------------------------------------------------------------------------
update public.blog_posts set draft = true where draft = false and review_status <> 'approved';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'blog_posts_publish_requires_approval') then
    alter table public.blog_posts add constraint blog_posts_publish_requires_approval
      check (draft = true or review_status = 'approved');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. blog_posts: administrator policies (the public SELECT policy from 001 is untouched)
-- ---------------------------------------------------------------------------
drop policy if exists "Admins can read all posts" on public.blog_posts;
create policy "Admins can read all posts"
  on public.blog_posts for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can insert posts" on public.blog_posts;
create policy "Admins can insert posts"
  on public.blog_posts for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update posts" on public.blog_posts;
create policy "Admins can update posts"
  on public.blog_posts for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete posts" on public.blog_posts;
create policy "Admins can delete posts"
  on public.blog_posts for delete to authenticated
  using ((select public.is_admin()));

-- Table privileges: RLS (above) decides WHO; non-admin authenticated users still match no write policy.
grant insert, update, delete on table public.blog_posts to authenticated;
-- anon keeps SELECT only (from 001).

-- ---------------------------------------------------------------------------
-- 5. Slug redirects (old URL -> new URL), maintained automatically
-- ---------------------------------------------------------------------------
create table if not exists public.blog_slug_redirects (
  old_slug   text primary key check (old_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  new_slug   text not null references public.blog_posts (slug) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.blog_slug_redirects is
  'Permanent redirects /blog/<old_slug> -> /blog/<new_slug>. Written only by the blog_posts slug trigger. Publicly readable only while the target post is public.';

alter table public.blog_slug_redirects enable row level security;

-- Visible to a caller only if they can see the target post (so a hidden draft's slug never leaks).
drop policy if exists "Redirects are readable when the target is readable" on public.blog_slug_redirects;
create policy "Redirects are readable when the target is readable"
  on public.blog_slug_redirects for select to anon, authenticated
  using (exists (select 1 from public.blog_posts p where p.slug = blog_slug_redirects.new_slug));

revoke all on table public.blog_slug_redirects from anon, authenticated;
grant select on table public.blog_slug_redirects to anon, authenticated;

-- Keeps redirects consistent when a slug is created or changed:
--   * a slug that becomes live stops redirecting away (prevents loops / shadowing a real post)
--   * a renamed post leaves old -> new behind; earlier redirects to the old slug follow it (FK ON UPDATE CASCADE) so
--     there are never redirect chains.
create or replace function public.blog_posts_sync_slug_redirects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.blog_slug_redirects where old_slug = new.slug;
  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    insert into public.blog_slug_redirects (old_slug, new_slug)
    values (old.slug, new.slug)
    on conflict (old_slug) do update set new_slug = excluded.new_slug;
  end if;
  return null;
end;
$$;

drop trigger if exists blog_posts_sync_slug_redirects on public.blog_posts;
create trigger blog_posts_sync_slug_redirects
  after insert or update of slug on public.blog_posts
  for each row execute function public.blog_posts_sync_slug_redirects();

-- ---------------------------------------------------------------------------
-- 6. Storage: blog-covers bucket (public read of individual files, admin-only write/delete)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-covers', 'blog-covers', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without a SELECT policy, so anonymous visitors cannot LIST the bucket.
drop policy if exists "Admins can list blog covers" on storage.objects;
create policy "Admins can list blog covers"
  on storage.objects for select to authenticated
  using (bucket_id = 'blog-covers' and (select public.is_admin()));

drop policy if exists "Admins can upload blog covers" on storage.objects;
create policy "Admins can upload blog covers"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-covers' and (select public.is_admin()));

drop policy if exists "Admins can replace blog covers" on storage.objects;
create policy "Admins can replace blog covers"
  on storage.objects for update to authenticated
  using (bucket_id = 'blog-covers' and (select public.is_admin()))
  with check (bucket_id = 'blog-covers' and (select public.is_admin()));

drop policy if exists "Admins can delete blog covers" on storage.objects;
create policy "Admins can delete blog covers"
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-covers' and (select public.is_admin()));
