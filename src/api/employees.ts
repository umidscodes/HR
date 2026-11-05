/** Employees: search, CRUD, termination, direct reports and the leave balance. */
import { Router } from "express";
import { query as sql, transaction, type Db } from "../db";
import { conflict, notFound, rule, validation, type FieldError } from "../errors";
import { body, created, pageBody, paging, pathId, query } from "../http";
import { currentYear, eighteenthBirthday, isRealDate, today } from "../dates";
import { ALLOWANCE, EMPLOYEE_COLUMNS, LEAVE_TYPES, findEmployee, toEmployee, type EmployeeRow, type LeaveType } from "../model";
import { date, email, id, idParam, json, pageOf, pagingQuery, phone, problem, problemExample, registry, text, wholeNumber, z } from "../openapi";
import { EmployeeSchema } from "../schemas";
import type { JobRow } from "./jobs";

// ---- input -----------------------------------------------------------------------------------

const fields = {
  firstName: text(1, 50).openapi({ example: "Jane" }),
  lastName: text(1, 50).openapi({ example: "Doe" }),
  email: email().openapi({ example: "jane.doe@icehr.test", description: "Stored in lower case. Must be unique." }),
  phone: phone().openapi({ example: "416-555-0199", description: "Optional. Format 416-555-0100." }),
  dateOfBirth: date().openapi({ example: "1995-06-15" }),
  hireDate: date().openapi({ example: "2026-11-02" }),
  jobId: id().openapi({ example: 4 }),
  departmentId: id().openapi({ example: 2 }),
  managerId: id().nullish().openapi({ example: 9, description: "Optional. An ACTIVE employee." }),
  salary: wholeNumber(1).openapi({ example: 95000, description: "Annual salary in whole dollars, within the job's range." }),
};

const EmployeeInput = registry.register("EmployeeInput", z.object(fields));
const EmployeePatch = registry.register("EmployeePatch", z.object({
  firstName: fields.firstName.optional(),
  lastName: fields.lastName.optional(),
  email: fields.email.optional(),
  phone: fields.phone,
  dateOfBirth: fields.dateOfBirth.optional(),
  hireDate: fields.hireDate.optional(),
  jobId: fields.jobId.optional(),
  departmentId: fields.departmentId.optional(),
  managerId: fields.managerId,
  salary: fields.salary.optional(),
}));
const TerminateInput = registry.register("TerminateInput", z.object({
  terminationDate: date().openapi({ example: "2026-11-05", description: "Not before the hire date and not in the future." }),
}));

interface Emp {
  firstName: string; lastName: string; email: string; phone: string | null; dateOfBirth: string; hireDate: string;
  jobId: number; departmentId: number; managerId: number | null; salary: number;
}

const fromRow = (r: EmployeeRow): Emp => ({
  firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone, dateOfBirth: r.date_of_birth,
  hireDate: r.hire_date, jobId: r.job_id, departmentId: r.department_id, managerId: r.manager_id, salary: r.salary,
});

// ---- rules -----------------------------------------------------------------------------------

/**
 * The business rules for an employee's final state, checked in this order (the first broken rule wins):
 * job, department and manager exist; manager rules; age at hire; hire date; salary range; unique email.
 */
async function check(e: Emp, db: Db, selfId?: number) {
  const [job] = await sql<JobRow>("SELECT id, title, min_salary, max_salary FROM jobs WHERE id = $1", [e.jobId], db);
  if (!job) throw rule("JOB_NOT_FOUND", `Job ${e.jobId} does not exist.`);
  const [dept] = await sql<{ id: number }>("SELECT id FROM departments WHERE id = $1", [e.departmentId], db);
  if (!dept) throw rule("DEPARTMENT_NOT_FOUND", `Department ${e.departmentId} does not exist.`);
  if (e.managerId != null) {
    if (selfId !== undefined && e.managerId === selfId) throw rule("SELF_MANAGER", "An employee cannot be their own manager.");
    const m = await findEmployee(e.managerId, db);
    if (!m) throw rule("MANAGER_NOT_FOUND", `Employee ${e.managerId} does not exist, so they cannot be the manager.`);
    if (m.status !== "ACTIVE") throw rule("MANAGER_NOT_ACTIVE", `Employee ${e.managerId} is ${m.status} and cannot be a manager.`);
    if (selfId !== undefined) {
      // Walk up the chain from the new manager. Reaching this employee would create a loop.
      const [loop] = await sql<{ found: boolean }>(
        `WITH RECURSIVE chain AS (
           SELECT id, manager_id, 1 AS depth FROM employees WHERE id = $1
           UNION ALL
           SELECT e.id, e.manager_id, c.depth + 1 FROM employees e JOIN chain c ON e.id = c.manager_id WHERE c.depth < 1000
         ) SELECT EXISTS (SELECT 1 FROM chain WHERE id = $2) AS found`, [e.managerId, selfId], db);
      if (loop.found) {
        throw rule("MANAGER_CYCLE", `Employee ${e.managerId} reports (directly or indirectly) to employee ${selfId}, so they cannot be ${selfId}'s manager.`);
      }
    }
  }
  const adult = eighteenthBirthday(e.dateOfBirth);
  if (e.hireDate < adult) {
    throw rule("EMPLOYEE_UNDERAGE", `An employee must be at least 18 on their hire date. Someone born on ${e.dateOfBirth} turns 18 on ${adult}.`);
  }
  if (e.hireDate > today()) throw rule("HIRE_DATE_IN_FUTURE", `The hire date ${e.hireDate} is in the future (today is ${today()} in Toronto).`);
  if (e.salary < job.min_salary || e.salary > job.max_salary) {
    throw rule("SALARY_OUT_OF_RANGE",
      `Salary ${e.salary} is outside the range for ${job.title} (${job.min_salary} to ${job.max_salary}).`);
  }
  const [dup] = await sql<{ id: number }>("SELECT id FROM employees WHERE email = $1 AND id <> $2", [e.email, selfId ?? 0], db);
  if (dup) throw conflict("EMAIL_TAKEN", `The email ${e.email} is already used by employee ${dup.id}.`);
}

async function load(id: number, db?: Db, lock = false): Promise<EmployeeRow> {
  const row = await findEmployee(id, db, lock);
  if (!row) throw notFound("Employee", id);
  return row;
}

// ---- list ------------------------------------------------------------------------------------

const ListQuery = z.object({
  departmentId: z.string().regex(/^\d+$/, "must be a whole number").optional(),
  jobId: z.string().regex(/^\d+$/, "must be a whole number").optional(),
  managerId: z.string().regex(/^\d+$/, "must be a whole number").optional(),
  status: z.enum(["ACTIVE", "TERMINATED"], { error: () => "must be ACTIVE or TERMINATED" }).optional(),
  search: z.string().max(100, "must be at most 100 characters").optional(),
  hiredFrom: z.string().refine(isRealDate, "must be a real date in the format YYYY-MM-DD").optional(),
  hiredTo: z.string().refine(isRealDate, "must be a real date in the format YYYY-MM-DD").optional(),
  minSalary: z.string().regex(/^\d+$/, "must be a whole number").optional(),
  maxSalary: z.string().regex(/^\d+$/, "must be a whole number").optional(),
  page: z.string().optional(),
  size: z.string().optional(),
  sort: z.string().optional(),
});

const SORTABLE = {
  id: "id", firstName: "first_name", lastName: "last_name", email: "email", hireDate: "hire_date",
  dateOfBirth: "date_of_birth", salary: "salary",
};

export const router = Router();

router.get("/employees", async (req, res) => {
  const q = query(req, ListQuery);
  const p = paging(q, SORTABLE);
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (cond: string, v: unknown) => { args.push(v); where.push(cond.replace("?", `$${args.length}`)); };
  if (q.departmentId) add("department_id = ?", Number(q.departmentId));
  if (q.jobId) add("job_id = ?", Number(q.jobId));
  if (q.managerId) add("manager_id = ?", Number(q.managerId));
  if (q.status) add("status = ?", q.status);
  if (q.search?.trim()) {
    add("(first_name || ' ' || last_name || ' ' || email) ILIKE ?", `%${q.search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  if (q.hiredFrom) add("hire_date >= ?", q.hiredFrom);
  if (q.hiredTo) add("hire_date <= ?", q.hiredTo);
  if (q.minSalary) add("salary >= ?", Number(q.minSalary));
  if (q.maxSalary) add("salary <= ?", Number(q.maxSalary));
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [{ n }] = await sql<{ n: number }>(`SELECT COUNT(*)::int AS n FROM employees ${w}`, args);
  const rows = await sql<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees ${w} ORDER BY ${p.orderBy} LIMIT ${p.size} OFFSET ${p.offset}`, args);
  res.json(pageBody(rows.map(toEmployee), p, n));
});

router.get("/employees/:id", async (req, res) => {
  res.json(toEmployee(await load(pathId(req))));
});

// ---- create, replace, update -----------------------------------------------------------------

router.post("/employees", async (req, res) => {
  const input = body(req, EmployeeInput);
  const e: Emp = { ...input, phone: input.phone ?? null, managerId: input.managerId ?? null };
  const row = await transaction(async (c) => {
    await c.query("LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE");
    await check(e, c);
    const [ins] = await sql<{ id: number }>(
      `INSERT INTO employees (first_name, last_name, email, phone, date_of_birth, hire_date, job_id, department_id, manager_id, salary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [e.firstName, e.lastName, e.email, e.phone, e.dateOfBirth, e.hireDate, e.jobId, e.departmentId, e.managerId, e.salary], c);
    return load(ins.id, c);
  });
  created(res, `/api/v1/employees/${row.id}`, toEmployee(row));
});

async function update(id: number, patch: Partial<Emp>) {
  return transaction(async (c) => {
    await c.query("LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE");
    const cur = await load(id, c);
    if (cur.status === "TERMINATED") throw conflict("EMPLOYEE_TERMINATED", `Employee ${id} is terminated and can no longer be changed.`);
    const e: Emp = { ...fromRow(cur) };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (e as unknown as Record<string, unknown>)[k] = v;
    await check(e, c, id);
    await c.query(
      `UPDATE employees SET first_name = $2, last_name = $3, email = $4, phone = $5, date_of_birth = $6, hire_date = $7,
              job_id = $8, department_id = $9, manager_id = $10, salary = $11, updated_at = now() WHERE id = $1`,
      [id, e.firstName, e.lastName, e.email, e.phone, e.dateOfBirth, e.hireDate, e.jobId, e.departmentId, e.managerId, e.salary]);
    return load(id, c);
  });
}

router.put("/employees/:id", async (req, res) => {
  const id = pathId(req);
  const input = body(req, EmployeeInput);
  res.json(toEmployee(await update(id, { ...input, phone: input.phone ?? null, managerId: input.managerId ?? null })));
});

router.patch("/employees/:id", async (req, res) => {
  const id = pathId(req);
  const input = body(req, EmployeePatch);
  if (Object.values(input).every((v) => v === undefined)) {
    throw validation([{ field: "body", message: "must contain at least one employee field, such as salary" }]);
  }
  res.json(toEmployee(await update(id, input as Partial<Emp>)));
});

// ---- delete and terminate ------------------------------------------------------------------

async function reportCount(id: number, db: Db, activeOnly: boolean): Promise<number> {
  const [{ n }] = await sql<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM employees WHERE manager_id = $1${activeOnly ? " AND status = 'ACTIVE'" : ""}`, [id], db);
  return n;
}

router.delete("/employees/:id", async (req, res) => {
  const id = pathId(req);
  await transaction(async (c) => {
    await c.query("LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE");
    await load(id, c);
    const n = await reportCount(id, c, false);
    if (n > 0) {
      throw conflict("EMPLOYEE_HAS_REPORTS",
        `Employee ${id} is the manager of ${n} employee${n === 1 ? "" : "s"}. Give them another manager first.`);
    }
    // The database does the rest: their leave requests are deleted (ON DELETE CASCADE), and any
    // department they managed, or leave they decided, keeps its row with the id set to NULL.
    await c.query("DELETE FROM employees WHERE id = $1", [id]);
  });
  res.status(204).end();
});

router.post("/employees/:id/terminate", async (req, res) => {
  const id = pathId(req);
  const input = body(req, TerminateInput);
  const row = await transaction(async (c) => {
    const cur = await load(id, c, true);
    if (cur.status === "TERMINATED") throw conflict("ALREADY_TERMINATED", `Employee ${id} was already terminated on ${cur.termination_date}.`);
    const n = await reportCount(id, c, true);
    if (n > 0) {
      throw conflict("EMPLOYEE_HAS_REPORTS",
        `Employee ${id} still manages ${n} active employee${n === 1 ? "" : "s"}. Give them another manager first.`);
    }
    if (input.terminationDate < cur.hire_date) {
      throw rule("TERMINATION_BEFORE_HIRE", `The termination date ${input.terminationDate} is before the hire date ${cur.hire_date}.`);
    }
    if (input.terminationDate > today()) {
      throw rule("TERMINATION_DATE_IN_FUTURE", `The termination date ${input.terminationDate} is in the future (today is ${today()} in Toronto).`);
    }
    await c.query("UPDATE employees SET status = 'TERMINATED', termination_date = $2, updated_at = now() WHERE id = $1", [id, input.terminationDate]);
    // Leave that has not happened yet is cancelled: every pending request, and approved leave starting after the last day.
    await c.query(
      `UPDATE leave_requests SET status = 'CANCELLED', decision_reason = 'Employee terminated.', updated_at = now()
        WHERE employee_id = $1 AND (status = 'PENDING' OR (status = 'APPROVED' AND start_date > $2))`, [id, input.terminationDate]);
    // A department this person managed now has no manager.
    await c.query("UPDATE departments SET manager_id = NULL, updated_at = now() WHERE manager_id = $1", [id]);
    return load(id, c);
  });
  res.json(toEmployee(row));
});

// ---- reports and leave balance -------------------------------------------------------------

router.get("/employees/:id/reports", async (req, res) => {
  const id = pathId(req);
  await load(id);
  const rows = await sql<EmployeeRow>(`SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE manager_id = $1 ORDER BY id`, [id]);
  res.json(rows.map(toEmployee));
});

const BalanceQuery = z.object({
  year: z.string().regex(/^\d{4}$/, "must be a year such as 2026")
    .refine((y) => Number(y) >= 2000 && Number(y) <= 2100, "must be from 2000 to 2100").optional(),
});

export interface Balance { type: LeaveType; allowance: number; used: number; pending: number; remaining: number }

/** Allowance, approved days, pending days and what is left, per leave type, for one calendar year. */
export async function leaveBalances(employeeId: number, year: number, db?: Db): Promise<Balance[]> {
  const rows = await sql<{ type: LeaveType; used: number; pending: number }>(
    `SELECT type,
            COALESCE(SUM(days) FILTER (WHERE status = 'APPROVED'), 0)::int AS used,
            COALESCE(SUM(days) FILTER (WHERE status = 'PENDING'), 0)::int  AS pending
       FROM leave_requests
      WHERE employee_id = $1 AND EXTRACT(YEAR FROM start_date) = $2
      GROUP BY type`, [employeeId, year], db);
  return LEAVE_TYPES.map((type) => {
    const r = rows.find((x) => x.type === type);
    const used = r?.used ?? 0, pending = r?.pending ?? 0;
    return { type, allowance: ALLOWANCE[type], used, pending, remaining: ALLOWANCE[type] - used - pending };
  });
}

router.get("/employees/:id/leave-balance", async (req, res) => {
  const id = pathId(req);
  const q = query(req, BalanceQuery);
  await load(id);
  const year = q.year ? Number(q.year) : currentYear();
  res.json({ employeeId: id, year, balances: await leaveBalances(id, year) });
});

// ---- OpenAPI ---------------------------------------------------------------------------------

const P = "/api/v1/employees";
const fe = (errors: FieldError[]) => problemExample(400, "VALIDATION_FAILED", "One or more fields are invalid.", P, errors);
const e400 = problem("Invalid input: `errors` lists every invalid field.", fe([
  { field: "email", message: "must be a valid email address" }, { field: "salary", message: "must be a whole number" }]));
const e404 = problem("No employee has this id.", problemExample(404, "NOT_FOUND", "Employee 999 was not found.", `${P}/999`));
const e409 = problem("EMAIL_TAKEN: another employee already has this email (compared in lower case). EMPLOYEE_TERMINATED: terminated employees cannot be changed.",
  problemExample(409, "EMAIL_TAKEN", "The email ethan.nguyen@icehr.test is already used by employee 13.", P));
const e415 = problem("The body was not sent as application/json.", problemExample(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as JSON with the header Content-Type: application/json (received: text/plain).", P));
const e422 = problem(
  "A business rule is broken. Codes, in the order they are checked: JOB_NOT_FOUND, DEPARTMENT_NOT_FOUND, SELF_MANAGER, MANAGER_NOT_FOUND, " +
  "MANAGER_NOT_ACTIVE, MANAGER_CYCLE, EMPLOYEE_UNDERAGE, HIRE_DATE_IN_FUTURE, SALARY_OUT_OF_RANGE.",
  problemExample(422, "SALARY_OUT_OF_RANGE", "Salary 30000 is outside the range for Software Engineer (80000 to 115000).", P));
const rulesText =
  "Rules: email unique (409 EMAIL_TAKEN); jobId, departmentId and managerId must exist; the manager must be ACTIVE; " +
  "at least 18 years old on the hire date; hire date not in the future; salary within the job's range.";

registry.registerPath({
  method: "get", path: P, tags: ["Employees"], summary: "Search employees (paged)",
  description: "All filters are optional and combine with AND. `search` matches first name, last name or email (contains, ignoring case). " +
    "Sort fields: id, firstName, lastName, email, hireDate, dateOfBirth, salary. Default: id,asc.",
  request: {
    query: z.object({
      departmentId: z.string().optional().openapi({ example: "2" }),
      jobId: z.string().optional(),
      managerId: z.string().optional(),
      status: z.enum(["ACTIVE", "TERMINATED"]).optional(),
      search: z.string().optional().openapi({ example: "nguyen" }),
      hiredFrom: z.string().optional().openapi({ example: "2020-01-01" }),
      hiredTo: z.string().optional().openapi({ example: "2024-12-31" }),
      minSalary: z.string().optional(),
      maxSalary: z.string().optional(),
      ...pagingQuery,
      sort: z.string().optional().openapi({ example: "salary,desc" }),
    }),
  },
  responses: {
    200: json(pageOf("EmployeePage", EmployeeSchema), "One page of employees."),
    400: problem("A query parameter is invalid.", problemExample(400, "VALIDATION_FAILED", "One or more fields are invalid.", P, [{ field: "size", message: "must be a whole number from 1 to 100" }])),
  },
});
registry.registerPath({
  method: "post", path: P, tags: ["Employees"], summary: "Hire an employee",
  description: `Creates an ACTIVE employee. ${rulesText} Responds 201 with a Location header.`,
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: EmployeeInput,
          example: { firstName: "Jane", lastName: "Doe", email: "jane.doe@icehr.test", phone: "416-555-0199", dateOfBirth: "1995-06-15", hireDate: "2026-11-02", jobId: 4, departmentId: 2, managerId: 9, salary: 95000 },
        },
      },
    },
  },
  responses: { 201: json(EmployeeSchema, "Created. The Location header holds the new employee's URL."), 400: e400, 409: e409, 415: e415, 422: e422 },
});
registry.registerPath({
  method: "get", path: `${P}/{id}`, tags: ["Employees"], summary: "Get one employee",
  request: { params: idParam }, responses: { 200: json(EmployeeSchema, "The employee."), 404: e404 },
});
registry.registerPath({
  method: "put", path: `${P}/{id}`, tags: ["Employees"], summary: "Replace an employee",
  description: `PUT replaces every editable field: send them all. Leaving out phone or managerId sets them to null. ${rulesText} ` +
    "Also: an employee cannot be their own manager (SELF_MANAGER) or report to someone below them (MANAGER_CYCLE).",
  request: {
    params: idParam,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: EmployeeInput,
          example: { firstName: "Ethan", lastName: "Nguyen", email: "ethan.nguyen@icehr.test", phone: "416-555-0113", dateOfBirth: "1996-02-14", hireDate: "2023-04-03", jobId: 4, departmentId: 2, managerId: 9, salary: 90000 },
        },
      },
    },
  },
  responses: { 200: json(EmployeeSchema, "The updated employee."), 400: e400, 404: e404, 409: e409, 422: e422 },
});
registry.registerPath({
  method: "patch", path: `${P}/{id}`, tags: ["Employees"], summary: "Update some fields of an employee",
  description: `PATCH changes only the fields you send; the result must still follow every rule. Send "managerId": null or "phone": null to clear them. ${rulesText}`,
  request: { params: idParam, body: { required: true, content: { "application/json": { schema: EmployeePatch, example: { salary: 98000 } } } } },
  responses: { 200: json(EmployeeSchema, "The updated employee."), 400: e400, 404: e404, 409: e409, 422: e422 },
});
registry.registerPath({
  method: "delete", path: `${P}/{id}`, tags: ["Employees"], summary: "Delete an employee",
  description: "Deletes the employee and, through ON DELETE CASCADE, their leave requests. A department they managed keeps its row with managerId set to null. " +
    "Someone who is still anyone's manager cannot be deleted (409 EMPLOYEE_HAS_REPORTS).",
  request: { params: idParam },
  responses: {
    204: { description: "Deleted. No body." }, 404: e404,
    409: problem("The employee is someone's manager.", problemExample(409, "EMPLOYEE_HAS_REPORTS", "Employee 9 is the manager of 5 employees. Give them another manager first.", `${P}/9`)),
  },
});
registry.registerPath({
  method: "post", path: `${P}/{id}/terminate`, tags: ["Employees"], summary: "Terminate an employee",
  description: "Sets status TERMINATED and the termination date. In the same transaction: every PENDING leave request, and APPROVED leave starting after the " +
    "termination date, becomes CANCELLED with decisionReason \"Employee terminated.\"; a department they managed gets managerId null. " +
    "Checked in order: 409 ALREADY_TERMINATED, 409 EMPLOYEE_HAS_REPORTS (still manages ACTIVE employees), 422 TERMINATION_BEFORE_HIRE, 422 TERMINATION_DATE_IN_FUTURE.",
  request: { params: idParam, body: { required: true, content: { "application/json": { schema: TerminateInput, example: { terminationDate: "2026-11-05" } } } } },
  responses: {
    200: json(EmployeeSchema, "The terminated employee."),
    400: problem("terminationDate is missing or not a date."), 404: e404,
    409: problem("ALREADY_TERMINATED or EMPLOYEE_HAS_REPORTS.", problemExample(409, "ALREADY_TERMINATED", "Employee 58 was already terminated on 2026-06-30.", `${P}/58/terminate`)),
    422: problem("TERMINATION_BEFORE_HIRE or TERMINATION_DATE_IN_FUTURE."),
  },
});
registry.registerPath({
  method: "get", path: `${P}/{id}/reports`, tags: ["Employees"], summary: "List an employee's direct reports",
  description: "Employees whose managerId is this employee, active or terminated, as a plain JSON array ordered by id.",
  request: { params: idParam }, responses: { 200: json(z.array(EmployeeSchema), "Direct reports (may be empty)."), 404: e404 },
});
registry.registerPath({
  method: "get", path: `${P}/{id}/leave-balance`, tags: ["Employees"], summary: "Leave balance for a year",
  description: "Allowance per calendar year: VACATION 20, SICK 10, PERSONAL 3 days. `used` = APPROVED days, `pending` = PENDING days, " +
    "`remaining` = allowance - used - pending. A request counts in the year its startDate falls in. Default year: the current year in Toronto.",
  request: { params: idParam, query: z.object({ year: z.string().optional().openapi({ example: "2026" }) }) },
  responses: {
    200: json(registry.register("LeaveBalance", z.object({
      employeeId: z.number().int().openapi({ example: 23 }),
      year: z.number().int().openapi({ example: 2026 }),
      balances: z.array(z.object({
        type: z.enum(["VACATION", "SICK", "PERSONAL"]),
        allowance: z.number().int().openapi({ example: 20 }),
        used: z.number().int().openapi({ example: 15 }),
        pending: z.number().int().openapi({ example: 0 }),
        remaining: z.number().int().openapi({ example: 5 }),
      })),
    })), "Always three entries, in the order VACATION, SICK, PERSONAL."),
    400: problem("The year is not a 4-digit year from 2000 to 2100."), 404: e404,
  },
});
