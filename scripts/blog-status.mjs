// Lists blog posts and their publication state, and changes it from the command line.
//   npm run blog:status                       list every post and whether it is public
//   npm run blog:status -- approve <slug>     record business-review sign-off (stays a draft)
//   npm run blog:status -- publish <slug>     go live (only allowed for approved posts)
//   npm run blog:status -- hide <slug>        unpublish (back to draft)
// The admin CMS at /admin does the same with a UI; this is the CLI equivalent. Uses DATABASE_URL from
// .env.local (admin). The website itself never runs this.
import { connect, redact } from "./lib/db.mjs";

const [, , command = "list", slug] = process.argv;
const client = await connect();

const ACTIONS = {
  approve: {
    sql: "update public.blog_posts set review_status = 'approved', reviewed_at = now() where slug = $1 returning slug",
    done: "approved (still a draft — run `publish` to go live)",
  },
  publish: {
    sql: "update public.blog_posts set draft = false where slug = $1 and review_status = 'approved' returning slug",
    done: "published (rebuild/redeploy, or use the CMS which revalidates automatically)",
    missing: (s) => `No approved post with slug "${s}". A post must be approved before it can be published.`,
  },
  hide: {
    sql: "update public.blog_posts set draft = true where slug = $1 returning slug",
    done: "hidden (back to draft)",
  },
};

try {
  if (command in ACTIONS) {
    if (!slug) throw new Error(`Usage: npm run blog:status -- ${command} <slug>`);
    const a = ACTIONS[command];
    const r = await client.query(a.sql, [slug]);
    if (r.rowCount === 0) throw new Error(a.missing ? a.missing(slug) : `No post with slug "${slug}".`);
    console.log(`✔ ${slug}: ${a.done}`);
  } else if (command !== "list") {
    throw new Error(`Unknown command "${command}". Use: list | approve | publish | hide`);
  }

  const { rows } = await client.query(
    `select slug, draft, review_status, published_at,
            (draft = false and review_status = 'approved' and published_at <= now()) as public
       from public.blog_posts order by published_at desc, slug`,
  );
  console.log(`\n${rows.length} post(s):\n`);
  for (const r of rows) {
    const state = r.public ? "PUBLIC " : "hidden ";
    const why = r.public
      ? ""
      : `  (${[r.draft && "draft", r.review_status !== "approved" && r.review_status, !r.draft && r.published_at > new Date() && "scheduled"].filter(Boolean).join(", ")})`;
    console.log(`  ${state} ${r.slug}${why}`);
  }
  console.log("");
} catch (err) {
  console.error(redact(err.message));
  await client.end();
  process.exit(1);
}
await client.end();
