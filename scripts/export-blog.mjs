// Backs up every blog post (drafts included) to Markdown files with frontmatter, in the same format the
// importer and the Markdown rollback source read.
//   npm run blog:export                       -> backups/blog-<date>/<slug>.md  (+ manifest.json)
//   npm run blog:export -- --dir some/folder  -> choose the folder
// Restore:  npm run blog:import -- --dir backups/blog-<date>            (dry run)
//           npm run blog:import -- --dir backups/blog-<date> --apply [--overwrite]
// Uploaded cover images live in the Supabase Storage bucket `blog-covers` (not exported here): they are
// content-addressed and kept by Supabase; download the bucket from the Dashboard if you want a copy.
// Backups contain unpublished drafts: the /backups folder is git-ignored; store copies privately.
import fs from "node:fs";
import path from "node:path";
import { connect, redact } from "./lib/db.mjs";
import { rowToMarkdown } from "./lib/blog-import.mjs";

const dirIdx = process.argv.indexOf("--dir");
const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(dirIdx > -1 ? (process.argv[dirIdx + 1] ?? "") : `backups/blog-${stamp}`);

const client = await connect();
try {
  const { rows } = await client.query("select * from public.blog_posts order by published_at, slug");
  fs.mkdirSync(outDir, { recursive: true });
  for (const row of rows) fs.writeFileSync(path.join(outDir, `${row.slug}.md`), rowToMarkdown(row));
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, slugs: rows.map((r) => r.slug) }, null, 2),
  );
  console.log(`✔ Exported ${rows.length} post(s) to ${path.relative(process.cwd(), outDir)}`);
} catch (err) {
  console.error(redact(err.message));
  process.exitCode = 1;
} finally {
  await client.end();
}
