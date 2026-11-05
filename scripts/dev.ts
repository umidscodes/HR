/**
 * npm run dev  ->  embedded PostgreSQL on 5434, migrations, seed (first run only), Ice HR on 8080.
 * Ctrl+C stops both.
 */
import pg from "pg";
import { startPostgres, adminUrl, appUrl } from "./lib/postgres";
import { migrate } from "./lib/migrate";
import { resetData } from "../db/seed/reset";

const PORT = Number(process.env.PORT ?? 8080);

async function main() {
  const t0 = Date.now();
  const db = await startPostgres();
  let server: import("node:http").Server | null = null;
  const shutdown = async (code = 0) => {
    server?.close();
    await db.stop();
    process.exit(code);
  };
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  try {
    const url = process.env.DATABASE_URL ?? adminUrl();
    await migrate(url);
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    const seeded = await client.query("SELECT 1 FROM jobs LIMIT 1");
    if (seeded.rowCount === 0) {
      console.log("[db] Loading the seed data (first run) ...");
      const s = await resetData(client);
      console.log(`[db] Seeded ${s.departments} departments, ${s.jobs} jobs, ${s.employees} employees, ${s.leaveRequests} leave requests`);
    }
    await client.end();
  } catch (err) {
    console.error(`\n[db] ${(err as Error).message}\n`);
    await shutdown(1);
  }

  process.env.DATABASE_URL = appUrl();
  const { createApp } = await import("../src/app");
  server = createApp().listen(PORT, () => {
    const base = `http://localhost:${PORT}`;
    console.log("");
    console.log(`  Ice HR is running  (started in ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    console.log(`    App:        ${base}`);
    console.log(`    Swagger UI: ${base}/swagger`);
    console.log(`    API:        ${base}/api/v1`);
    console.log(`    Tutorials:  ${base}/tutorials/`);
    console.log(`    Database:   jdbc:postgresql://localhost:${process.env.DB_PORT ?? 5434}/icehr  (qa_reader / qa_reader)`);
    console.log("  Press Ctrl+C to stop.");
    console.log("");
  });
  server.on("error", async (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") console.error(`\n[app] Port ${PORT} is already in use. Stop the other program or run with another port (set PORT=8081).\n`);
    else console.error(err);
    await shutdown(1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
