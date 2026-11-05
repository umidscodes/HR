/** npm run reset: put the data back to the seed state (same as POST /api/v1/reset). Starts the database if needed. */
import pg from "pg";
import { startPostgres, adminUrl } from "./lib/postgres";
import { migrate } from "./lib/migrate";
import { resetData } from "../db/seed/reset";

async function main() {
  const db = await startPostgres({ quiet: true });
  try {
    const url = process.env.DATABASE_URL ?? adminUrl();
    await migrate(url, () => {});
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    const s = await resetData(c);
    await c.end();
    console.log(`Reset done: ${s.departments} departments, ${s.jobs} jobs, ${s.employees} employees, ${s.leaveRequests} leave requests.`);
  } finally {
    await db.stop();
  }
}

main().catch((err) => { console.error(err.message ?? err); process.exit(1); });
