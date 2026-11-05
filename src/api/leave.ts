/** Leave requests: request time off, then the manager approves or rejects it; the employee may cancel. */
import { Router } from "express";
import { query as sql, transaction, type Db } from "../db";
import { conflict, notFound, rule } from "../errors";
import { body, created, pageBody, paging, pathId, query } from "../http";
import { addDays, countWeekdays, isRealDate, today } from "../dates";
import { LEAVE_COLUMNS, LEAVE_STATUSES, LEAVE_TYPES, findEmployee, toLeave, type LeaveRow } from "../model";
import { date, id, idParam, json, oneOf, optionalText, pageOf, pagingQuery, problem, problemExample, registry, text, z } from "../openapi";
import { LeaveRequestSchema } from "../schemas";
import { leaveBalances } from "./employees";

/** How far back a SICK request may start. VACATION and PERSONAL cannot start in the past at all. */
export const SICK_BACKDATE_DAYS = 30;

const LeaveInput = registry.register("LeaveRequestInput", z.object({
  employeeId: id().openapi({ example: 26 }),
  type: oneOf(LEAVE_TYPES).openapi({ example: "VACATION" }),
  startDate: date().openapi({ example: "2026-12-14" }),
  endDate: date().openapi({ example: "2026-12-18" }),
  reason: optionalText(200).openapi({ example: "Family trip", description: "Optional, up to 200 characters." }),
}).superRefine((v, ctx) => {
  if (!isRealDate(v.startDate) || !isRealDate(v.endDate)) return;
  if (v.endDate < v.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "must be on or after startDate" });
  else if (v.endDate.slice(0, 4) !== v.startDate.slice(0, 4)) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "must be in the same calendar year as startDate" });
  }
}));

const ApproveInput = registry.register("ApproveInput", z.object({
  approverId: id().openapi({ example: 3, description: "The employee's direct manager, or an ACTIVE HR Manager (job 8)." }),
}));
const RejectInput = registry.register("RejectInput", z.object({
  approverId: id().openapi({ example: 3, description: "The employee's direct manager, or an ACTIVE HR Manager (job 8)." }),
  reason: text(1, 200).openapi({ example: "Too many people are away that week." }),
}));

async function load(id: number, db?: Db, lock = false): Promise<LeaveRow> {
  const [row] = await sql<LeaveRow>(`SELECT ${LEAVE_COLUMNS} FROM leave_requests WHERE id = $1${lock ? " FOR UPDATE" : ""}`, [id], db);
  if (!row) throw notFound("Leave request", id);
  return row;
}

export const HR_MANAGER_JOB_ID = 8;

/** Who may decide: the employee's direct manager, or an ACTIVE HR Manager. Never the employee themself. */
async function checkApprover(leave: LeaveRow, approverId: number, db: Db) {
  const approver = await findEmployee(approverId, db);
  if (!approver) throw rule("APPROVER_NOT_FOUND", `Employee ${approverId} does not exist.`);
  if (approverId === leave.employee_id) throw rule("SELF_APPROVAL", "Employees cannot decide their own leave requests.");
  if (approver.status !== "ACTIVE") throw rule("APPROVER_NOT_ACTIVE", `Employee ${approverId} is ${approver.status}.`);
  const employee = (await findEmployee(leave.employee_id, db))!;
  if (employee.manager_id !== approverId && approver.job_id !== HR_MANAGER_JOB_ID) {
    throw rule("NOT_AUTHORIZED_APPROVER",
      `Employee ${approverId} is not the manager of employee ${leave.employee_id} (their manager is ${employee.manager_id ?? "nobody"}) and is not an HR Manager.`);
  }
}

export const router = Router();

// ---- list and get ------------------------------------------------------------------------------

const ListQuery = z.object({
  employeeId: z.string().regex(/^\d+$/, "must be a whole number").optional(),
  status: z.enum(LEAVE_STATUSES, { error: () => `must be one of: ${LEAVE_STATUSES.join(", ")}` }).optional(),
  type: z.enum(LEAVE_TYPES, { error: () => `must be one of: ${LEAVE_TYPES.join(", ")}` }).optional(),
  from: z.string().refine(isRealDate, "must be a real date in the format YYYY-MM-DD").optional(),
  to: z.string().refine(isRealDate, "must be a real date in the format YYYY-MM-DD").optional(),
  page: z.string().optional(),
  size: z.string().optional(),
  sort: z.string().optional(),
});

router.get("/leave-requests", async (req, res) => {
  const q = query(req, ListQuery);
  const p = paging(q, { id: "id", startDate: "start_date", days: "days", createdAt: "created_at" });
  const where: string[] = [];
  const args: unknown[] = [];
  const add = (cond: string, v: unknown) => { args.push(v); where.push(cond.replace("?", `$${args.length}`)); };
  if (q.employeeId) add("employee_id = ?", Number(q.employeeId));
  if (q.status) add("status = ?", q.status);
  if (q.type) add("type = ?", q.type);
  // from/to keep every request that has at least one day inside the range.
  if (q.from) add("end_date >= ?", q.from);
  if (q.to) add("start_date <= ?", q.to);
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [{ n }] = await sql<{ n: number }>(`SELECT COUNT(*)::int AS n FROM leave_requests ${w}`, args);
  const rows = await sql<LeaveRow>(
    `SELECT ${LEAVE_COLUMNS} FROM leave_requests ${w} ORDER BY ${p.orderBy} LIMIT ${p.size} OFFSET ${p.offset}`, args);
  res.json(pageBody(rows.map(toLeave), p, n));
});

router.get("/leave-requests/:id", async (req, res) => {
  res.json(toLeave(await load(pathId(req))));
});

// ---- create ----------------------------------------------------------------------------------

router.post("/leave-requests", async (req, res) => {
  const input = body(req, LeaveInput);
  const row = await transaction(async (c) => {
    // Lock the employee row so two requests for the same person are checked one after the other.
    const emp = await findEmployee(input.employeeId, c, true);
    if (!emp) throw rule("EMPLOYEE_NOT_FOUND", `Employee ${input.employeeId} does not exist.`);
    if (emp.status !== "ACTIVE") throw rule("EMPLOYEE_NOT_ACTIVE", `Employee ${input.employeeId} is ${emp.status} and cannot request leave.`);

    const days = countWeekdays(input.startDate, input.endDate);
    if (days === 0) throw rule("NO_WORKING_DAYS", `${input.startDate} to ${input.endDate} has no weekdays. Leave is counted in weekdays (Monday to Friday).`);

    const now = today();
    if (input.type === "SICK") {
      const earliest = addDays(now, -SICK_BACKDATE_DAYS);
      if (input.startDate < earliest) {
        throw rule("START_DATE_TOO_OLD", `SICK leave can start at most ${SICK_BACKDATE_DAYS} days ago (on or after ${earliest}).`);
      }
    } else if (input.startDate < now) {
      throw rule("START_DATE_IN_PAST", `${input.type} leave cannot start in the past (today is ${now} in Toronto).`);
    }

    const [overlap] = await sql<{ id: number; status: string }>(
      `SELECT id, status FROM leave_requests
        WHERE employee_id = $1 AND status IN ('PENDING', 'APPROVED') AND start_date <= $3 AND end_date >= $2
        ORDER BY id LIMIT 1`, [input.employeeId, input.startDate, input.endDate], c);
    if (overlap) {
      throw conflict("LEAVE_OVERLAP", `These dates overlap leave request ${overlap.id} (${overlap.status}) of employee ${input.employeeId}.`);
    }

    const year = Number(input.startDate.slice(0, 4));
    const bal = (await leaveBalances(input.employeeId, year, c)).find((b) => b.type === input.type)!;
    if (days > bal.remaining) {
      throw rule("LEAVE_BALANCE_EXCEEDED",
        `Employee ${input.employeeId} has ${bal.remaining} ${input.type} day${bal.remaining === 1 ? "" : "s"} left in ${year} ` +
        `(pending requests count); this request needs ${days}.`);
    }

    const [ins] = await sql<{ id: number }>(
      `INSERT INTO leave_requests (employee_id, type, start_date, end_date, days, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.employeeId, input.type, input.startDate, input.endDate, days, input.reason ?? null], c);
    return load(ins.id, c);
  });
  created(res, `/api/v1/leave-requests/${row.id}`, toLeave(row));
});

// ---- decide and cancel -----------------------------------------------------------------------

async function decide(id: number, approverId: number, outcome: "APPROVED" | "REJECTED", reason: string | null) {
  return transaction(async (c) => {
    const leave = await load(id, c, true);
    if (leave.status !== "PENDING") {
      throw conflict("LEAVE_NOT_PENDING", `Leave request ${id} is ${leave.status}; only PENDING requests can be approved or rejected.`);
    }
    await checkApprover(leave, approverId, c);
    await c.query(
      `UPDATE leave_requests SET status = $2, approver_id = $3, decision_reason = $4, decided_at = now(), updated_at = now() WHERE id = $1`,
      [id, outcome, approverId, reason]);
    return load(id, c);
  });
}

router.post("/leave-requests/:id/approve", async (req, res) => {
  const id = pathId(req);
  const input = body(req, ApproveInput);
  res.json(toLeave(await decide(id, input.approverId, "APPROVED", null)));
});

router.post("/leave-requests/:id/reject", async (req, res) => {
  const id = pathId(req);
  const input = body(req, RejectInput);
  res.json(toLeave(await decide(id, input.approverId, "REJECTED", input.reason)));
});

router.post("/leave-requests/:id/cancel", async (req, res) => {
  const id = pathId(req);
  const row = await transaction(async (c) => {
    const leave = await load(id, c, true);
    if (leave.status === "REJECTED" || leave.status === "CANCELLED") {
      throw conflict("LEAVE_NOT_CANCELLABLE", `Leave request ${id} is already ${leave.status}.`);
    }
    if (leave.status === "APPROVED" && leave.start_date <= today()) {
      throw conflict("LEAVE_ALREADY_STARTED", `Leave request ${id} started on ${leave.start_date}; approved leave can only be cancelled before it starts.`);
    }
    await c.query("UPDATE leave_requests SET status = 'CANCELLED', updated_at = now() WHERE id = $1", [id]);
    return load(id, c);
  });
  res.json(toLeave(row));
});

// ---- OpenAPI ---------------------------------------------------------------------------------

const P = "/api/v1/leave-requests";
const e404 = problem("No leave request has this id.", problemExample(404, "NOT_FOUND", "Leave request 999 was not found.", `${P}/999`));
const approverRules = "422 APPROVER_NOT_FOUND, SELF_APPROVAL, APPROVER_NOT_ACTIVE, NOT_AUTHORIZED_APPROVER (must be the employee's direct manager or an HR Manager, job 8).";

registry.registerPath({
  method: "get", path: P, tags: ["Leave requests"], summary: "Search leave requests (paged)",
  description: "Filters are optional and combine with AND. `from`/`to` keep requests with at least one day in the range. " +
    "Sort fields: id, startDate, days, createdAt. Default: id,asc.",
  request: {
    query: z.object({
      employeeId: z.string().optional().openapi({ example: "23" }),
      status: z.enum(LEAVE_STATUSES).optional(),
      type: z.enum(LEAVE_TYPES).optional(),
      from: z.string().optional().openapi({ example: "2026-01-01" }),
      to: z.string().optional().openapi({ example: "2026-12-31" }),
      ...pagingQuery,
      sort: z.string().optional().openapi({ example: "startDate,desc" }),
    }),
  },
  responses: { 200: json(pageOf("LeaveRequestPage", LeaveRequestSchema), "One page of leave requests."), 400: problem("A query parameter is invalid.") },
});
registry.registerPath({
  method: "post", path: P, tags: ["Leave requests"], summary: "Request leave",
  description: [
    "Creates a PENDING request. `days` is the number of weekdays (Monday to Friday) from startDate to endDate; there is no holiday list.",
    "Checked in this order:",
    "1. 400 VALIDATION_FAILED: fields, endDate before startDate, or the two dates in different years",
    "2. 422 EMPLOYEE_NOT_FOUND, EMPLOYEE_NOT_ACTIVE",
    "3. 422 NO_WORKING_DAYS: only weekend days",
    "4. 422 START_DATE_IN_PAST (VACATION, PERSONAL: start today or later) or START_DATE_TOO_OLD (SICK: at most 30 days ago)",
    "5. 409 LEAVE_OVERLAP: overlaps a PENDING or APPROVED request of the same employee",
    "6. 422 LEAVE_BALANCE_EXCEEDED: more days than remain for that type and year (allowance VACATION 20, SICK 10, PERSONAL 3; pending requests count)",
  ].join("\n"),
  request: { body: { required: true, content: { "application/json": { schema: LeaveInput, example: { employeeId: 26, type: "VACATION", startDate: "2026-12-14", endDate: "2026-12-18", reason: "Family trip" } } } } },
  responses: {
    201: json(LeaveRequestSchema, "Created as PENDING. The Location header holds its URL."),
    400: problem("Invalid fields.", problemExample(400, "VALIDATION_FAILED", "One or more fields are invalid.", P, [{ field: "endDate", message: "must be on or after startDate" }])),
    409: problem("The dates overlap another active request.", problemExample(409, "LEAVE_OVERLAP", "These dates overlap leave request 26 (PENDING) of employee 44.", P)),
    422: problem("A business rule is broken.", problemExample(422, "LEAVE_BALANCE_EXCEEDED", "Employee 23 has 5 VACATION days left in 2026 (pending requests count); this request needs 6.", P)),
  },
});
registry.registerPath({
  method: "get", path: `${P}/{id}`, tags: ["Leave requests"], summary: "Get one leave request",
  request: { params: idParam }, responses: { 200: json(LeaveRequestSchema, "The leave request."), 404: e404 },
});
registry.registerPath({
  method: "post", path: `${P}/{id}/approve`, tags: ["Leave requests"], summary: "Approve a pending request",
  description: `Order: 400, 404, 409 LEAVE_NOT_PENDING, then ${approverRules}`,
  request: { params: idParam, body: { required: true, content: { "application/json": { schema: ApproveInput, example: { approverId: 3 } } } } },
  responses: {
    200: json(LeaveRequestSchema, "Now APPROVED, with approverId and decidedAt set."), 400: problem("approverId is missing or not a number."), 404: e404,
    409: problem("The request is not PENDING.", problemExample(409, "LEAVE_NOT_PENDING", "Leave request 6 is APPROVED; only PENDING requests can be approved or rejected.", `${P}/6/approve`)),
    422: problem("The approver is not allowed.", problemExample(422, "NOT_AUTHORIZED_APPROVER", "Employee 7 is not the manager of employee 26 (their manager is 3) and is not an HR Manager.", `${P}/24/approve`)),
  },
});
registry.registerPath({
  method: "post", path: `${P}/{id}/reject`, tags: ["Leave requests"], summary: "Reject a pending request",
  description: `A reason (1 to 200 characters) is required. Order: 400, 404, 409 LEAVE_NOT_PENDING, then ${approverRules}`,
  request: { params: idParam, body: { required: true, content: { "application/json": { schema: RejectInput, example: { approverId: 3, reason: "Too many people are away that week." } } } } },
  responses: {
    200: json(LeaveRequestSchema, "Now REJECTED, with approverId, decisionReason and decidedAt set."), 400: problem("approverId or reason is missing or invalid."), 404: e404,
    409: problem("The request is not PENDING."), 422: problem("The approver is not allowed."),
  },
});
registry.registerPath({
  method: "post", path: `${P}/{id}/cancel`, tags: ["Leave requests"], summary: "Cancel a request",
  description: "No body needed (any body is ignored). PENDING requests can always be cancelled; APPROVED ones only before their startDate (409 LEAVE_ALREADY_STARTED). " +
    "REJECTED or CANCELLED requests give 409 LEAVE_NOT_CANCELLABLE. approverId and decidedAt are left unchanged.",
  request: { params: idParam },
  responses: {
    200: json(LeaveRequestSchema, "Now CANCELLED."), 404: e404,
    409: problem("The request cannot be cancelled.", problemExample(409, "LEAVE_NOT_CANCELLABLE", "Leave request 5 is already REJECTED.", `${P}/5/cancel`)),
  },
});
