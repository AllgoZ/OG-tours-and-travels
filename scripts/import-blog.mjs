// Imports content/blog/*.md into the Supabase blog_posts table.
//
//   npm run blog:import                 DRY RUN (default): validates + compares, writes nothing
//   npm run blog:import -- --apply      inserts posts that are not in the database yet
//   npm run blog:import -- --apply --overwrite
//                                       ALSO refreshes the content columns of posts that already exist
//   npm run blog:import -- --dir backups/blog-2026-10-20   import from another folder (restoring a backup made by blog:export)
//
// Safe to re-run (idempotent, keyed by slug):
//   * new slug            -> inserted
//   * existing, identical -> unchanged
//   * existing, differs   -> SKIPPED unless --overwrite (never clobbers edits made in the database)
// draft, review_status and published_at are insert-only: re-running can never unpublish, publish
// or re-date a post that already exists. Markdown files are never modified or deleted.
//
// Needs DATABASE_URL (admin connection, from .env.local). It is not used by the website itself.
import path from "node:path";
import { connect, redact } from "./lib/db.mjs";
import { CONTENT_COLUMNS, readMarkdownPosts, sameContent } from "./lib/blog-import.mjs";

const apply = process.argv.includes("--apply");
const overwrite = process.argv.includes("--overwrite");
if (overwrite && !apply) {
  console.error("--overwrite only makes sense with --apply.");
  process.exit(2);
}

const dirIdx = process.argv.indexOf("--dir");
const sourceDir = path.resolve(dirIdx > -1 ? (process.argv[dirIdx + 1] ?? "") : "content/blog");
const { rows, failures } = readMarkdownPosts(sourceDir);
console.log(`\nBlog import — ${apply ? (overwrite ? "APPLY + OVERWRITE" : "APPLY") : "DRY RUN (nothing is written)"}\n`);
console.log(`Source folder: ${path.relative(process.cwd(), sourceDir) || "."}`);
console.log(`Found ${rows.length + failures.length} Markdown file(s): ${rows.length} valid, ${failures.length} invalid.`);
for (const f of failures) console.log(`  ✖ FAILED  ${f.file}\n      - ${f.errors.join("\n      - ")}`);

const client = await connect();
const result = { imported: [], updated: [], unchanged: [], skipped: [], failed: failures.map((f) => f.file) };

try {
  const existing = new Map(
    (await client.query("select * from public.blog_posts where slug = any($1)", [rows.map((r) => r.slug)])).rows.map((r) => [r.slug, r]),
  );

  await client.query("begin");
  for (const row of rows) {
    const current = existing.get(row.slug);
    const status = `[${row.draft ? "draft" : "live"}, ${row.review_status}]`;

    if (!current) {
      if (apply) {
        await client.query(
          `insert into public.blog_posts
             (slug, title, excerpt, content, cover, cover_alt, author, category, tags, published_at, modified_at,
              seo_title, seo_description, canonical, draft, review_status)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           on conflict (slug) do nothing`,
          [row.slug, row.title, row.excerpt, row.content, row.cover, row.cover_alt, row.author, row.category, row.tags,
           row.published_at, row.modified_at, row.seo_title, row.seo_description, row.canonical, row.draft, row.review_status],
        );
      }
      result.imported.push(row.slug);
      console.log(`  ${apply ? "✔ IMPORTED" : "+ would import"}  ${row.slug} ${status}`);
    } else if (sameContent(current, row)) {
      result.unchanged.push(row.slug);
      console.log(`  = unchanged   ${row.slug}`);
    } else if (!overwrite) {
      result.skipped.push(row.slug);
      console.log(`  ~ SKIPPED     ${row.slug} (differs from the database; re-run with --apply --overwrite to refresh content)`);
    } else {
      const sets = CONTENT_COLUMNS.map((c, i) => `${c} = $${i + 2}`).join(", ");
      await client.query(`update public.blog_posts set ${sets} where slug = $1`, [row.slug, ...CONTENT_COLUMNS.map((c) => row[c])]);
      result.updated.push(row.slug);
      console.log(`  ✔ UPDATED     ${row.slug}`);
    }
  }
  await client.query(apply ? "commit" : "rollback");
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error(`\nImport failed and was rolled back: ${redact(err.message)}`);
  await client.end();
  process.exit(1);
}

const { rows: totals } = await client.query(
  "select count(*)::int total, count(*) filter (where draft = false and review_status = 'approved' and published_at <= now())::int public from public.blog_posts",
);
await client.end();

console.log(
  `\nSummary: ${result.imported.length} ${apply ? "imported" : "to import"}, ${result.updated.length} updated, ` +
    `${result.unchanged.length} unchanged, ${result.skipped.length} skipped, ${result.failed.length} failed.`,
);
console.log(`Database now holds ${totals[0].total} post(s); ${totals[0].public} are publicly visible (draft=false, approved, published).`);
if (!apply) console.log("\nDry run only. Review the list above, then run: npm run blog:import -- --apply\n");
process.exit(result.failed.length ? 1 : 0);
