// Applies supabase/migrations/*.sql in order. Every migration is written to be idempotent,
// so re-running is safe. Each file runs in its own transaction.
//   npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import { connect, redact } from "./lib/db.mjs";

const dir = path.resolve("supabase/migrations");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const client = await connect();
let failed = false;

for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log(`✔ applied ${file}`);
  } catch (err) {
    await client.query("rollback").catch(() => {});
    console.error(`✖ ${file}: ${redact(err.message)}`);
    failed = true;
    break;
  }
}

await client.end();
process.exit(failed ? 1 : 0);
