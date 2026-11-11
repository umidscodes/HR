/**
 * Puts the database back to the exact seed state: same ids, same values, same timestamps.
 * Regions and countries are reference data created by db/migrations/005_regions.sql; a reset leaves them alone.
 * Used by POST /api/v1/reset, npm run reset and the first npm run dev.
 * Everything happens in one transaction, so a failed reset leaves the old data untouched.
 */
import type pg from "pg";
import { countWeekdays } from "../../src/dates";
import { DEPARTMENTS, EMPLOYEES, JOBS, LEAVE_REQUESTS, TERMINATED, emailFor } from "./data";

/** New rows get ids from this number up, so they never collide with (or look like) seed data. */
export const FIRST_NEW_ID = 1001;

export interface ResetSummary { jobs: number; departments: number; employees: number; leaveRequests: number }

// Fixed timestamps (Toronto time) so that createdAt/updatedAt of seed rows never change between resets.
const at = (date: string, time = "09:00") => `${date} ${time}:00 America/Toronto`;
const SYSTEM_START = at("2012-01-09");

export async function resetData(c: pg.PoolClient | pg.Client): Promise<ResetSummary> {
  await c.query("BEGIN");
  try {
    await c.query("TRUNCATE leave_requests, employees, departments, jobs");

    for (const [id, title, min, max] of JOBS) {
      await c.query("INSERT INTO jobs (id, title, min_salary, max_salary) VALUES ($1, $2, $3, $4)", [id, title, min, max]);
    }
    for (const [id, name, code, location] of DEPARTMENTS) {
      await c.query(
        "INSERT INTO departments (id, name, code, location, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $5)",
        [id, name, code, location, SYSTEM_START]);
    }
    // Managers always have smaller ids than their reports, so inserting in id order works.
    for (const [id, first, last, gender, jobId, deptId, managerId, salary, dob, hire, phone, country] of EMPLOYEES) {
      const terminated = TERMINATED[id] ?? null;
      await c.query(
        `INSERT INTO employees (id, first_name, last_name, gender, email, phone, date_of_birth, hire_date, job_id, department_id,
                                manager_id, salary, status, termination_date, created_at, updated_at, country_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [id, first, last, gender, emailFor(first, last), phone, dob, hire, jobId, deptId, managerId, salary,
          terminated ? "TERMINATED" : "ACTIVE", terminated, at(hire), terminated ? at(terminated, "17:00") : at(hire), country]);
    }
    for (const [id, , , , managerId] of DEPARTMENTS) {
      if (managerId !== null) await c.query("UPDATE departments SET manager_id = $2 WHERE id = $1", [id, managerId]);
    }
    for (const [id, employeeId, type, start, end, status, approverId, reason, decisionReason] of LEAVE_REQUESTS) {
      // Requested two weeks before the start (sick leave: on the morning itself) and decided the next day,
      // but never later than the seed date: the seed describes the company as of SEED_DATE.
      const asked = type === "SICK" ? start : notAfter(shift(start, -14), shift(SEED_DATE, -6 + (id % 5)));
      const requested = at(asked, type === "SICK" ? "08:15" : "10:30");
      const decided = approverId !== null ? at(type === "SICK" ? asked : shift(asked, 1), type === "SICK" ? "11:00" : "14:00") : null;
      const updated = decided ?? (status === "CANCELLED" ? at(shift(asked, 3), "16:45") : requested);
      await c.query(
        `INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, days, reason, status, approver_id,
                                     decision_reason, decided_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, employeeId, type, start, end, countWeekdays(start, end), reason, status, approverId, decisionReason, decided, requested, updated]);
    }

    for (const table of ["jobs", "departments", "employees", "leave_requests"]) {
      await c.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), ${FIRST_NEW_ID - 1}, true)`);
    }
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    throw err;
  }
  return { jobs: JOBS.length, departments: DEPARTMENTS.length, employees: EMPLOYEES.length, leaveRequests: LEAVE_REQUESTS.length };
}

/** The data reads as if it was last touched on this date (a Monday). */
const SEED_DATE = "2026-11-02";

const notAfter = (date: string, limit: string) => (date > limit ? limit : date);

function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
