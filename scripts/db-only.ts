/** npm run db:start: only the database (for DBeaver or JDBC practice without the app). Ctrl+C stops it. */
import pg from "pg";
import { startPostgres, adminUrl, DB_PORT } from "./lib/postgres";
import { migrate } from "./lib/migrate";
import { resetData } from "../db/seed/reset";

async function main() {
  const db = await startPostgres();
  const url = process.env.DATABASE_URL ?? adminUrl();
  await migrate(url);
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  if ((await c.query("SELECT 1 FROM jobs LIMIT 1")).rowCount === 0) await resetData(c);
  await c.end();
  console.log(`Database ready: jdbc:postgresql://localhost:${DB_PORT}/icehr  (qa_reader / qa_reader, qa_writer / qa_writer). Ctrl+C to stop.`);
  const stop = async () => { await db.stop(); process.exit(0); };
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
