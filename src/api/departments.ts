/** Departments: full CRUD, plus the employees of one department. */
import { Router } from "express";
import { query as sql, transaction, type Db } from "../db";
import { conflict, notFound, rule, validation } from "../errors";
import { body, created, pathId, query } from "../http";
import { DEPARTMENT_SELECT, EMPLOYEE_COLUMNS, findEmployee, toDepartment, toEmployee, type DepartmentRow, type EmployeeRow } from "../model";
import { id, idParam, json, oneOf, problem, problemExample, registry, text, z } from "../openapi";
import { DepartmentSchema, EmployeeSchema } from "../schemas";

const code = () =>
  z.string({ error: (i) => (i.input === undefined || i.input === null ? "is required" : "must be a string") })
    .regex(/^[A-Z]{2,5}$/, "must be 2 to 5 uppercase letters, like ENG");

const fields = {
  name: text(1, 50).openapi({ example: "Data Science" }),
  code: code().openapi({ example: "DS" }),
  location: text(1, 100).openapi({ example: "Toronto" }),
  managerId: id().nullish().openapi({ example: 2, description: "An ACTIVE employee, or null for no manager." }),
};

const DepartmentInput = registry.register("DepartmentInput", z.object(fields));
const DepartmentPatch = registry.register("DepartmentPatch", z.object({
  name: fields.name.optional(),
  code: fields.code.optional(),
  location: fields.location.optional(),
  managerId: fields.managerId,
}));
type Input = { name: string; code: string; location: string; managerId: number | null };

async function load(id: number, db?: Db): Promise<DepartmentRow> {
  const [row] = await sql<DepartmentRow>(`${DEPARTMENT_SELECT} WHERE d.id = $1`, [id], db);
  if (!row) throw notFound("Department", id);
  return row;
}

/** Business rules for a department's final state. `selfId` is the department being updated, if any. */
async function check(d: Input, db: Db, selfId?: number) {
  if (d.managerId != null) {
    const m = await findEmployee(d.managerId, db);
    if (!m) throw rule("MANAGER_NOT_FOUND", `Employee ${d.managerId} does not exist, so they cannot manage the department.`);
    if (m.status !== "ACTIVE") throw rule("MANAGER_NOT_ACTIVE", `Employee ${d.managerId} is ${m.status} and cannot manage a department.`);
  }
  const [byName] = await sql<{ id: number }>("SELECT id FROM departments WHERE lower(name) = lower($1) AND id <> $2", [d.name, selfId ?? 0], db);
  if (byName) throw conflict("DEPARTMENT_NAME_TAKEN", `A department named "${d.name}" already exists (id ${byName.id}).`);
  const [byCode] = await sql<{ id: number }>("SELECT id FROM departments WHERE code = $1 AND id <> $2", [d.code, selfId ?? 0], db);
  if (byCode) throw conflict("DEPARTMENT_CODE_TAKEN", `The code ${d.code} is already used by department ${byCode.id}.`);
}

export const router = Router();

router.get("/departments", async (_req, res) => {
  const rows = await sql<DepartmentRow>(`${DEPARTMENT_SELECT} ORDER BY d.id`);
  res.json(rows.map(toDepartment));
});

router.get("/departments/:id", async (req, res) => {
  res.json(toDepartment(await load(pathId(req))));
});

router.post("/departments", async (req, res) => {
  const input = body(req, DepartmentInput);
  const d: Input = { ...input, managerId: input.managerId ?? null };
  const row = await transaction(async (c) => {
    await c.query("LOCK TABLE departments IN SHARE ROW EXCLUSIVE MODE");
    await check(d, c);
    const [ins] = await sql<{ id: number }>(
      "INSERT INTO departments (name, code, location, manager_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [d.name, d.code, d.location, d.managerId], c);
    return load(ins.id, c);
  });
  created(res, `/api/v1/departments/${row.id}`, toDepartment(row));
});

async function update(id: number, patch: Partial<Input>) {
  return transaction(async (c) => {
    await c.query("LOCK TABLE departments IN SHARE ROW EXCLUSIVE MODE");
    const cur = await load(id, c);
    const d: Input = {
      name: patch.name ?? cur.name,
      code: patch.code ?? cur.code,
      location: patch.location ?? cur.location,
      managerId: patch.managerId !== undefined ? patch.managerId : cur.manager_id,
    };
    await check(d, c, id);
    await c.query(
      "UPDATE departments SET name = $2, code = $3, location = $4, manager_id = $5, updated_at = now() WHERE id = $1",
      [id, d.name, d.code, d.location, d.managerId]);
    return load(id, c);
  });
}

router.put("/departments/:id", async (req, res) => {
  const id = pathId(req);
  const input = body(req, DepartmentInput);
  res.json(toDepartment(await update(id, { ...input, managerId: input.managerId ?? null })));
});

router.patch("/departments/:id", async (req, res) => {
  const id = pathId(req);
  const input = body(req, DepartmentPatch);
  if (Object.values(input).every((v) => v === undefined)) {
    throw validation([{ field: "body", message: "must contain at least one of: name, code, location, managerId" }]);
  }
  res.json(toDepartment(await update(id, input)));
});

router.delete("/departments/:id", async (req, res) => {
  const id = pathId(req);
  await transaction(async (c) => {
    await load(id, c);
    const [{ n }] = await sql<{ n: number }>("SELECT COUNT(*)::int AS n FROM employees WHERE department_id = $1", [id], c);
    if (n > 0) {
      throw conflict("DEPARTMENT_HAS_EMPLOYEES",
        `Department ${id} still has ${n} employee${n === 1 ? "" : "s"} (terminated employees count too). Move or delete them first.`);
    }
    await c.query("DELETE FROM departments WHERE id = $1", [id]);
  });
  res.status(204).end();
});

const DeptEmployeesQuery = z.object({ status: oneOf(["ACTIVE", "TERMINATED"]).optional() });

router.get("/departments/:id/employees", async (req, res) => {
  const id = pathId(req);
  const q = query(req, DeptEmployeesQuery);
  await load(id);
  const rows = await sql<EmployeeRow>(
    `SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE department_id = $1 AND ($2::text IS NULL OR status = $2) ORDER BY id`,
    [id, q.status ?? null]);
  res.json(rows.map(toEmployee));
});

// ---- OpenAPI ---------------------------------------------------------------------------------

const P = "/api/v1/departments";
const e400 = problem("Invalid input: see `errors` for each field.", problemExample(400, "VALIDATION_FAILED", "One or more fields are invalid.", P,
  [{ field: "code", message: "must be 2 to 5 uppercase letters, like ENG" }]));
const e404 = problem("No department has this id.", problemExample(404, "NOT_FOUND", "Department 99 was not found.", `${P}/99`));
const e409 = problem("The name (ignoring case) or the code is already used: DEPARTMENT_NAME_TAKEN or DEPARTMENT_CODE_TAKEN.",
  problemExample(409, "DEPARTMENT_NAME_TAKEN", "A department named \"Engineering\" already exists (id 2).", P));
const e422 = problem("The manager does not exist (MANAGER_NOT_FOUND) or is terminated (MANAGER_NOT_ACTIVE).",
  problemExample(422, "MANAGER_NOT_ACTIVE", "Employee 58 is TERMINATED and cannot manage a department.", P));
const e415 = problem("The body was not sent as application/json.", problemExample(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request body as JSON with the header Content-Type: application/json (received: text/plain).", P));

registry.registerPath({
  method: "get", path: P, tags: ["Departments"], summary: "List all departments",
  description: "Returns a plain JSON array (not a page), ordered by id.",
  responses: { 200: json(z.array(DepartmentSchema), "All departments.") },
});
registry.registerPath({
  method: "post", path: P, tags: ["Departments"], summary: "Create a department",
  description: "Name: 1 to 50 characters, unique ignoring case. Code: 2 to 5 uppercase letters, unique. Location: 1 to 100 characters. " +
    "managerId is optional and must be an ACTIVE employee. Responds 201 with a Location header.",
  request: { body: { required: true, content: { "application/json": { schema: DepartmentInput, example: { name: "Data Science", code: "DS", location: "Toronto", managerId: 2 } } } } },
  responses: { 201: json(DepartmentSchema, "Created. The Location header holds the new department's URL."), 400: e400, 409: e409, 415: e415, 422: e422 },
});
registry.registerPath({
  method: "get", path: `${P}/{id}`, tags: ["Departments"], summary: "Get one department",
  request: { params: idParam }, responses: { 200: json(DepartmentSchema, "The department."), 404: e404 },
});
registry.registerPath({
  method: "put", path: `${P}/{id}`, tags: ["Departments"], summary: "Replace a department",
  description: "PUT replaces the whole department: send every field. Leaving managerId out sets it to null.",
  request: { params: idParam, body: { required: true, content: { "application/json": { schema: DepartmentInput, example: { name: "Engineering", code: "ENG", location: "Waterloo", managerId: 2 } } } } },
  responses: { 200: json(DepartmentSchema, "The updated department."), 400: e400, 404: e404, 409: e409, 422: e422 },
});
registry.registerPath({
  method: "patch", path: `${P}/{id}`, tags: ["Departments"], summary: "Update some fields of a department",
  description: "PATCH changes only the fields you send. Send managerId: null to remove the manager.",
  request: { params: idParam, body: { required: true, content: { "application/json": { schema: DepartmentPatch, example: { location: "Montreal" } } } } },
  responses: { 200: json(DepartmentSchema, "The updated department."), 400: e400, 404: e404, 409: e409, 422: e422 },
});
registry.registerPath({
  method: "delete", path: `${P}/{id}`, tags: ["Departments"], summary: "Delete a department",
  description: "Only a department with no employees at all (active or terminated) can be deleted. Department 9 (Research Lab) starts empty.",
  request: { params: idParam },
  responses: {
    204: { description: "Deleted. No body." }, 404: e404,
    409: problem("The department still has employees.", problemExample(409, "DEPARTMENT_HAS_EMPLOYEES", "Department 2 still has 14 employees (terminated employees count too). Move or delete them first.", `${P}/2`)),
  },
});
registry.registerPath({
  method: "get", path: `${P}/{id}/employees`, tags: ["Departments"], summary: "List the employees of a department",
  description: "A plain JSON array ordered by id. Filter with ?status=ACTIVE or ?status=TERMINATED.",
  request: { params: idParam, query: z.object({ status: z.enum(["ACTIVE", "TERMINATED"]).optional() }) },
  responses: { 200: json(z.array(EmployeeSchema), "The department's employees."), 404: e404 },
});
