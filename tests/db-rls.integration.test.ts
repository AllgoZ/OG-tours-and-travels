/**
 * Database integration tests: run against the real Supabase Postgres when DATABASE_URL is set
 * (.env.local), otherwise skipped. Every test runs inside a transaction that is rolled back, so
 * nothing is persisted. They exercise the migrations' constraints, RLS policies (as anon, as a
 * signed-in NON-admin and as an ADMIN, by impersonating the role + JWT claims), the publish-requires-
 * approval invariant, the slug-redirect trigger and the Storage policies.
 */
import pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("blog_posts + admin CMS schema, RLS and triggers (live database)", () => {
  let client: pg.Client;
  let adminId: string;
  let userId: string;

  beforeAll(async () => {
    client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await client.connect();
  });
  afterAll(async () => client?.end());

  beforeEach(async () => {
    await client.query("begin");
    const mk = async (email: string) =>
      (
        await client.query(
          `insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
           values ('00000000-0000-0000-0000-000000000000',gen_random_uuid(),'authenticated','authenticated',$1,'x',now(),'{}','{}',now(),now(),'','','','') returning id`,
          [email],
        )
      ).rows[0].id as string;
    adminId = await mk("zz-test-admin@example.test");
    userId = await mk("zz-test-user@example.test");
    await client.query("insert into public.admin_users (user_id,email) values ($1,'zz-test-admin@example.test')", [adminId]);
  });
  afterEach(async () => client.query("rollback"));

  /** Run `fn` as anon / a signed-in user, with JWT claims set like PostgREST does. */
  async function as<T>(role: "anon" | "authenticated", uid: string | null, fn: () => Promise<T>): Promise<T> {
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)", [
      JSON.stringify(uid ? { sub: uid, role } : { role }),
      uid ?? "",
    ]);
    try {
      return await fn();
    } finally {
      await client.query("reset role");
    }
  }
  /** Statement that should be rejected, without aborting the surrounding transaction. */
  async function denied(sql: string, params: unknown[] = []) {
    await client.query("savepoint s");
    try {
      await client.query(sql, params);
      await client.query("release savepoint s");
      return null;
    } catch (e) {
      await client.query("rollback to savepoint s");
      return (e as { code?: string }).code ?? "error";
    }
  }

  const insert = (slug: string, o: { draft?: boolean; status?: string; at?: string } = {}) =>
    client.query(
      `insert into public.blog_posts (slug,title,excerpt,content,category,published_at,draft,review_status)
       values ($1,'T','E','C','Cat',$2,$3,$4)`,
      [slug, o.at ?? "2026-01-01T00:00:00Z", o.draft ?? false, o.status ?? "approved"],
    );
  const visibleSlugs = async (role: "anon" | "authenticated", uid: string | null) =>
    as(role, uid, async () => (await client.query("select slug from public.blog_posts where slug like 'zz-test-%' order by slug")).rows.map((r) => r.slug));

  // ----------------------------------------------------------------------------------------------
  it("RLS is on; anon has exactly one policy (SELECT) and no write policy", async () => {
    expect((await client.query("select relrowsecurity from pg_class where oid='public.blog_posts'::regclass")).rows[0].relrowsecurity).toBe(true);
    const pol = (await client.query("select policyname, cmd, roles from pg_policies where tablename='blog_posts'")).rows;
    const anonPolicies = pol.filter((p) => String(p.roles).includes("anon"));
    expect(anonPolicies.map((p) => p.cmd)).toEqual(["SELECT"]);
    // every write policy is restricted to signed-in users (and further to admins by is_admin())
    for (const p of pol.filter((x) => x.cmd !== "SELECT")) expect(String(p.roles)).toBe("{authenticated}");
  });

  it("anon sees only published rows: not drafts, not approved-but-unpublished, not unreviewed, not scheduled", async () => {
    await insert("zz-test-live");
    await insert("zz-test-draft-review", { draft: true, status: "needs-business-review" });
    await insert("zz-test-draft-approved", { draft: true });
    await insert("zz-test-future", { at: "2999-01-01T00:00:00Z" });
    expect(await visibleSlugs("anon", null)).toEqual(["zz-test-live"]);
  });

  it("a live post must be approved: the database rejects draft=false + needs-business-review", async () => {
    expect(await denied("insert into public.blog_posts (slug,title,excerpt,content,category,published_at,draft,review_status) values ('zz-test-bad','T','E','C','C',now(),false,'needs-business-review')")).toBe("23514");
    await insert("zz-test-ok", { draft: true, status: "needs-business-review" });
    expect(await denied("update public.blog_posts set draft=false where slug='zz-test-ok'")).toBe("23514");
  });

  it("anon cannot insert, update or delete", async () => {
    await insert("zz-test-live");
    await as("anon", null, async () => {
      expect(await denied("insert into public.blog_posts (slug,title,excerpt,content,category,published_at) values ('zz-test-evil','T','E','C','Cat',now())")).toBe("42501");
      expect(await denied("update public.blog_posts set title='x' where slug='zz-test-live'")).toBe("42501");
      expect(await denied("delete from public.blog_posts where slug='zz-test-live'")).toBe("42501");
    });
  });

  it("is_admin() is true only for allow-listed, confirmed users", async () => {
    expect(await as("authenticated", adminId, async () => (await client.query("select public.is_admin() a")).rows[0].a)).toBe(true);
    expect(await as("authenticated", userId, async () => (await client.query("select public.is_admin() a")).rows[0].a)).toBe(false);
    await client.query("update auth.users set email_confirmed_at = null where id = $1", [adminId]);
    expect(await as("authenticated", adminId, async () => (await client.query("select public.is_admin() a")).rows[0].a)).toBe(false);
  });

  it("a signed-in NON-admin sees only public posts and cannot write", async () => {
    await insert("zz-test-live");
    await insert("zz-test-draft", { draft: true, status: "needs-business-review" });
    expect(await visibleSlugs("authenticated", userId)).toEqual(["zz-test-live"]);
    await as("authenticated", userId, async () => {
      expect(await denied("insert into public.blog_posts (slug,title,excerpt,content,category,published_at) values ('zz-test-evil','T','E','C','Cat',now())")).toBe("42501");
      // UPDATE/DELETE on rows the user cannot see affect 0 rows (RLS filters), never succeed:
      expect((await client.query("update public.blog_posts set title='hacked' where slug='zz-test-draft'")).rowCount).toBe(0);
      expect((await client.query("delete from public.blog_posts where slug='zz-test-draft'")).rowCount).toBe(0);
    });
    expect((await client.query("select title from public.blog_posts where slug='zz-test-draft'")).rows[0].title).toBe("T");
  });

  it("an ADMIN sees drafts and can create, edit and delete posts", async () => {
    await insert("zz-test-live");
    await insert("zz-test-draft", { draft: true, status: "needs-business-review" });
    expect(await visibleSlugs("authenticated", adminId)).toEqual(["zz-test-draft", "zz-test-live"]);
    await as("authenticated", adminId, async () => {
      expect(await denied("insert into public.blog_posts (slug,title,excerpt,content,category,published_at) values ('zz-test-new','T','E','C','Cat',now())")).toBeNull();
      expect((await client.query("update public.blog_posts set title='edited' where slug='zz-test-draft'")).rowCount).toBe(1);
      expect((await client.query("delete from public.blog_posts where slug='zz-test-new'")).rowCount).toBe(1);
    });
  });

  it("nobody can make themselves an admin; users can read only their own admin row", async () => {
    await as("authenticated", userId, async () => {
      expect(await denied("insert into public.admin_users (user_id,email) values ($1,'zz-test-user@example.test')", [userId])).toBe("42501");
      expect((await client.query("select user_id from public.admin_users")).rows).toEqual([]);
    });
    await as("authenticated", adminId, async () => {
      expect((await client.query("select user_id from public.admin_users")).rows.map((r) => r.user_id)).toEqual([adminId]);
      expect(await denied("delete from public.admin_users")).toBe("42501");
    });
    await as("anon", null, async () => {
      expect(await denied("select * from public.admin_users")).toBe("42501");
    });
  });

  it("slug uniqueness and format are enforced by the database", async () => {
    await insert("zz-test-dup");
    expect(await denied("insert into public.blog_posts (slug,title,excerpt,content,category,published_at) values ('zz-test-dup','T','E','C','C',now())")).toBe("23505");
    for (const bad of ["ZZ-Bad", "zz bad", "zz-bad-"]) {
      expect(await denied("insert into public.blog_posts (slug,title,excerpt,content,category,published_at) values ($1,'T','E','C','C',now())", [bad])).toBe("23514");
    }
  });

  it("rejects an unknown review_status, a non-http canonical and inconsistent cover dimensions", async () => {
    const base = "insert into public.blog_posts (slug,title,excerpt,content,category,published_at";
    expect(await denied(`${base},review_status) values ('zz-test-s','T','E','C','C',now(),'published')`)).toBe("23514");
    expect(await denied(`${base},canonical) values ('zz-test-c','T','E','C','C',now(),'javascript:alert(1)')`)).toBe("23514");
    expect(await denied(`${base},cover_width) values ('zz-test-w','T','E','C','C',now(),800)`)).toBe("23514");
  });

  it("new rows default to hidden (draft=true, needs-business-review)", async () => {
    await client.query("insert into public.blog_posts (slug,title,excerpt,content,category,published_at) values ('zz-test-default','T','E','C','Cat','2026-01-01Z')");
    expect(await visibleSlugs("anon", null)).toEqual([]);
  });

  // ----------------------------------------------------------------------------------------------
  describe("slug redirects", () => {
    const redirects = async (role: "anon" | "authenticated", uid: string | null) =>
      as(role, uid, async () => (await client.query("select old_slug,new_slug from public.blog_slug_redirects where old_slug like 'zz-test-%' order by old_slug")).rows);

    it("renaming a post records old -> new, and anon sees it only while the target is public", async () => {
      await insert("zz-test-a");
      await client.query("update public.blog_posts set slug='zz-test-b' where slug='zz-test-a'");
      expect(await redirects("anon", null)).toEqual([{ old_slug: "zz-test-a", new_slug: "zz-test-b" }]);
      await client.query("update public.blog_posts set draft=true where slug='zz-test-b'");
      expect(await redirects("anon", null)).toEqual([]); // target hidden => redirect (and the new slug) not discoverable
      expect(await redirects("authenticated", adminId)).toEqual([{ old_slug: "zz-test-a", new_slug: "zz-test-b" }]);
    });

    it("renaming twice leaves no chain: every old slug points at the final slug", async () => {
      await insert("zz-test-a");
      await client.query("update public.blog_posts set slug='zz-test-b' where slug='zz-test-a'");
      await client.query("update public.blog_posts set slug='zz-test-c' where slug='zz-test-b'");
      expect(await redirects("anon", null)).toEqual([
        { old_slug: "zz-test-a", new_slug: "zz-test-c" },
        { old_slug: "zz-test-b", new_slug: "zz-test-c" },
      ]);
    });

    it("renaming back removes the loop", async () => {
      await insert("zz-test-a");
      await client.query("update public.blog_posts set slug='zz-test-b' where slug='zz-test-a'");
      await client.query("update public.blog_posts set slug='zz-test-a' where slug='zz-test-b'");
      expect(await redirects("anon", null)).toEqual([{ old_slug: "zz-test-b", new_slug: "zz-test-a" }]);
    });

    it("a new post that takes an old slug cancels the redirect (a real page is never shadowed)", async () => {
      await insert("zz-test-a");
      await client.query("update public.blog_posts set slug='zz-test-b' where slug='zz-test-a'");
      await insert("zz-test-a");
      expect(await redirects("anon", null)).toEqual([]);
    });

    it("deleting the target removes its redirects; nobody can write redirects directly", async () => {
      await insert("zz-test-a");
      await client.query("update public.blog_posts set slug='zz-test-b' where slug='zz-test-a'");
      await client.query("delete from public.blog_posts where slug='zz-test-b'");
      expect(await redirects("authenticated", adminId)).toEqual([]);
      await as("authenticated", adminId, async () => {
        expect(await denied("insert into public.blog_slug_redirects (old_slug,new_slug) values ('zz-test-x','zz-test-y')")).toBe("42501");
      });
    });
  });

  // ----------------------------------------------------------------------------------------------
  describe("storage bucket blog-covers", () => {
    const putObject = (uid: string) =>
      denied("insert into storage.objects (bucket_id,name,owner,owner_id) values ('blog-covers','zz-test-object.webp',$1::uuid,$2::text)", [uid, uid]);

    it("exists, is public-read, limited to images and 5 MB", async () => {
      const b = (await client.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id='blog-covers'")).rows[0];
      expect(b.public).toBe(true);
      expect(Number(b.file_size_limit)).toBe(5 * 1024 * 1024);
      expect(b.allowed_mime_types).toEqual(["image/webp", "image/jpeg", "image/png", "image/avif"]);
    });

    it("only administrators may write to it", async () => {
      expect(await as("anon", null, () => putObject(userId))).not.toBeNull();
      expect(await as("authenticated", userId, () => putObject(userId))).not.toBeNull();
      expect(await as("authenticated", adminId, () => putObject(adminId))).toBeNull();
    });
  });
});
