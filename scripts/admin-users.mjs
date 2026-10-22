// Manage who can use the admin CMS (the admin_users allow-list). Owner-only tool: it connects with
// DATABASE_URL, so only someone holding the database credential can add an administrator. Nobody can
// grant themselves access from the website or with the public key.
//
//   npm run admin:users                      list administrators
//   npm run admin:users -- grant  <email>    allow an EXISTING Supabase Auth user (email must be confirmed)
//   npm run admin:users -- revoke <email>    remove access
//
// First admin: 1) Supabase Dashboard -> Authentication -> Users -> "Add user" (tick "Auto Confirm User"),
// 2) run `npm run admin:users -- grant you@example.com`. See docs/admin-cms.md.
import { connect, redact } from "./lib/db.mjs";

const [, , command = "list", emailArg] = process.argv;
const client = await connect();

async function findUser(email) {
  const { rows } = await client.query(
    "select id, email, email_confirmed_at, banned_until from auth.users where lower(email) = lower($1)",
    [email],
  );
  return rows[0] ?? null;
}

try {
  if (command === "grant" || command === "revoke") {
    const email = (emailArg ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Usage: npm run admin:users -- ${command} <email>`);
    const user = await findUser(email);
    if (!user) {
      throw new Error(
        `No Supabase Auth user with email ${email}. Create the user first (Dashboard -> Authentication -> Users -> Add user), then run this again.`,
      );
    }
    if (command === "grant") {
      if (!user.email_confirmed_at) {
        throw new Error(`${email} has not confirmed their email. Confirm the user in the Dashboard (or tick "Auto Confirm User") first.`);
      }
      await client.query(
        "insert into public.admin_users (user_id, email) values ($1, $2) on conflict (user_id) do update set email = excluded.email",
        [user.id, user.email],
      );
      console.log(`✔ ${email} is now an administrator.`);
    } else {
      const r = await client.query("delete from public.admin_users where user_id = $1", [user.id]);
      console.log(r.rowCount ? `✔ ${email} is no longer an administrator.` : `${email} was not an administrator.`);
    }
  } else if (command !== "list") {
    throw new Error(`Unknown command "${command}". Use: list | grant <email> | revoke <email>`);
  }

  const { rows } = await client.query(
    `select a.email, a.created_at, u.email_confirmed_at is not null as confirmed
       from public.admin_users a left join auth.users u on u.id = a.user_id order by a.created_at`,
  );
  console.log(`\n${rows.length} administrator(s):`);
  for (const r of rows) console.log(`  ${r.email}${r.confirmed ? "" : "  (email not confirmed — cannot sign in as admin)"}`);
  console.log("");
} catch (err) {
  console.error(redact(err.message));
  await client.end();
  process.exit(1);
}
await client.end();
