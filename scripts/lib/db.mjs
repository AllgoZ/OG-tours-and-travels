// Shared Postgres connection for the migration + import scripts (never imported by the app).
// DATABASE_URL is a server/admin credential: keep it in the git-ignored .env.local and never
// prefix it with NEXT_PUBLIC_. Use the Supabase *session pooler* string (the direct db.* host is IPv6-only).
import pg from "pg";

export function redact(text) {
  return String(text).replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1***@");
}

export async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
  } catch (err) {
    console.error(`Could not connect to the database: ${redact(err.message)}`);
    process.exit(2);
  }
  return client;
}
