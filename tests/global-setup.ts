/**
 * The smoke tests run the real app against a separate database (icehr_test) on the same
 * PostgreSQL server, so they never touch your practice data. The server is started if it isn't running.
 */
import pg from "pg";
import { startPostgres, adminUrl, type RunningDb } from "../scripts/lib/postgres";
import { migrate } from "../scripts/lib/migrate";

export const TEST_DB = "icehr_test";
let db: RunningDb | null = null;

export async function setup() {
  db = await startPostgres({ quiet: true });
  const admin = new pg.Client({ connectionString: adminUrl("postgres") });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();
  await migrate(adminUrl(TEST_DB), () => {});
}

export async function teardown() {
  await db?.stop();
}
