/**
 * Smoke tests: every documented business rule, through the real HTTP API.
 * Each test resets the data first, so tests never depend on each other.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import { addDays, today } from "../src/dates";
import { call, del, get, newEmployee, nextMonday, patch, post, put, reset, start, stop } from "./helpers";

beforeAll(start);
afterAll(stop);
beforeEach(reset);

const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

describe("conventions", () => {
  it("health is UP and reports Toronto's date", async () => {
    const r = await get("/health");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ status: "UP", database: "UP", today: today() });
  });

  it("JSON responses say exactly application/json, errors exactly application/problem+json (no charset)", async () => {
    expect((await get("/employees/5")).headers.get("content-type")).toBe("application/json");
    expect((await get("/employees/5")).body.firstName).toBe("Chloé");
    expect((await get("/jobs")).headers.get("content-type")).toBe("application/json");
    expect((await post("/departments", { name: "Legal", code: "LEG", location: "Toronto" })).headers.get("content-type")).toBe("application/json");
    expect((await get("/employees/999")).headers.get("content-type")).toBe("application/problem+json");
    expect((await call("POST", "/departments", "{oops")).headers.get("content-type")).toBe("application/problem+json");
    expect((await del("/jobs/1")).headers.get("content-type")).toBe("application/problem+json");
  });

  it("every response has an X-Request-Id, and a sensible one sent by the client is echoed", async () => {
    expect((await get("/jobs")).headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    const r = await call("GET", "/jobs/1", undefined, { "X-Request-Id": "my-test-42" });
    expect(r.headers.get("x-request-id")).toBe("my-test-42");
  });

  it("reset restores the seed and new ids start at 1001", async () => {
    const created = await post("/employees", newEmployee());
    expect(created.body.id).toBe(1001);
    await del("/employees/13");
    await reset();
    expect((await get("/employees/13")).status).toBe(200);
    expect((await get("/employees/1001")).status).toBe(404);
    expect((await post("/employees", newEmployee())).body.id).toBe(1001);
    const r = await post("/reset");
    expect(r.body).toEqual({ status: "RESET", jobs: 15, departments: 9, employees: 60, leaveRequests: 35 });
  });

  it("unknown endpoints are 404 and wrong methods are 405 with an Allow header", async () => {
    const r404 = await get("/salaries");
    expect(r404.status).toBe(404);
    expect(r404.headers.get("content-type")).toMatch(/^application\/problem\+json/);
    expect(r404.body).toMatchObject({ status: 404, code: "NOT_FOUND", instance: "/api/v1/salaries" });
    const r405 = await del("/jobs/1");
    expect(r405.status).toBe(405);
    expect(r405.headers.get("allow")).toBe("GET, HEAD");
    expect(r405.body.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("explains bad bodies: malformed JSON, wrong content type, no body, not an object", async () => {
    expect((await call("POST", "/departments", "{oops")).body.code).toBe("MALFORMED_JSON");
    const form = await call("POST", "/departments", "name=x", { "Content-Type": "application/x-www-form-urlencoded" });
    expect(form.status).toBe(415);
    expect(form.body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect((await call("POST", "/departments")).body.code).toBe("BODY_REQUIRED");
    const arr = await post("/departments", [1, 2]);
    expect(arr.status).toBe(400);
    expect(arr.body.code).toBe("MALFORMED_JSON");
  });

  it("accepts JSON sent with a non-UTF-8 charset (some clients add ISO-8859-1)", async () => {
    const r = await call("POST", "/departments", { name: "Legal", code: "LEG", location: "Toronto" },
      { "Content-Type": "application/json; charset=ISO-8859-1" });
    expect(r.status).toBe(201);
  });

  it("path ids must be positive whole numbers", async () => {
    for (const bad of ["abc", "0", "1.5", "-3"]) {
      const r = await get(`/employees/${bad}`);
      expect(r.status).toBe(400);
      expect(r.body.errors).toEqual([{ field: "id", message: "must be a positive whole number" }]);
    }
  });
});

describe("jobs", () => {
  it("lists 15 jobs and returns one by id", async () => {
    const all = await get("/jobs");
    expect(all.body).toHaveLength(15);
    expect((await get("/jobs/4")).body).toEqual({ id: 4, title: "Software Engineer", minSalary: 80000, maxSalary: 115000 });
    expect((await get("/jobs/99")).body).toMatchObject({ status: 404, detail: "Job 99 was not found." });
  });
});

describe("departments", () => {
  it("lists 9 departments with active headcounts", async () => {
    const r = await get("/departments");
    expect(r.body).toHaveLength(9);
    expect(r.body[1]).toMatchObject({ id: 2, name: "Engineering", code: "ENG", managerId: 2, employeeCount: 14 });
    expect(r.body[7]).toMatchObject({ id: 8, employeeCount: 9 }); // 10 people, but Tanya (58) is terminated
    expect(r.body[8]).toMatchObject({ id: 9, name: "Research Lab", managerId: null, employeeCount: 0 });
  });

  it("creates with 201 and a Location header", async () => {
    const r = await post("/departments", { name: "Data Science", code: "DS", location: "Toronto", managerId: 2 });
    expect(r.status).toBe(201);
    expect(r.headers.get("location")).toBe("/api/v1/departments/1001");
    expect(r.body).toMatchObject({ id: 1001, name: "Data Science", code: "DS", managerId: 2, employeeCount: 0 });
    expect(r.body.createdAt).toMatch(iso);
  });

  it("validates fields", async () => {
    const r = await post("/departments", { name: " ", code: "ds", location: "x".repeat(101) });
    expect(r.status).toBe(400);
    expect(r.body.errors).toEqual([
      { field: "name", message: "must not be blank" },
      { field: "code", message: "must be 2 to 5 uppercase letters, like ENG" },
      { field: "location", message: "must be at most 100 characters" },
    ]);
  });

  it("names are unique ignoring case; codes are unique", async () => {
    const name = await post("/departments", { name: "ENGINEERING", code: "ENX", location: "x" });
    expect(name.status).toBe(409);
    expect(name.body.code).toBe("DEPARTMENT_NAME_TAKEN");
    const code = await post("/departments", { name: "New", code: "ENG", location: "x" });
    expect(code.body.code).toBe("DEPARTMENT_CODE_TAKEN");
  });

  it("the manager must exist and be active", async () => {
    expect((await post("/departments", { name: "A", code: "AA", location: "x", managerId: 999 })).body.code).toBe("MANAGER_NOT_FOUND");
    expect((await post("/departments", { name: "A", code: "AA", location: "x", managerId: 58 })).body.code).toBe("MANAGER_NOT_ACTIVE");
  });

  it("PUT replaces (a missing managerId becomes null); PATCH changes only what is sent", async () => {
    const p = await put("/departments/3", { name: "QA", code: "QA", location: "Laval" });
    expect(p.body).toMatchObject({ name: "QA", location: "Laval", managerId: null });
    const pa = await patch("/departments/2", { location: "Waterloo" });
    expect(pa.body).toMatchObject({ name: "Engineering", code: "ENG", location: "Waterloo", managerId: 2 });
    expect((await patch("/departments/2", {})).body.errors[0].field).toBe("body");
    expect((await patch("/departments/2", { name: "human RESOURCES" })).body.code).toBe("DEPARTMENT_NAME_TAKEN");
  });

  it("only an empty department can be deleted", async () => {
    const busy = await del("/departments/2");
    expect(busy.status).toBe(409);
    expect(busy.body.code).toBe("DEPARTMENT_HAS_EMPLOYEES");
    expect((await del("/departments/9")).status).toBe(204);
    expect((await get("/departments/9")).status).toBe(404);
    // Terminated employees still count
    expect((await del("/departments/8")).body.detail).toContain("10 employees");
  });

  it("lists a department's employees, optionally by status", async () => {
    expect((await get("/departments/8/employees")).body).toHaveLength(10);
    expect((await get("/departments/8/employees?status=ACTIVE")).body).toHaveLength(9);
    const t = await get("/departments/8/employees?status=TERMINATED");
    expect(t.body.map((e: { id: number }) => e.id)).toEqual([58]);
    expect((await get("/departments/8/employees?status=GONE")).status).toBe(400);
  });
});

describe("employees: read", () => {
  it("returns an employee with the documented shape", async () => {
    const r = await get("/employees/13");
    expect(r.body).toEqual({
      id: 13, firstName: "Ethan", lastName: "Nguyen", gender: "MALE", email: "ethan.nguyen@icehr.test", phone: "416-555-0113",
      dateOfBirth: "1996-02-14", hireDate: "2023-04-03", jobId: 4, departmentId: 2, managerId: 9, salary: 80000,
      status: "ACTIVE", terminationDate: null, createdAt: "2023-04-03T09:00:00-04:00", updatedAt: "2023-04-03T09:00:00-04:00",
    });
    expect((await get("/employees/5")).body).toMatchObject({ firstName: "Chloé", email: "chloe.tremblay@icehr.test" });
    expect((await get("/employees/10")).body).toMatchObject({ lastName: "O'Brien", email: "liam.obrien@icehr.test" });
  });

  it("pages, filters, searches and sorts", async () => {
    const p = await get("/employees");
    expect(p.body).toMatchObject({ page: 0, size: 20, totalElements: 60, totalPages: 3 });
    expect(p.body.content[0].id).toBe(1);
    const last = await get("/employees?page=2&size=25");
    expect(last.body.content).toHaveLength(10);
    expect((await get("/employees?page=9")).body.content).toEqual([]);
    expect((await get("/employees?departmentId=2")).body.totalElements).toBe(14);
    expect((await get("/employees?status=TERMINATED")).body.content.map((e: { id: number }) => e.id)).toEqual([58]);
    expect((await get("/employees?gender=FEMALE")).body.totalElements).toBe(31);
    expect((await get("/employees?gender=MALE&departmentId=2")).body.totalElements).toBe(8);
    expect((await get("/employees?gender=X")).body.errors).toEqual([{ field: "gender", message: "must be MALE or FEMALE" }]);
    expect((await get("/employees?search=NGUYEN")).body.content.map((e: { id: number }) => e.id)).toEqual([13]);
    expect((await get("/employees?search=%25")).body.totalElements).toBe(0); // % is matched literally
    expect((await get("/employees?managerId=9")).body.totalElements).toBe(5);
    expect((await get("/employees?minSalary=150000&sort=salary,desc")).body.content.map((e: { id: number }) => e.id)).toEqual([1, 2, 9]);
    expect((await get("/employees?hiredFrom=2026-01-01")).body.content.map((e: { id: number }) => e.id)).toEqual([51, 60]);
  });

  it("rejects bad paging and sorting", async () => {
    expect((await get("/employees?size=0")).body.errors).toEqual([{ field: "size", message: "must be a whole number from 1 to 100" }]);
    expect((await get("/employees?size=101")).status).toBe(400);
    expect((await get("/employees?page=-1")).status).toBe(400);
    expect((await get("/employees?sort=password")).body.errors[0].field).toBe("sort");
    expect((await get("/employees?sort=salary,up")).body.errors[0].message).toBe("direction must be asc or desc");
    expect((await get("/employees?hiredFrom=2026-02-30")).status).toBe(400);
  });

  it("lists direct reports", async () => {
    expect((await get("/employees/9/reports")).body.map((e: { id: number }) => e.id)).toEqual([13, 14, 15, 16, 17]);
    expect((await get("/employees/13/reports")).body).toEqual([]);
  });
});

describe("employees: create and update", () => {
  it("creates with 201, Location, ACTIVE status and a lower-case email", async () => {
    const r = await post("/employees", newEmployee({ email: "Jane.DOE@IceHR.test", phone: undefined, managerId: undefined }));
    expect(r.status).toBe(201);
    expect(r.headers.get("location")).toBe("/api/v1/employees/1001");
    expect(r.body).toMatchObject({ id: 1001, email: "jane.doe@icehr.test", phone: null, managerId: null, status: "ACTIVE", terminationDate: null });
  });

  it("lists every invalid field at once", async () => {
    const r = await post("/employees", { firstName: "", email: "nope", phone: "4165550100", dateOfBirth: "1995-13-01", jobId: "4", salary: 95000.5 });
    expect(r.status).toBe(400);
    expect(r.body.errors).toEqual([
      { field: "firstName", message: "must not be blank" },
      { field: "lastName", message: "is required" },
      { field: "gender", message: "is required" },
      { field: "email", message: "must be a valid email address" },
      { field: "phone", message: "must be in the format 416-555-0100" },
      { field: "dateOfBirth", message: "must be a real date in the format YYYY-MM-DD" },
      { field: "hireDate", message: "is required" },
      { field: "jobId", message: "must be a number" },
      { field: "departmentId", message: "is required" },
      { field: "salary", message: "must be a whole number" },
    ]);
  });

  it("gender is required and must be MALE or FEMALE", async () => {
    expect((await post("/employees", newEmployee({ gender: "MALE" }))).body.gender).toBe("MALE");
    for (const bad of ["male", "OTHER", "", 1]) {
      const r = await post("/employees", newEmployee({ gender: bad }));
      expect(r.status).toBe(400);
      expect(r.body.errors).toEqual([{ field: "gender", message: "must be one of: MALE, FEMALE" }]);
    }
    expect((await post("/employees", newEmployee({ gender: undefined }))).body.errors).toEqual([{ field: "gender", message: "is required" }]);
    expect((await patch("/employees/13", { gender: "FEMALE" })).body.gender).toBe("FEMALE");
    expect((await patch("/employees/13", { gender: null })).body.errors).toEqual([{ field: "gender", message: "is required" }]);
  });

  it("salary must be inside the job's range, both ends included", async () => {
    expect((await post("/employees", newEmployee({ salary: 80000 }))).status).toBe(201);
    expect((await post("/employees", newEmployee({ salary: 115000 }))).status).toBe(201);
    const low = await post("/employees", newEmployee({ salary: 79999 }));
    expect(low.status).toBe(422);
    expect(low.body).toMatchObject({ code: "SALARY_OUT_OF_RANGE", detail: "Salary 79999 is outside the range for Software Engineer (80000 to 115000)." });
    expect((await post("/employees", newEmployee({ salary: 115001 }))).body.code).toBe("SALARY_OUT_OF_RANGE");
  });

  it("must be at least 18 on the hire date (the 18th birthday itself is fine)", async () => {
    expect((await post("/employees", newEmployee({ dateOfBirth: "2006-03-04", hireDate: "2024-03-04" }))).status).toBe(201);
    const r = await post("/employees", newEmployee({ dateOfBirth: "2006-03-05", hireDate: "2024-03-04" }));
    expect(r.body).toMatchObject({ status: 422, code: "EMPLOYEE_UNDERAGE" });
    // Born on 29 February: 18 on 28 February
    expect((await post("/employees", newEmployee({ dateOfBirth: "2004-02-29", hireDate: "2022-02-28" }))).status).toBe(201);
  });

  it("hire date may be today but not in the future", async () => {
    expect((await post("/employees", newEmployee({ hireDate: today() }))).status).toBe(201);
    expect((await post("/employees", newEmployee({ hireDate: addDays(today(), 1) }))).body.code).toBe("HIRE_DATE_IN_FUTURE");
  });

  it("job, department and manager must exist; the manager must be active", async () => {
    expect((await post("/employees", newEmployee({ jobId: 99 }))).body.code).toBe("JOB_NOT_FOUND");
    expect((await post("/employees", newEmployee({ departmentId: 99 }))).body.code).toBe("DEPARTMENT_NOT_FOUND");
    expect((await post("/employees", newEmployee({ managerId: 999 }))).body.code).toBe("MANAGER_NOT_FOUND");
    expect((await post("/employees", newEmployee({ managerId: 58 }))).body.code).toBe("MANAGER_NOT_ACTIVE");
  });

  it("email is unique, ignoring case; 422 rules are checked before 409", async () => {
    const dup = await post("/employees", newEmployee({ email: "ETHAN.nguyen@icehr.test" }));
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ code: "EMAIL_TAKEN", detail: "The email ethan.nguyen@icehr.test is already used by employee 13." });
    expect((await post("/employees", newEmployee({ email: "ethan.nguyen@icehr.test", salary: 1 }))).body.code).toBe("SALARY_OUT_OF_RANGE");
  });

  it("PUT replaces every field; leaving out phone and managerId clears them", async () => {
    const r = await put("/employees/13", newEmployee({ email: "ethan.nguyen@icehr.test", phone: undefined, managerId: undefined, salary: 90000 }));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: 13, firstName: "Jane", phone: null, managerId: null, salary: 90000 });
    expect(r.body.updatedAt).not.toBe(r.body.createdAt);
    expect((await put("/employees/13", { salary: 90000 })).status).toBe(400);
    expect((await put("/employees/999", newEmployee())).status).toBe(404);
  });

  it("PATCH changes only the fields sent and can clear optional fields with null", async () => {
    const r = await patch("/employees/13", { salary: 85000, phone: null });
    expect(r.body).toMatchObject({ firstName: "Ethan", salary: 85000, phone: null, managerId: 9 });
    expect((await patch("/employees/13", { jobId: 3 })).body.code).toBe("SALARY_OUT_OF_RANGE"); // 85000 is below Senior's range
    expect((await patch("/employees/13", { jobId: 3, salary: 110000 })).status).toBe(200);
  });

  it("no self-management and no loops in the reporting line", async () => {
    expect((await patch("/employees/13", { managerId: 13 })).body.code).toBe("SELF_MANAGER");
    expect((await patch("/employees/9", { managerId: 13 })).body.code).toBe("MANAGER_CYCLE");
    expect((await patch("/employees/1", { managerId: 60 })).body.code).toBe("MANAGER_CYCLE");
    expect((await patch("/employees/13", { managerId: 10 })).status).toBe(200);
  });

  it("terminated employees cannot be changed", async () => {
    const r = await patch("/employees/58", { salary: 50000 });
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("EMPLOYEE_TERMINATED");
  });
});

describe("employees: delete and terminate", () => {
  it("cannot delete a manager", async () => {
    const r = await del("/employees/9");
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ code: "EMPLOYEE_HAS_REPORTS", detail: "Employee 9 is the manager of 5 employees. Give them another manager first." });
  });

  it("deleting removes their leave (CASCADE) and clears references (SET NULL)", async () => {
    expect((await get("/leave-requests?employeeId=16")).body.totalElements).toBe(2);
    expect((await del("/employees/16")).status).toBe(204);
    expect((await get("/employees/16")).status).toBe(404);
    expect((await get("/leave-requests/7")).status).toBe(404);
    // Manager 8 manages department 8 and decided leave 5 and 18; Tanya (58) and the others still report to 8,
    // so move them first, then delete 8.
    for (const id of [52, 53, 54, 55, 56, 57, 58, 59, 60]) {
      if (id === 58) continue;
      await patch(`/employees/${id}`, { managerId: 1 });
    }
    expect((await del("/employees/8")).body.code).toBe("EMPLOYEE_HAS_REPORTS"); // terminated Tanya still reports to 8
  });

  it("terminating cancels future leave and frees the department", async () => {
    // Employee 44 has pending request 28; employee 17 has approved future request 33.
    const t = await post("/employees/44/terminate", { terminationDate: today() });
    expect(t.status).toBe(200);
    expect(t.body).toMatchObject({ status: "TERMINATED", terminationDate: today() });
    const l = await get("/leave-requests/28");
    expect(l.body.status === "CANCELLED" || l.body.startDate <= today()).toBe(true);
    if (l.body.status === "CANCELLED") expect(l.body.decisionReason).toBe("Employee terminated.");
    // A manager with no active reports: terminate Marc (8) after moving his team.
    for (const id of [52, 53, 54, 55, 56, 57, 59, 60]) await patch(`/employees/${id}`, { managerId: 1 });
    expect((await post("/employees/8/terminate", { terminationDate: today() })).status).toBe(200);
    expect((await get("/departments/8")).body.managerId).toBeNull();
  });

  it("termination rules", async () => {
    expect((await post("/employees/58/terminate", { terminationDate: today() })).body.code).toBe("ALREADY_TERMINATED");
    expect((await post("/employees/9/terminate", { terminationDate: today() })).body.code).toBe("EMPLOYEE_HAS_REPORTS");
    expect((await post("/employees/13/terminate", { terminationDate: "2023-04-02" })).body.code).toBe("TERMINATION_BEFORE_HIRE");
    expect((await post("/employees/13/terminate", { terminationDate: "2023-04-03" })).status).toBe(200);
    expect((await post("/employees/14/terminate", { terminationDate: addDays(today(), 1) })).body.code).toBe("TERMINATION_DATE_IN_FUTURE");
    expect((await post("/employees/14/terminate", {})).body.errors).toEqual([{ field: "terminationDate", message: "is required" }]);
  });
});

describe("leave requests", () => {
  const mon = () => nextMonday(2);

  it("creates a PENDING request and counts weekdays only", async () => {
    const m = mon();
    const r = await post("/leave-requests", { employeeId: 13, type: "VACATION", startDate: m, endDate: addDays(m, 4), reason: "Trip" });
    expect(r.status).toBe(201);
    expect(r.headers.get("location")).toBe("/api/v1/leave-requests/1001");
    expect(r.body).toMatchObject({ id: 1001, employeeId: 13, days: 5, status: "PENDING", approverId: null, decidedAt: null, reason: "Trip" });
    // Friday to the next Monday: 2 weekdays
    const fri = addDays(m, 11);
    expect((await post("/leave-requests", { employeeId: 14, type: "VACATION", startDate: fri, endDate: addDays(fri, 3) })).body.days).toBe(2);
  });

  it("validates fields and the date order", async () => {
    const m = mon();
    const r = await post("/leave-requests", { employeeId: 13, type: "HOLIDAY", startDate: m, endDate: addDays(m, -1), reason: "x".repeat(201) });
    expect(r.body.errors).toEqual([
      { field: "type", message: "must be one of: VACATION, SICK, PERSONAL" },
      { field: "reason", message: "must be at most 200 characters" },
    ]);
    expect((await post("/leave-requests", { employeeId: 13, type: "SICK", startDate: m, endDate: addDays(m, -1) })).body.errors)
      .toEqual([{ field: "endDate", message: "must be on or after startDate" }]);
    const y = Number(m.slice(0, 4));
    expect((await post("/leave-requests", { employeeId: 13, type: "VACATION", startDate: `${y}-12-31`, endDate: `${y + 1}-01-02` })).body.errors)
      .toEqual([{ field: "endDate", message: "must be in the same calendar year as startDate" }]);
  });

  it("business rules in order: employee, working days, dates, overlap, balance", async () => {
    const m = mon();
    expect((await post("/leave-requests", { employeeId: 999, type: "SICK", startDate: m, endDate: m })).body.code).toBe("EMPLOYEE_NOT_FOUND");
    expect((await post("/leave-requests", { employeeId: 58, type: "SICK", startDate: m, endDate: m })).body.code).toBe("EMPLOYEE_NOT_ACTIVE");
    const sat = addDays(m, -2);
    expect((await post("/leave-requests", { employeeId: 13, type: "VACATION", startDate: sat, endDate: addDays(sat, 1) })).body.code).toBe("NO_WORKING_DAYS");
    expect((await post("/leave-requests", { employeeId: 13, type: "VACATION", startDate: addDays(today(), -1), endDate: addDays(today(), 3) })).body.code)
      .toBe("START_DATE_IN_PAST");
  });

  it("VACATION and PERSONAL may start today; SICK may start up to 30 days ago", async () => {
    const t = today();
    const weekday = (d: string) => { while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())) d = addDays(d, 1); return d; };
    const sickOk = weekday(addDays(t, -30));
    if (sickOk.slice(0, 4) === t.slice(0, 4)) {
      expect((await post("/leave-requests", { employeeId: 22, type: "SICK", startDate: addDays(t, -30), endDate: sickOk })).status).toBe(201);
    }
    expect((await post("/leave-requests", { employeeId: 22, type: "SICK", startDate: addDays(t, -31), endDate: addDays(t, -31) })).body.code)
      .toBe("START_DATE_TOO_OLD");
    const start = weekday(t);
    if (start.slice(0, 4) === t.slice(0, 4) && start === t) {
      expect((await post("/leave-requests", { employeeId: 24, type: "PERSONAL", startDate: t, endDate: t })).status).toBe(201);
    }
  });

  it("cannot overlap a pending or approved request; rejected and cancelled ones do not block", async () => {
    const m = mon();
    const first = await post("/leave-requests", { employeeId: 13, type: "VACATION", startDate: m, endDate: addDays(m, 2) });
    const clash = await post("/leave-requests", { employeeId: 13, type: "SICK", startDate: addDays(m, 2), endDate: addDays(m, 3) });
    expect(clash.status).toBe(409);
    expect(clash.body).toMatchObject({ code: "LEAVE_OVERLAP", detail: `These dates overlap leave request ${first.body.id} (PENDING) of employee 13.` });
    await post(`/leave-requests/${first.body.id}/cancel`);
    expect((await post("/leave-requests", { employeeId: 13, type: "SICK", startDate: addDays(m, 2), endDate: addDays(m, 3) })).status).toBe(201);
  });

  it("balance: pending and approved days count; the allowance itself is reachable", async () => {
    const m = mon();
    for (let i = 0; i < 3; i++) {
      expect((await post("/leave-requests", { employeeId: 13, type: "PERSONAL", startDate: addDays(m, i), endDate: addDays(m, i) })).status).toBe(201);
    }
    const over = await post("/leave-requests", { employeeId: 13, type: "PERSONAL", startDate: addDays(m, 3), endDate: addDays(m, 3) });
    expect(over.status).toBe(422);
    expect(over.body).toMatchObject({ code: "LEAVE_BALANCE_EXCEEDED" });
    expect(over.body.detail).toContain("has 0 PERSONAL days left");
    const bal = await get(`/employees/13/leave-balance?year=${m.slice(0, 4)}`);
    expect(bal.body.balances[2]).toEqual({ type: "PERSONAL", allowance: 3, used: 0, pending: 3, remaining: 0 });
  });

  it("reports seeded balances for a given year", async () => {
    const r = await get("/employees/23/leave-balance?year=2026");
    expect(r.body).toEqual({
      employeeId: 23, year: 2026, balances: [
        { type: "VACATION", allowance: 20, used: 15, pending: 0, remaining: 5 },
        { type: "SICK", allowance: 10, used: 0, pending: 0, remaining: 10 },
        { type: "PERSONAL", allowance: 3, used: 0, pending: 0, remaining: 3 },
      ],
    });
    expect((await get("/employees/16/leave-balance?year=2026")).body.balances[0].remaining).toBe(0);
    expect((await get("/employees/16/leave-balance?year=1999")).status).toBe(400);
    expect((await get("/employees/999/leave-balance")).status).toBe(404);
  });

  it("the direct manager or an HR Manager approves; nobody approves their own", async () => {
    const ok = await post("/leave-requests/26/approve", { approverId: 3 });
    expect(ok.body).toMatchObject({ status: "APPROVED", approverId: 3, decisionReason: null });
    expect(ok.body.decidedAt).toMatch(iso);
    expect((await post("/leave-requests/26/approve", { approverId: 3 })).body.code).toBe("LEAVE_NOT_PENDING");
    expect((await post("/leave-requests/27/approve", { approverId: 7 })).body.code).toBe("NOT_AUTHORIZED_APPROVER");
    expect((await post("/leave-requests/27/approve", { approverId: 999 })).body.code).toBe("APPROVER_NOT_FOUND");
    expect((await post("/leave-requests/27/approve", { approverId: 31 })).body.code).toBe("SELF_APPROVAL");
    expect((await post("/leave-requests/27/approve", { approverId: 5 })).body.status).toBe("APPROVED"); // HR Manager
    expect((await post("/leave-requests/27/approve", {})).body.errors).toEqual([{ field: "approverId", message: "is required" }]);
    expect((await post("/leave-requests/999/approve", { approverId: 3 })).status).toBe(404);
  });

  it("rejecting needs a reason", async () => {
    expect((await post("/leave-requests/28/reject", { approverId: 7 })).body.errors).toEqual([{ field: "reason", message: "is required" }]);
    const r = await post("/leave-requests/28/reject", { approverId: 7, reason: "Busy week" });
    expect(r.body).toMatchObject({ status: "REJECTED", approverId: 7, decisionReason: "Busy week" });
  });

  it("cancel: pending always, approved only before it starts, never twice", async () => {
    expect((await post("/leave-requests/25/cancel")).body.status).toBe("CANCELLED");
    expect((await post("/leave-requests/25/cancel")).body.code).toBe("LEAVE_NOT_CANCELLABLE");
    expect((await post("/leave-requests/5/cancel")).body.code).toBe("LEAVE_NOT_CANCELLABLE");
    expect((await post("/leave-requests/6/cancel")).body.code).toBe("LEAVE_ALREADY_STARTED");
    const m = mon();
    const created = await post("/leave-requests", { employeeId: 13, type: "VACATION", startDate: m, endDate: m });
    await post(`/leave-requests/${created.body.id}/approve`, { approverId: 9 });
    expect((await post(`/leave-requests/${created.body.id}/cancel`)).body).toMatchObject({ status: "CANCELLED", approverId: 9 });
  });

  it("searches with filters and paging", async () => {
    const all = await get("/leave-requests?size=100");
    expect(all.body.totalElements).toBe(35);
    expect((await get("/leave-requests?status=PENDING")).body.totalElements).toBe(8);
    expect((await get("/leave-requests?employeeId=16&type=VACATION")).body.content.map((l: { id: number }) => l.id)).toEqual([7, 8]);
    expect((await get("/leave-requests?from=2025-01-01&to=2025-12-31")).body.totalElements).toBe(5);
    expect((await get("/leave-requests?sort=days,desc&size=1")).body.content[0].days).toBe(10);
    expect((await get("/leave-requests?status=OPEN")).status).toBe(400);
  });
});

describe("reports and database", () => {
  it("department stats match a hand-written GROUP BY", async () => {
    const r = await get("/reports/department-stats");
    expect(r.body).toHaveLength(9);
    const eng = r.body.find((s: { departmentId: number }) => s.departmentId === 2);
    expect(eng).toMatchObject({ headcount: 14, minSalary: 80000, maxSalary: 172000 });
    expect(r.body[8]).toEqual({ departmentId: 9, departmentName: "Research Lab", departmentCode: "LAB", headcount: 0, averageSalary: null, minSalary: null, maxSalary: null, totalSalary: 0 });

    const c = new pg.Client({ connectionString: process.env.ICEHR_TEST_ADMIN_URL });
    await c.connect();
    try {
      const sql = await c.query("SELECT ROUND(AVG(salary))::int AS avg, SUM(salary)::int AS total FROM employees WHERE department_id = 2 AND status = 'ACTIVE'");
      expect(eng.averageSalary).toBe(sql.rows[0].avg);
      expect(eng.totalSalary).toBe(sql.rows[0].total);
    } finally {
      await c.end();
    }
  });

  it("constraints guard the data even without the API", async () => {
    const c = new pg.Client({ connectionString: process.env.ICEHR_TEST_ADMIN_URL });
    await c.connect();
    const fails = async (sql: string) => {
      try { await c.query(sql); } catch (e) { return (e as { constraint?: string; code?: string }).constraint ?? (e as { code?: string }).code; }
      return "no error";
    };
    try {
      expect(await fails("UPDATE employees SET phone = '4165550100' WHERE id = 13")).toBe("employees_phone_format");
      expect(await fails("UPDATE employees SET email = 'Ethan@icehr.test' WHERE id = 13")).toBe("employees_email_lowercase");
      expect(await fails("UPDATE employees SET manager_id = 13 WHERE id = 13")).toBe("employees_not_own_manager");
      expect(await fails("UPDATE employees SET status = 'TERMINATED' WHERE id = 13")).toBe("employees_termination_date_matches_status");
      expect(await fails("UPDATE employees SET gender = 'OTHER' WHERE id = 13")).toBe("employees_gender_valid");
      expect(await fails("UPDATE employees SET gender = NULL WHERE id = 13")).toBe("23502");
      expect(await fails("DELETE FROM departments WHERE id = 2")).toBe("employees_department_id_fkey");
      expect(await fails("INSERT INTO leave_requests (employee_id, type, start_date, end_date, days) VALUES (13, 'VACATION', '2026-12-10', '2026-12-09', 1)"))
        .toBe("leave_dates_in_order");
      const dir = await c.query("SELECT full_name, job_title, department_name, manager_name FROM v_employee_directory WHERE id = 13");
      expect(dir.rows[0]).toEqual({ full_name: "Ethan Nguyen", job_title: "Software Engineer", department_name: "Engineering", manager_name: "Aisha Rahman" });
    } finally {
      await c.end();
    }
  });

  it("qa_reader can read but not write", async () => {
    const url = process.env.ICEHR_TEST_ADMIN_URL!.replace("postgres:postgres@", "qa_reader:qa_reader@");
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    try {
      expect((await c.query("SELECT COUNT(*)::int AS n FROM employees")).rows[0].n).toBe(60);
      await expect(c.query("DELETE FROM leave_requests")).rejects.toThrow(/permission denied/);
    } finally {
      await c.end();
    }
  });
});
