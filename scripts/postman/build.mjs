// Builds postman/IceHR.postman_collection.json and postman/IceHR-local.postman_environment.json.
//   npm run postman
// Each request has tests, so the whole collection doubles as a smoke test:
//   npx newman run postman/IceHR.postman_collection.json -e postman/IceHR-local.postman_environment.json
// The collection starts with a reset and ends with one, so it can run again and again.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "postman");

const json = (body) => ({ mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } });

/** One request. `tests` is JavaScript run after the response (Postman "Tests" tab). */
function req(name, method, urlPath, { body, rawBody, headers = [], tests = [], prerequest = [], description } = {}) {
  const [p, q] = urlPath.split("?");
  const hasBody = body !== undefined || rawBody !== undefined;
  const header = [...(hasBody && !headers.some((h) => h.key === "Content-Type") ? [{ key: "Content-Type", value: "application/json" }] : []), ...headers];
  const event = [];
  if (prerequest.length) event.push({ listen: "prerequest", script: { type: "text/javascript", exec: prerequest } });
  if (tests.length) event.push({ listen: "test", script: { type: "text/javascript", exec: tests } });
  return {
    name,
    event,
    request: {
      method,
      header,
      ...(hasBody ? { body: rawBody !== undefined ? { mode: "raw", raw: rawBody } : json(body) } : {}),
      url: {
        raw: `{{baseUrl}}${urlPath}`,
        host: ["{{baseUrl}}"],
        path: p.split("/").filter(Boolean),
        ...(q ? { query: q.split("&").map((kv) => { const [key, value = ""] = kv.split("="); return { key, value }; }) } : {}),
      },
      ...(description ? { description } : {}),
    },
  };
}

const folder = (name, item, description) => ({ name, item, ...(description ? { description } : {}) });

// Small reusable test snippets
const status = (code) => `pm.test("status is ${code}", () => pm.response.to.have.status(${code}));`;
const problem = (code, s) => [
  status(s),
  `pm.test("problem+json with code ${code}", () => {`,
  `  pm.expect(pm.response.headers.get("Content-Type")).to.include("application/problem+json");`,
  `  pm.expect(pm.response.json().code).to.eql("${code}");`,
  `});`,
];

const collection = {
  info: {
    name: "Ice HR",
    description:
      "Every Ice HR endpoint, with tests in each request. No login needed.\n\n" +
      "Pick the **Ice HR - local** environment, then send requests one by one, or run the whole collection with the Collection Runner. " +
      "Requests that create something save its id in a collection variable (employeeId, departmentId, leaveId) for the requests after them. " +
      "The first and last requests reset the data, so the collection can run again and again.\n\n" +
      "Business rules: README section 5. Swagger: http://localhost:8080/swagger",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "employeeId", value: "" },
    { key: "departmentId", value: "" },
    { key: "leaveId", value: "" },
    { key: "secondLeaveId", value: "" },
    { key: "startDate", value: "" },
    { key: "endDate", value: "" },
    { key: "uniqueEmail", value: "" },
  ],
  event: [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "// Runs after every request in the collection.",
          'pm.test("has an X-Request-Id header", () => pm.expect(pm.response.headers.has("X-Request-Id")).to.be.true);',
        ],
      },
    },
  ],
  item: [
    folder("0. Start here", [
      req("Health", "GET", "/health", {
        tests: [status(200), 'pm.test("status UP", () => pm.expect(pm.response.json().status).to.eql("UP"));'],
        description: "Is Ice HR up? `today` is the date (in Toronto) that every date rule uses.",
      }),
      req("Reset all data", "POST", "/reset", {
        tests: [status(200), 'pm.test("60 employees again", () => pm.expect(pm.response.json().employees).to.eql(60));'],
        description: "Puts every record back to the seed. New ids start at 1001 again.",
      }),
    ]),

    folder("1. Jobs", [
      req("List jobs", "GET", "/jobs", {
        tests: [status(200), 'pm.test("15 jobs", () => pm.expect(pm.response.json()).to.have.lengthOf(15));'],
      }),
      req("Get job 4 (Software Engineer)", "GET", "/jobs/4", {
        tests: [status(200), 'pm.test("range 80000 to 115000", () => { const j = pm.response.json(); pm.expect(j.minSalary).to.eql(80000); pm.expect(j.maxSalary).to.eql(115000); });'],
      }),
      req("Get job 99 (does not exist)", "GET", "/jobs/99", { tests: problem("NOT_FOUND", 404) }),
    ]),

    folder("2. Departments", [
      req("List departments", "GET", "/departments", {
        tests: [status(200), 'pm.test("9 departments", () => pm.expect(pm.response.json()).to.have.lengthOf(9));'],
      }),
      req("Get department 2", "GET", "/departments/2", {
        tests: [status(200), 'pm.test("Engineering, 14 active", () => { const d = pm.response.json(); pm.expect(d.name).to.eql("Engineering"); pm.expect(d.employeeCount).to.eql(14); });'],
      }),
      req("Create department", "POST", "/departments", {
        body: { name: "Data Science", code: "DS", location: "Toronto", managerId: 2 },
        tests: [
          status(201),
          'pm.test("Location header points to the new department", () => pm.expect(pm.response.headers.get("Location")).to.eql("/api/v1/departments/" + pm.response.json().id));',
          'pm.collectionVariables.set("departmentId", pm.response.json().id);',
        ],
      }),
      req("Create department with a taken name (409)", "POST", "/departments", {
        body: { name: "ENGINEERING", code: "ENX", location: "Toronto" },
        tests: problem("DEPARTMENT_NAME_TAKEN", 409),
      }),
      req("Create department with invalid fields (400)", "POST", "/departments", {
        body: { name: "", code: "ds", location: "Toronto" },
        tests: [...problem("VALIDATION_FAILED", 400), 'pm.test("two field errors", () => pm.expect(pm.response.json().errors.map(e => e.field)).to.eql(["name", "code"]));'],
      }),
      req("Patch department (location only)", "PATCH", "/departments/{{departmentId}}", {
        body: { location: "Montreal" },
        tests: [status(200), 'pm.test("only location changed", () => { const d = pm.response.json(); pm.expect(d.location).to.eql("Montreal"); pm.expect(d.name).to.eql("Data Science"); });'],
      }),
      req("Replace department (PUT)", "PUT", "/departments/{{departmentId}}", {
        body: { name: "Data and AI", code: "DAI", location: "Waterloo" },
        tests: [status(200), 'pm.test("managerId cleared because it was left out", () => pm.expect(pm.response.json().managerId).to.be.null);'],
      }),
      req("Employees of department 8 (active only)", "GET", "/departments/8/employees?status=ACTIVE", {
        tests: [status(200), 'pm.test("9 active", () => pm.expect(pm.response.json()).to.have.lengthOf(9));'],
      }),
      req("Delete department with employees (409)", "DELETE", "/departments/2", { tests: problem("DEPARTMENT_HAS_EMPLOYEES", 409) }),
      req("Delete the new department", "DELETE", "/departments/{{departmentId}}", { tests: [status(204)] }),
      req("Get the deleted department (404)", "GET", "/departments/{{departmentId}}", { tests: problem("NOT_FOUND", 404) }),
    ]),

    folder("3. Employees", [
      req("Search employees (page 1)", "GET", "/employees?page=0&size=20&sort=id,asc", {
        tests: [status(200), 'pm.test("60 in 3 pages", () => { const p = pm.response.json(); pm.expect(p.totalElements).to.eql(60); pm.expect(p.totalPages).to.eql(3); pm.expect(p.content).to.have.lengthOf(20); });'],
      }),
      req("Search by department, best paid first", "GET", "/employees?departmentId=2&sort=salary,desc", {
        tests: [status(200), 'pm.test("Daniel Okafor first", () => pm.expect(pm.response.json().content[0].id).to.eql(2));'],
      }),
      req("Search by gender", "GET", "/employees?gender=FEMALE", {
        tests: [status(200), 'pm.test("31 women, all FEMALE", () => { const p = pm.response.json(); pm.expect(p.totalElements).to.eql(31); pm.expect(p.content.every(e => e.gender === "FEMALE")).to.be.true; });'],
      }),
      req("Hire with an invalid gender (400)", "POST", "/employees", {
        body: { firstName: "Alex", lastName: "Gender", gender: "OTHER", email: "alex.gender@icehr.test", dateOfBirth: "1995-06-15", hireDate: "2024-03-04", jobId: 4, departmentId: 2, countryCode: "CA", salary: 95000 },
        tests: [...problem("VALIDATION_FAILED", 400), 'pm.test("gender must be MALE or FEMALE", () => pm.expect(pm.response.json().errors).to.eql([{ field: "gender", message: "must be one of: MALE, FEMALE" }]));'],
      }),
      req("Search by name", "GET", "/employees?search=nguyen", {
        tests: [status(200), 'pm.test("finds Ethan (13)", () => pm.expect(pm.response.json().content.map(e => e.id)).to.eql([13]));'],
      }),
      req("Get employee 13", "GET", "/employees/13", {
        tests: [status(200), 'pm.test("Ethan Nguyen, 80000", () => { const e = pm.response.json(); pm.expect(e.firstName).to.eql("Ethan"); pm.expect(e.salary).to.eql(80000); });'],
      }),
      req("Hire an employee", "POST", "/employees", {
        prerequest: ['pm.collectionVariables.set("uniqueEmail", "postman." + Date.now() + "@icehr.test");'],
        rawBody: JSON.stringify({ firstName: "Pat", lastName: "Postman", gender: "FEMALE", email: "{{uniqueEmail}}", phone: "416-555-0199", dateOfBirth: "1995-06-15", hireDate: "2024-03-04", jobId: 4, departmentId: 2, countryCode: "CA", managerId: 9, salary: 95000 }, null, 2),
        tests: [
          status(201),
          'pm.test("ACTIVE with an id from 1001", () => { const e = pm.response.json(); pm.expect(e.status).to.eql("ACTIVE"); pm.expect(e.id).to.be.at.least(1001); });',
          'pm.collectionVariables.set("employeeId", pm.response.json().id);',
        ],
      }),
      req("Hire with a taken email (409)", "POST", "/employees", {
        body: { firstName: "Copy", lastName: "Cat", gender: "MALE", email: "ETHAN.NGUYEN@icehr.test", dateOfBirth: "1995-06-15", hireDate: "2024-03-04", jobId: 4, departmentId: 2, countryCode: "CA", salary: 95000 },
        tests: problem("EMAIL_TAKEN", 409),
      }),
      req("Hire below the salary range (422)", "POST", "/employees", {
        body: { firstName: "Low", lastName: "Pay", gender: "FEMALE", email: "low.pay@icehr.test", dateOfBirth: "1995-06-15", hireDate: "2024-03-04", jobId: 4, departmentId: 2, countryCode: "CA", salary: 79999 },
        tests: problem("SALARY_OUT_OF_RANGE", 422),
      }),
      req("Hire someone too young (422)", "POST", "/employees", {
        body: { firstName: "Too", lastName: "Young", gender: "MALE", email: "too.young@icehr.test", dateOfBirth: "2006-03-05", hireDate: "2024-03-04", jobId: 15, departmentId: 8, countryCode: "CA", salary: 45000 },
        tests: problem("EMPLOYEE_UNDERAGE", 422),
      }),
      req("Hire with invalid fields (400)", "POST", "/employees", {
        body: { firstName: "", email: "not-an-email", salary: "lots" },
        tests: [...problem("VALIDATION_FAILED", 400), 'pm.test("lists every bad field", () => pm.expect(pm.response.json().errors.length).to.be.at.least(5));'],
      }),
      req("Give a raise (PATCH)", "PATCH", "/employees/{{employeeId}}", {
        body: { salary: 99000 },
        tests: [status(200), 'pm.test("salary 99000", () => pm.expect(pm.response.json().salary).to.eql(99000));'],
      }),
      req("Make Aisha report to Ethan (422 loop)", "PATCH", "/employees/9", { body: { managerId: 13 }, tests: problem("MANAGER_CYCLE", 422) }),
      req("Aisha's direct reports", "GET", "/employees/9/reports", {
        tests: [status(200), 'pm.test("includes Ethan to Jack (13 to 17)", () => pm.expect(pm.response.json().map(e => e.id)).to.include.members([13, 14, 15, 16, 17]));'],
      }),
      req("Kevin's leave balance in 2026", "GET", "/employees/23/leave-balance?year=2026", {
        tests: [status(200), 'pm.test("5 vacation days left", () => pm.expect(pm.response.json().balances.find(b => b.type === "VACATION").remaining).to.eql(5));'],
      }),
      req("Delete a manager (409)", "DELETE", "/employees/9", { tests: problem("EMPLOYEE_HAS_REPORTS", 409) }),
    ]),

    folder("4. Leave requests", [
      req("Pending requests", "GET", "/leave-requests?status=PENDING", {
        tests: [status(200), 'pm.test("8 pending", () => pm.expect(pm.response.json().totalElements).to.eql(8));'],
      }),
      req("Request vacation for the new employee", "POST", "/leave-requests", {
        prerequest: [
          "// A Monday at least two weeks ahead, with Monday to Friday in the same year.",
          "const d = new Date(); d.setDate(d.getDate() + 14);",
          "while (d.getDay() !== 1) d.setDate(d.getDate() + 1);",
          "const fri = new Date(d); fri.setDate(d.getDate() + 4);",
          "if (fri.getFullYear() !== d.getFullYear()) { d.setDate(d.getDate() + 7); fri.setDate(fri.getDate() + 7); }",
          "const iso = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');",
          'pm.collectionVariables.set("startDate", iso(d));',
          'pm.collectionVariables.set("endDate", iso(fri));',
        ],
        rawBody: JSON.stringify({ employeeId: "{{employeeId}}", type: "VACATION", startDate: "{{startDate}}", endDate: "{{endDate}}", reason: "Postman test" }, null, 2).replace('"{{employeeId}}"', "{{employeeId}}"),
        tests: [
          status(201),
          'pm.test("PENDING, 5 days", () => { const l = pm.response.json(); pm.expect(l.status).to.eql("PENDING"); pm.expect(l.days).to.eql(5); });',
          'pm.collectionVariables.set("leaveId", pm.response.json().id);',
        ],
      }),
      req("Request overlapping leave (409)", "POST", "/leave-requests", {
        rawBody: JSON.stringify({ employeeId: "{{employeeId}}", type: "SICK", startDate: "{{endDate}}", endDate: "{{endDate}}" }, null, 2).replace('"{{employeeId}}"', "{{employeeId}}"),
        tests: problem("LEAVE_OVERLAP", 409),
      }),
      req("Request leave for a terminated employee (422)", "POST", "/leave-requests", {
        rawBody: JSON.stringify({ employeeId: 58, type: "VACATION", startDate: "{{startDate}}", endDate: "{{endDate}}" }, null, 2),
        tests: problem("EMPLOYEE_NOT_ACTIVE", 422),
      }),
      req("Approve by someone who is not the manager (422)", "POST", "/leave-requests/{{leaveId}}/approve", {
        body: { approverId: 7 },
        tests: problem("NOT_AUTHORIZED_APPROVER", 422),
      }),
      req("Approve by the manager (Aisha, 9)", "POST", "/leave-requests/{{leaveId}}/approve", {
        body: { approverId: 9 },
        tests: [status(200), 'pm.test("APPROVED by 9", () => { const l = pm.response.json(); pm.expect(l.status).to.eql("APPROVED"); pm.expect(l.approverId).to.eql(9); pm.expect(l.decidedAt).to.be.a("string"); });'],
      }),
      req("Approve again (409)", "POST", "/leave-requests/{{leaveId}}/approve", { body: { approverId: 9 }, tests: problem("LEAVE_NOT_PENDING", 409) }),
      req("Reject without a reason (400)", "POST", "/leave-requests/26/reject", {
        body: { approverId: 3 },
        tests: [...problem("VALIDATION_FAILED", 400), 'pm.test("reason is required", () => pm.expect(pm.response.json().errors[0]).to.eql({ field: "reason", message: "is required" }));'],
      }),
      req("Reject request 26 (Sofia, 3)", "POST", "/leave-requests/26/reject", {
        body: { approverId: 3, reason: "Release week" },
        tests: [status(200), 'pm.test("REJECTED with the reason", () => { const l = pm.response.json(); pm.expect(l.status).to.eql("REJECTED"); pm.expect(l.decisionReason).to.eql("Release week"); });'],
      }),
      req("HR Manager approves request 27", "POST", "/leave-requests/27/approve", {
        body: { approverId: 5 },
        tests: [status(200), 'pm.test("APPROVED by Chloé (5)", () => pm.expect(pm.response.json().approverId).to.eql(5));'],
      }),
      req("Cancel the approved vacation", "POST", "/leave-requests/{{leaveId}}/cancel", {
        tests: [status(200), 'pm.test("CANCELLED", () => pm.expect(pm.response.json().status).to.eql("CANCELLED"));'],
      }),
      req("Cancel leave that already started (409)", "POST", "/leave-requests/6/cancel", { tests: problem("LEAVE_ALREADY_STARTED", 409) }),
      req("Get leave request 5", "GET", "/leave-requests/5", {
        tests: [status(200), 'pm.test("REJECTED with a reason", () => pm.expect(pm.response.json().decisionReason).to.eql("Holiday coverage is already full."));'],
      }),
    ]),

    folder("5. Termination and delete", [
      req("Terminate the new employee", "POST", "/employees/{{employeeId}}/terminate", {
        rawBody: JSON.stringify({ terminationDate: "2025-01-01" }, null, 2),
        tests: [status(200), 'pm.test("TERMINATED", () => pm.expect(pm.response.json().status).to.eql("TERMINATED"));'],
        description: "Uses a past date (2025-01-01) so it never depends on your time zone.",
      }),
      req("Edit a terminated employee (409)", "PATCH", "/employees/{{employeeId}}", { body: { salary: 100000 }, tests: problem("EMPLOYEE_TERMINATED", 409) }),
      req("Delete the employee", "DELETE", "/employees/{{employeeId}}", { tests: [status(204)] }),
      req("Their leave is gone too (CASCADE)", "GET", "/leave-requests/{{leaveId}}", { tests: problem("NOT_FOUND", 404) }),
    ]),

    folder("6. Regions and countries", [
      req("List regions", "GET", "/regions", {
        tests: [status(200), 'pm.test("20 regions, ids 1 to 20", () => { const r = pm.response.json(); pm.expect(r).to.have.lengthOf(20); pm.expect(r.map(x => x.id)).to.eql(Array.from({ length: 20 }, (_, i) => i + 1)); });'],
      }),
      req("Region 1 with its countries", "GET", "/regions/1", {
        tests: [status(200), 'pm.test("Canada and the United States", () => pm.expect(pm.response.json().countries.map(c => c.code)).to.eql(["CA", "US"]));'],
      }),
      req("Countries in region 10", "GET", "/countries?regionId=10", {
        tests: [status(200), 'pm.test("4 countries, all in region 10", () => { const c = pm.response.json(); pm.expect(c).to.have.lengthOf(4); pm.expect(c.every(x => x.regionId === 10)).to.be.true; });'],
      }),
      req("Get country CA", "GET", "/countries/CA", {
        tests: [status(200), 'pm.test("Canada, region 1", () => pm.expect(pm.response.json()).to.eql({ code: "CA", name: "Canada", regionId: 1 }));'],
      }),
      req("Employees working in the US", "GET", "/employees?countryCode=US", {
        tests: [status(200), 'pm.test("9 employees, all US, region 1", () => { const p = pm.response.json(); pm.expect(p.totalElements).to.eql(9); pm.expect(p.content.every(e => e.countryCode === "US" && e.regionId === 1)).to.be.true; });'],
      }),
      req("Hire in a country that does not exist (422)", "POST", "/employees", {
        body: { firstName: "No", lastName: "Where", gender: "MALE", email: "no.where@icehr.test", dateOfBirth: "1995-06-15", hireDate: "2024-03-04", jobId: 4, departmentId: 2, countryCode: "XX", salary: 95000 },
        tests: problem("COUNTRY_NOT_FOUND", 422),
      }),
    ]),

    folder("7. Reports", [
      req("Department statistics", "GET", "/reports/department-stats", {
        tests: [status(200), 'pm.test("Research Lab has no one", () => pm.expect(pm.response.json().find(d => d.departmentId === 9).headcount).to.eql(0));'],
      }),
      req("Region statistics", "GET", "/reports/region-stats", {
        tests: [status(200), 'pm.test("20 regions; nobody in Southern Europe (7)", () => { const r = pm.response.json(); pm.expect(r).to.have.lengthOf(20); pm.expect(r.find(x => x.regionId === 7).headcount).to.eql(0); });'],
      }),
    ]),

    folder("8. Bad requests", [
      req("Unknown endpoint (404)", "GET", "/salaries", { tests: problem("NOT_FOUND", 404) }),
      req("Wrong method (405)", "DELETE", "/jobs/1", {
        tests: [...problem("METHOD_NOT_ALLOWED", 405), 'pm.test("Allow header", () => pm.expect(pm.response.headers.get("Allow")).to.eql("GET, HEAD"));'],
      }),
      req("Not a number in the URL (400)", "GET", "/employees/abc", { tests: problem("VALIDATION_FAILED", 400) }),
      req("Broken JSON (400)", "POST", "/departments", { rawBody: '{"name": "Oops",', tests: problem("MALFORMED_JSON", 400) }),
      req("Body without Content-Type JSON (415)", "POST", "/departments", {
        rawBody: "name=Oops", headers: [{ key: "Content-Type", value: "text/plain" }],
        tests: problem("UNSUPPORTED_MEDIA_TYPE", 415),
      }),
      req("Page size too big (400)", "GET", "/employees?size=500", { tests: problem("VALIDATION_FAILED", 400) }),
    ]),

    folder("9. Clean up", [
      req("Reset all data", "POST", "/reset", { tests: [status(200)] }),
    ]),
  ],
};

const environment = {
  name: "Ice HR - local",
  values: [{ key: "baseUrl", value: "http://localhost:8080/api/v1", type: "default", enabled: true }],
  _postman_variable_scope: "environment",
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "IceHR.postman_collection.json"), JSON.stringify(collection, null, 2) + "\n");
fs.writeFileSync(path.join(OUT, "IceHR-local.postman_environment.json"), JSON.stringify(environment, null, 2) + "\n");
const count = collection.item.reduce((n, f) => n + f.item.length, 0);
console.log(`Wrote postman/IceHR.postman_collection.json (${count} requests) and postman/IceHR-local.postman_environment.json`);
