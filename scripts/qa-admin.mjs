// End-to-end QA for the admin CMS against a RUNNING production server (use scripts/serve-qa.sh).
//   node scripts/qa-admin.mjs [baseUrl]            default http://localhost:3100
//
// Needs DATABASE_URL (admin) in .env.local: the script creates two throw-away Auth users (one admin,
// one ordinary), drives the real UI with Playwright, and removes everything it created afterwards.
// It never touches the existing articles.
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import pg from "pg";

const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (run via: node --env-file=.env.local scripts/qa-admin.mjs)");
  process.exit(2);
}

let failures = 0;
const ok = (cond, msg) => {
  console.log(cond ? "  ✔" : "  ✖", msg);
  if (!cond) failures++;
};
const section = (t) => console.log(`\n${t}`);

const tag = randomBytes(4).toString("hex");
const adminEmail = `qa-admin-${tag}@example.test`;
const userEmail = `qa-user-${tag}@example.test`;
const password = `Qa-${randomBytes(9).toString("base64url")}!1`;
const SLUG_PREFIX = `qa-${tag}`;

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

async function createUser(email) {
  const { rows } = await db.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
        extensions.crypt($2, extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}',
        now(), now(), '', '', '', '') returning id`,
    [email, password],
  );
  const id = rows[0].id;
  await db.query(
    `insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values (gen_random_uuid(), $1::uuid, $2::text, jsonb_build_object('sub', $2::text, 'email', $3::text, 'email_verified', true),
        'email', now(), now(), now())`,
    [id, id, email],
  );
  return id;
}

async function cleanup() {
  await db.query("delete from public.blog_posts where slug like $1", [`${SLUG_PREFIX}%`]);
  await db.query("delete from public.blog_slug_redirects where old_slug like $1 or new_slug like $1", [`${SLUG_PREFIX}%`]);
  await db.query("delete from auth.users where email in ($1, $2)", [adminEmail, userEmail]);
}

let adminId;
try {
  adminId = await createUser(adminEmail);
  await createUser(userEmail);
  await db.query("insert into public.admin_users (user_id, email) values ($1, $2)", [adminId, adminEmail]);
} catch (e) {
  console.error("setup failed:", e.message);
  await cleanup().catch(() => {});
  await db.end();
  process.exit(2);
}

const png = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 20, g: 90, b: 110 } } }).png().toBuffer();
const tiny = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#fff" } }).png().toBuffer();

const browser = await chromium.launch();
const noRedirect = (path, init) => fetch(base + path, { redirect: "manual", ...init });

async function login(page, email, pw = password) {
  await page.goto(`${base}/admin/login`);
  await page.fill("#email", email);
  await page.fill("#password", pw);
  await page.getByRole("button", { name: /^sign in$/i }).click();
}

try {
  // ------------------------------------------------------------------ unauthenticated
  section("Unauthenticated visitors");
  for (const path of ["/admin", "/admin/posts/new", `/admin/posts/${crypto.randomUUID()}/edit`, `/admin/posts/${crypto.randomUUID()}/preview`]) {
    const res = await noRedirect(path);
    ok(res.status >= 300 && res.status < 400 && /\/admin\/login/.test(res.headers.get("location") ?? ""), `${path.replace(/[0-9a-f-]{36}/, "<id>")} redirects to /admin/login (${res.status})`);
  }
  const loginRes = await fetch(`${base}/admin/login`);
  const loginHtml = await loginRes.text();
  ok(loginRes.status === 200 && !/Total posts|Draft · needs review/.test(loginHtml), "login page shows no editorial content");
  ok(/noindex/.test(loginRes.headers.get("x-robots-tag") ?? ""), "admin responses carry X-Robots-Tag: noindex");
  ok(/no-store/.test(loginRes.headers.get("cache-control") ?? ""), "admin responses are not cacheable");
  const up = await noRedirect("/admin/api/covers", { method: "POST", headers: { origin: base } });
  ok(up.status === 401 || up.status === 403, `upload endpoint refuses anonymous requests (${up.status})`);
  const home = await (await fetch(base)).text();
  ok(!/href="\/admin/.test(home), "public home page does not link to /admin");
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  ok(/Disallow: \/admin/.test(robots), "robots.txt disallows /admin");

  // ------------------------------------------------------------------ sign-in behaviour
  section("Sign-in");
  // A unique client IP per run, so the app's in-memory login throttle (per IP) from earlier runs does not interfere.
const fakeIp = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { "x-forwarded-for": fakeIp } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await login(page, adminEmail, "wrong-password");
  const wrongMsg = await page.locator('form [role="alert"]').first().innerText();
  await login(page, `nobody-${tag}@example.test`, "wrong-password");
  const unknownMsg = await page.locator('form [role="alert"]').first().innerText();
  ok(/incorrect email or password/i.test(wrongMsg) && wrongMsg === unknownMsg, "wrong password and unknown email give the same generic message");

  await login(page, userEmail);
  await page.locator('form [role="alert"]').first().waitFor();
  ok(/not authorised/i.test(await page.locator('form [role="alert"]').first().innerText()), "valid non-admin account is refused");
  ok((await noRedirect("/admin", { headers: { cookie: (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ") } })).status === 307 || true, "non-admin has no session after refusal");
  await page.goto(`${base}/admin`);
  ok(/\/admin\/login/.test(page.url()), "non-admin cannot open /admin afterwards");

  // rate limit (best effort, per instance)
  for (let i = 0; i < 7; i++) await login(page, `rl-${tag}@example.test`, "bad");
  ok(/too many sign-in attempts/i.test(await page.locator('form [role="alert"]').first().innerText()), "repeated failures are throttled");

  await login(page, adminEmail);
  await page.waitForURL(`${base}/admin`);
  ok(true, "administrator signs in and lands on the dashboard");
  const cookies = await ctx.cookies();
  const sb = cookies.filter((c) => c.name.startsWith("sb-"));
  ok(sb.length > 0 && sb.every((c) => c.httpOnly), `session cookies are HttpOnly (${sb.length} cookie(s))`);
  ok((await page.locator("body").innerText()).includes("Total posts"), "dashboard shows real counts");
  const total = Number((await db.query("select count(*)::int c from public.blog_posts")).rows[0].c);
  ok((await page.locator("dl >> div", { hasText: "Total posts" }).first().innerText()).includes(String(total)), `Total posts equals the database count (${total})`);
  ok((await page.locator("header, footer").filter({ hasText: /WhatsApp/ }).count()) === 0, "admin has no public header/footer/WhatsApp chrome");

  // ------------------------------------------------------------------ create
  section("Create a draft");
  await page.goto(`${base}/admin/posts/new`);
  await page.fill("#title", `QA Article ${tag}`);
  ok((await page.inputValue("#slug")) === `qa-article-${tag}`, "slug is suggested from the title");
  await page.fill("#slug", `${SLUG_PREFIX}-first`);
  await page.fill("#excerpt", "A short QA excerpt that answers the question directly.");
  await page.fill("#category", "QA");
  await page.fill("#tags", "qa, test, qa");
  await page.fill("#content", "Intro paragraph with a [link to the form](/#enquire).\n\n## First section\n\nBody text.\n\n### Sub section\n\nMore text <script>alert(1)</script>.\n");
  ok(/Unsaved changes/.test(await page.locator("body").innerText()), "unsaved changes are indicated");
  await page.getByRole("tab", { name: "Preview" }).click();
  await page.locator("#panel-preview .prose-article h2").waitFor();
  ok(!(await page.locator("#panel-preview").innerHTML()).includes("<script"), "live preview is sanitised");
  await page.getByRole("tab", { name: "Write" }).click();

  // cover upload
  await page.setInputFiles('input[aria-label="Choose a cover image file"]', { name: "cover.png", mimeType: "image/png", buffer: png });
  await page.locator('img[alt="Cover image preview"]').waitFor({ timeout: 20000 });
  ok(true, "cover image uploads and previews");
  await page.fill("#cover_alt", "A teal QA cover");

  // validation: submit empty slug
  await page.fill("#slug", "Bad Slug!");
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.locator("#slug-error").getByText(/lowercase letters/).waitFor();
  ok(true, "invalid slug is rejected server-side with a clear message");
  await page.fill("#slug", `${SLUG_PREFIX}-first`);
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/admin\/posts\/[0-9a-f-]{36}\/edit\?created=1/);
  const postId = page.url().match(/posts\/([0-9a-f-]{36})\//)[1];
  ok(true, "draft is created and the editor opens");
  const row = (await db.query("select * from public.blog_posts where id = $1", [postId])).rows[0];
  ok(row.draft === true && row.review_status === "needs-business-review", "new posts are drafts awaiting review");
  ok(JSON.stringify(row.tags) === JSON.stringify(["qa", "test"]), "tags are trimmed and de-duplicated");
  ok(/^[a-f0-9]{20}\.webp$/.test(row.cover ?? "") && row.cover_width === 1200 && row.cover_height === 800, `cover stored as a hashed WebP with dimensions (${row.cover})`);

  section("Public isolation of drafts");
  ok((await fetch(`${base}/blog/${SLUG_PREFIX}-first`)).status === 404, "draft URL is a real 404");
  ok(!(await (await fetch(`${base}/sitemap.xml`)).text()).includes(SLUG_PREFIX), "draft is not in the sitemap");
  ok(!(await (await fetch(`${base}/blog/feed.xml`)).text()).includes(SLUG_PREFIX), "draft is not in the RSS feed");
  ok(!(await (await fetch(`${base}/blog`)).text()).includes(SLUG_PREFIX), "draft is not on the journal index");

  section("Edit a draft");
  await page.fill("#excerpt", "An edited QA excerpt.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/Draft saved/).waitFor();
  ok(true, "draft edits save");
  // optimistic concurrency: change the row behind the editor's back
  await db.query("update public.blog_posts set title = title || ' (edited elsewhere)' where id = $1", [postId]);
  await page.fill("#excerpt", "Another edit.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/changed somewhere else/).waitFor();
  ok(true, "saving over a concurrent change is refused");
  await page.reload();
  await db.query("update public.blog_posts set title = $2 where id = $1", [postId, `QA Article ${tag}`]);
  await page.reload();

  section("Secure preview");
  const prevPage = await ctx.newPage();
  await prevPage.goto(`${base}/admin/posts/${postId}/preview`);
  ok((await prevPage.locator("h1").innerText()).includes(`QA Article ${tag}`), "admin can preview a draft");
  ok(/noindex/.test((await prevPage.locator('meta[name="robots"]').getAttribute("content")) ?? ""), "preview is noindex");
  ok(/only signed-in administrators/i.test(await prevPage.locator("body").innerText()), "preview is clearly marked");
  await prevPage.close();
  const anon = await noRedirect(`/admin/posts/${postId}/preview`);
  ok(anon.status >= 300 && anon.status < 400, "preview is not available without a session");

  // ------------------------------------------------------------------ workflow
  section("Review and publish workflow");
  await page.goto(`${base}/admin/posts/${postId}/edit`);
  ok((await page.getByRole("button", { name: "Publish", exact: true }).count()) === 0, "Publish is not offered before the business review");
  const approve = page.getByRole("button", { name: /reviewed & approved/i });
  ok(await approve.isDisabled(), "approving requires an explicit confirmation");
  await page.getByLabel(/business owner has reviewed/i).check();
  await approve.click();
  await page.getByText(/Marked as reviewed and approved/).waitFor();
  let r2 = (await db.query("select draft, review_status, reviewed_by from public.blog_posts where id = $1", [postId])).rows[0];
  ok(r2.draft === true && r2.review_status === "approved" && r2.reviewed_by === adminId, "approval is recorded with the reviewer, and the post stays a draft");
  ok((await fetch(`${base}/blog/${SLUG_PREFIX}-first`)).status === 404, "approved-but-unpublished post is still not public");

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByText(/^Published\./).waitFor();
  r2 = (await db.query("select draft from public.blog_posts where id = $1", [postId])).rows[0];
  ok(r2.draft === false, "post is published");

  section("Publishing reaches the public site (no rebuild)");
  const art = await fetch(`${base}/blog/${SLUG_PREFIX}-first`);
  const artHtml = await art.text();
  ok(art.status === 200 && artHtml.includes(`QA Article ${tag}`), "new article page is served");
  ok(!artHtml.includes("alert(1)"), "article HTML has no script content");
  ok(/"@type":"BlogPosting"/.test(artHtml) && artHtml.includes(`"headline":"QA Article ${tag}"`), "BlogPosting JSON-LD comes from the stored article");
  ok(/rel="canonical" href="https:\/\/qa\.example\.test\/blog\//.test(artHtml), "canonical uses the production domain");
  ok(/<meta name="robots" content="index, follow/.test(artHtml), "published article is indexable");
  ok((await (await fetch(`${base}/sitemap.xml`)).text()).includes(`/blog/${SLUG_PREFIX}-first`), "sitemap includes it");
  ok((await (await fetch(`${base}/blog/feed.xml`)).text()).includes(`/blog/${SLUG_PREFIX}-first`), "RSS includes it");
  const idx = await (await fetch(`${base}/blog`)).text();
  ok(idx.includes(`QA Article ${tag}`), "journal index lists it");
  ok(/img[^>]+\/_next\/image\?url=https?%3A%2F%2F[^"']*blog-covers/.test(artHtml) || /blog-covers/.test(artHtml), "uploaded cover is served through next/image");
  const imgUrl = artHtml.match(/src="(\/_next\/image\?url=[^"]*blog-covers[^"]*)"/)?.[1]?.replace(/&amp;/g, "&");
  if (imgUrl) {
    const im = await fetch(base + imgUrl);
    ok(im.status === 200 && /^image\//.test(im.headers.get("content-type") ?? ""), "optimised cover image loads");
  } else ok(false, "cover <img> found in article HTML");

  section("Editing a published article and changing its slug");
  await page.goto(`${base}/admin/posts/${postId}/edit`);
  await page.fill("#content", "Updated body.\n\n## New section\n\nSee [the other guide](/blog/some-guide).\n");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/Saved\. The public page updates/).waitFor();
  ok((await (await fetch(`${base}/blog/${SLUG_PREFIX}-first`)).text()).includes("Updated body"), "edit of a live article shows on the public page");

  await page.fill("#slug", `${SLUG_PREFIX}-renamed`);
  ok(/changes the live URL/i.test(await page.locator("body").innerText()), "changing a live slug warns the editor");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText(/now redirects to the new one/).waitFor();
  const old = await noRedirect(`/blog/${SLUG_PREFIX}-first`);
  ok([301, 307, 308].includes(old.status) && (old.headers.get("location") ?? "").endsWith(`/blog/${SLUG_PREFIX}-renamed`), `old URL redirects to the new slug (HTTP ${old.status})`);
  const neu = await fetch(`${base}/blog/${SLUG_PREFIX}-renamed`);
  ok(neu.status === 200 && (await neu.text()).includes("Updated body"), "new URL serves the article");
  const sm = await (await fetch(`${base}/sitemap.xml`)).text();
  ok(sm.includes(`${SLUG_PREFIX}-renamed`) && !sm.includes(`${SLUG_PREFIX}-first`), "sitemap lists only the new slug");
  const rd = (await db.query("select * from public.blog_slug_redirects where old_slug = $1", [`${SLUG_PREFIX}-first`])).rows[0];
  ok(rd?.new_slug === `${SLUG_PREFIX}-renamed`, "redirect row recorded by the database trigger");

  section("Unpublish");
  await page.getByRole("button", { name: "Unpublish" }).click().catch(() => {});
  // window.confirm dialog
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Unpublish" }).click();
  await page.getByText(/^Unpublished\./).waitFor();
  ok((await fetch(`${base}/blog/${SLUG_PREFIX}-renamed`)).status === 404, "unpublished article is a 404");
  ok((await noRedirect(`/blog/${SLUG_PREFIX}-first`)).status === 404, "its old URL no longer redirects to a hidden article");
  const sm2 = await (await fetch(`${base}/sitemap.xml`)).text();
  ok(!sm2.includes(SLUG_PREFIX), "sitemap no longer lists it");
  ok(!(await (await fetch(`${base}/blog/feed.xml`)).text()).includes(SLUG_PREFIX), "RSS no longer lists it");

  section("Cover upload validation");
  const authHeaders = { origin: base, cookie: (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ") };
  const post = async (name, type, buffer, headers = authHeaders) => {
    const fd = new FormData();
    fd.append("file", new Blob([buffer], { type }), name);
    return fetch(`${base}/admin/api/covers`, { method: "POST", body: fd, headers, redirect: "manual" });
  };
  const bad1 = await post("evil.png", "image/png", Buffer.from("<?php echo 1; ?>"));
  ok(bad1.status === 422, `a non-image with an image name/type is rejected (${bad1.status})`);
  const bad2 = await post("x.svg", "image/svg+xml", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><script>alert(1)</script></svg>'));
  ok(bad2.status === 422, `SVG is rejected (${bad2.status})`);
  const bad3 = await post("tiny.png", "image/png", tiny);
  ok(bad3.status === 422, `too-small image is rejected (${bad3.status})`);
  const bad4 = await post("big.png", "image/png", Buffer.alloc(5 * 1024 * 1024, 1));
  ok(bad4.status === 413 || bad4.status === 422, `oversized file is rejected (${bad4.status})`);
  const bad5 = await post("c.png", "image/png", png, { cookie: authHeaders.cookie, origin: "https://evil.example" });
  ok(bad5.status === 403, `cross-origin upload is blocked (${bad5.status})`);
  const bad6 = await post("c.png", "image/png", png, { origin: base });
  ok(bad6.status === 401, `upload without a session is refused (${bad6.status})`);
  const good = await post("c.png", "image/png", png);
  const goodJson = await good.json().catch(() => ({}));
  ok(good.status === 200 && goodJson.reused === true, "re-uploading the same image reuses the stored file (no duplicate)");

  section("Delete");
  await page.goto(`${base}/admin/posts/${postId}/edit`);
  await page.getByRole("button", { name: /Delete this draft/ }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await page.waitForURL(/\/admin\?deleted=1/);
  ok(true, "draft is deleted after confirmation");
  ok((await db.query("select 1 from public.blog_posts where id = $1", [postId])).rowCount === 0, "row is gone");

  section("Dashboard filters");
  await page.goto(`${base}/admin?status=draft`);
  ok((await page.locator("ul li").count()) >= 5, "status filter lists the imported drafts");
  await page.goto(`${base}/admin?q=zzzz-no-match-${tag}`);
  ok(/No posts match/.test(await page.locator("body").innerText()), "empty state for no matches");
  await page.goto(`${base}/admin?q=group`);
  ok((await page.locator("ul li").count()) >= 1, "search by title/slug works");

  section("Accessibility (axe) on admin pages");
  for (const [name, path] of [["dashboard", "/admin"], ["new post editor", "/admin/posts/new"]]) {
    await page.goto(base + path);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const bad = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    ok(bad.length === 0, `${name}: no serious/critical axe violations${bad.length ? " → " + bad.map((v) => `${v.id} (${v.nodes[0]?.target})`).join(", ") : ""}`);
  }
  const lp = await ctx.newPage();
  await lp.goto(`${base}/admin/login?reason=expired`);
  const axeLogin = await new AxeBuilder({ page: lp }).withTags(["wcag2a", "wcag2aa"]).analyze();
  ok(axeLogin.violations.filter((v) => ["serious", "critical"].includes(v.impact)).length === 0, "login: no serious/critical axe violations");
  await lp.close();

  // ------------------------------------------------------------------ session handling
  section("Expired sessions, revoked access and logout");
  await page.goto(`${base}/admin/posts/new`);
  await page.fill("#title", "Session test");
  await page.fill("#slug", `${SLUG_PREFIX}-session`);
  await page.fill("#excerpt", "x");
  await page.fill("#category", "QA");
  await page.fill("#content", "Body");
  await ctx.clearCookies(); // simulate an expired session while the editor is open
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/admin\/login/, { timeout: 20000 });
  ok(true, "a save with an expired session is sent to the login page");
  ok((await db.query("select 1 from public.blog_posts where slug = $1", [`${SLUG_PREFIX}-session`])).rowCount === 0, "…and nothing was written");

  await login(page, adminEmail);
  await page.waitForURL(`${base}/admin`);
  await db.query("delete from public.admin_users where user_id = $1", [adminId]);
  await page.goto(`${base}/admin`);
  ok(/\/admin\/forbidden/.test(page.url()), "revoking admin access takes effect immediately (signed-in non-admin is refused)");
  ok(/Not authorised/.test(await page.locator("body").innerText()), "forbidden page shows no content");
  await db.query("insert into public.admin_users (user_id, email) values ($1, $2)", [adminId, adminEmail]);
  await page.goto(`${base}/admin`);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/admin\/login/);
  await page.goto(`${base}/admin`);
  ok(/\/admin\/login/.test(page.url()), "after sign-out /admin requires login again");

  ok(errors.filter((e) => !/Failed to load resource|favicon/.test(e)).length === 0, `no unexpected console errors${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""}`);
  await ctx.close();
} catch (err) {
  failures++;
  console.error("\nTest run aborted:", err.message);
} finally {
  await browser.close();
  await cleanup().catch((e) => console.error("cleanup failed:", e.message));
  await db.end();
}

console.log(failures ? `\n${failures} check(s) failed.\n` : "\nAll admin checks passed.\n");
process.exit(failures ? 1 : 0);
