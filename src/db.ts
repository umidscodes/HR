/** One shared connection pool. The app connects as hr_app (see db/migrations/003_roles.sql). */
import pg from "pg";

// Return DATE columns as plain "YYYY-MM-DD" strings instead of JavaScript Date objects,
// so a date never shifts by a day because of time zones.
pg.types.setTypeParser(1082, (v) => v);
// BIGINT (used by SUM in the stats view) as a number: our totals are far below 2^53.
pg.types.setTypeParser(20, (v) => Number(v));

let _pool: pg.Pool | null = null;

export function pool(): pg.Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL ?? `postgres://hr_app:hr_app@localhost:${process.env.DB_PORT ?? 5434}/icehr`;
    _pool = new pg.Pool({ connectionString: url, max: 10 });
  }
  return _pool;
}

export async function closePool() {
  if (_pool) { await _pool.end(); _pool = null; }
}

export type Db = pg.Pool | pg.PoolClient;

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = [], db: Db = pool()): Promise<T[]> {
  const r = await db.query(sql, params);
  return r.rows as T[];
}

/** Runs fn inside BEGIN ... COMMIT; any error rolls everything back. */
export async function transaction<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}
