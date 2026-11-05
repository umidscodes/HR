# Ice HR

Ice HR is a **small, fictional HR system built only as a test target**. It is the first thing you test in this course: a real REST API, a real PostgreSQL database and a simple web UI, with **no login, no tokens and no keys**. You can send your first request in Swagger within a minute of starting it.

You use it to learn **REST Assured** (API testing in Java) and **SQL / JDBC** (database testing). Every business rule is written down in [section 5](#5-business-rules-the-test-oracle), so for every test you can say what the correct result is *before* you run it.

> Fictional company, fictional people. Never enter real personal information.

| What | Where |
| --- | --- |
| Web UI | http://localhost:8080 |
| Swagger UI (try every endpoint) | http://localhost:8080/swagger |
| OpenAPI document | http://localhost:8080/api/v1/openapi.json |
| REST API base | http://localhost:8080/api/v1 |
| Tutorials (REST Assured and database testing, with progress tick boxes) | http://localhost:8080/tutorials/ |
| Database (JDBC) | `jdbc:postgresql://localhost:5434/icehr`, user `qa_reader`, password `qa_reader` |

## Contents

1. [Setup](#1-setup-windows-macos-or-linux)
2. [What is inside](#2-what-is-inside)
3. [Seed data and personas](#3-seed-data-and-personas)
4. [The API](#4-the-api)
5. [Business rules (the test oracle)](#5-business-rules-the-test-oracle)
6. [Database](#6-database-sql-and-jdbc)
7. [Starter test project, Postman and tutorials](#7-starter-test-project-postman-and-tutorials)
8. [Troubleshooting](#8-troubleshooting)
9. [Project layout](#9-project-layout)

## 1. Setup (Windows, macOS or Linux)

You only need **Node.js 22 or newer** (the LTS version from https://nodejs.org) and **Git**. No Docker and no separate database install.

```bash
git clone https://github.com/umidscodes/HR.git
cd HR
npm install
npm run dev
```

The first `npm run dev`:

1. starts an embedded PostgreSQL 16 database on port **5434** (its files live in the `.icehr` folder)
2. creates the tables, views and database users
3. loads the seed data
4. starts Ice HR on http://localhost:8080

Press **Ctrl+C** to stop. Later starts take a few seconds. Your data is kept between runs until you reset it.

| Command | What it does |
| --- | --- |
| `npm run dev` | Database + app on port 8080 (first run also creates and seeds the database) |
| `npm run reset` | Puts all data back to the seed (same as `POST /api/v1/reset`) |
| `npm run db:start` | Runs only the database, for DBeaver or JDBC practice |
| `npm test` | The app's own smoke tests (50 tests of every business rule, against a separate test database) |
| `npm run postman` | Rebuilds the Postman collection in `postman/` |

**Ports:** to use other ports, set `PORT` (app, default 8080) and/or `DB_PORT` (database, default 5434) before `npm run dev`. On Windows Command Prompt: `set PORT=8081`; in PowerShell: `$env:PORT="8081"`.

Ice HR and Ice Bank use different ports (8080/5434 and 3000/5433), so both can run at the same time.

## 2. What is inside

A company with **9 departments**, **15 jobs** and **60 employees**. Employees ask for time off with **leave requests**, which their manager approves or rejects.

```
jobs (15)                 departments (9)
  id, title,                id, name, code, location,
  min_salary, max_salary    manager_id ───────────────┐
        ▲                          ▲                  │
        │ job_id                   │ department_id    │
        │                          │                  ▼
        └────────────── employees (60) ◄──────────────┘
                          id, first_name, last_name, gender, email, phone,
                          date_of_birth, hire_date, salary, status,
                          termination_date, manager_id ──┐ (another employee)
                                 ▲            ▲          │
                                 │            └──────────┘
                     employee_id │  approver_id
                          leave_requests (35)
                          id, type, start_date, end_date, days, reason,
                          status, decision_reason, decided_at
```

The **web UI** (http://localhost:8080) shows the same data: a dashboard, an employee list with search, employee detail and edit pages, departments and leave requests. Every page uses the REST API, so you can open DevTools (F12), go to the Network tab, click Save and watch the exact request your tests will send. It has no `data-testid` attributes and is not meant for Selenium practice.

## 3. Seed data and personas

After every reset the data is **exactly the same**: same ids, names, salaries, dates and even `createdAt` timestamps. Seeded rows have ids **1 to 999**. Anything you create gets an id from **1001** up, and after a reset the next new record is 1001 again.

### Departments

| Id | Name | Code | Location | Manager | Active employees | Average salary |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Executive | EXEC | Toronto | 1 Margaret Chen | 1 | 310000 |
| 2 | Engineering | ENG | Toronto | 2 Daniel Okafor | 14 | 112357 |
| 3 | Quality Assurance | QA | Montreal | 3 Sofia Rossi | 8 | 83625 |
| 4 | Product | PROD | Toronto | 4 Arjun Patel | 5 | 110000 |
| 5 | Human Resources | HR | Ottawa | 5 Chloé Tremblay | 5 | 75600 |
| 6 | Finance | FIN | Toronto | 6 Robert MacDonald | 6 | 83833 |
| 7 | Sales | SALES | Vancouver | 7 Priya Sharma | 11 | 63636 |
| 8 | Customer Support | SUP | Halifax | 8 Marc Gagnon | 9 (+1 terminated) | 54000 |
| 9 | Research Lab | LAB | Waterloo | none | 0 | none |

### Jobs (salary ranges, both ends allowed)

| Id | Title | Min | Max | | Id | Title | Min | Max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Chief Executive Officer | 200000 | 350000 | | 9 | HR Specialist | 55000 | 80000 |
| 2 | Engineering Manager | 140000 | 190000 | | 10 | Finance Manager | 100000 | 150000 |
| 3 | Senior Software Engineer | 110000 | 150000 | | 11 | Accountant | 60000 | 90000 |
| 4 | Software Engineer | 80000 | 115000 | | 12 | Sales Manager | 90000 | 140000 |
| 5 | QA Manager | 100000 | 140000 | | 13 | Sales Representative | 45000 | 75000 |
| 6 | QA Analyst | 60000 | 90000 | | 14 | Support Manager | 70000 | 100000 |
| 7 | Product Manager | 95000 | 140000 | | 15 | Support Agent | 40000 | 60000 |
| 8 | HR Manager | 90000 | 130000 | | | | | |

### Personas: employees worth remembering

| Id | Name | Why they are useful |
| --- | --- | --- |
| 1 | Margaret Chen | CEO. The only employee with no manager (`managerId: null`). Manages the 7 department heads (ids 2 to 8). |
| 3 | Sofia Rossi | QA Manager. The manager of employees 22 to 28, so she can approve their leave. |
| 5 | Chloé Tremblay | **HR Manager** (job 8): may approve or reject *anyone's* leave. Accented name; email `chloe.tremblay@icehr.test`. |
| 9 | Aisha Rahman | Team lead with 5 direct reports (13 to 17), so she **cannot be deleted or terminated**. Salary 150000, the **maximum** for her job. |
| 10 | Liam O'Brien | Apostrophe in the name (good for SQL quoting). Leads employees 18 to 21. |
| 13 | Ethan Nguyen | A "clean" employee for your tests: Software Engineer, salary **80000 = the minimum** for the job, manager 9, no leave since 2025. |
| 16 | Fatima Haddad | Has used **all 20 vacation days in 2026** (requests 7 and 8). |
| 23 | Kevin Singh | Has **exactly 5 vacation days left in 2026** (15 used). |
| 58 | Tanya Ivanova | **TERMINATED** on 2026-06-30. Cannot be edited, request leave or become anyone's manager. |
| 60 | Ella Robinson | The newest hire (2026-10-19) and the youngest (born 2007-03-15). Salary 40000, the minimum for Support Agent. No leave. |

There are **31 women and 29 men** (`gender` is `FEMALE` or `MALE`); in Engineering, 6 women and 8 men. Employees 20, 35 and 47 have **no phone number** (`phone: null`, SQL `IS NULL`). Department 9 (Research Lab) has no employees, so it is the one department you can delete. Every email is `firstname.lastname@icehr.test` in lower case, without accents or apostrophes.

### Leave requests

35 requests (ids 1 to 35): 5 in 2025 and 30 in 2026/2027. 22 are APPROVED, 8 PENDING, 3 REJECTED and 2 CANCELLED.

The **8 pending requests** (ready for you to approve, reject or cancel):

| Id | Employee | Their manager | Type | Dates | Days |
| --- | --- | --- | --- | --- | --- |
| 25 | 15 Noah Wilson | 9 | VACATION | 2026-12-21 to 2026-12-31 | 9 |
| 26 | 26 Isabella Garcia | 3 | VACATION | 2026-11-23 to 2026-11-27 | 5 |
| 27 | 31 Leila Ahmadi | 4 | PERSONAL | 2026-12-04 | 1 |
| 28 | 44 Rachel Morin | 7 | VACATION | 2026-12-14 to 2026-12-18 | 5 |
| 29 | 55 Diego Torres | 8 | SICK | 2026-11-02 to 2026-11-03 | 2 |
| 30 | 21 Omar Siddiqui | 10 | PERSONAL | 2026-11-13 | 1 |
| 31 | 59 Kofi Mensah | 8 | VACATION | 2026-12-28 to 2026-12-31 | 4 |
| 32 | 34 Michael Adeyemi | 5 | VACATION | 2027-01-04 to 2027-01-08 | 5 |

Other handy ones: **6** (approved, already started, so it cannot be cancelled), **33** (approved, starts 2026-12-07, so it can still be cancelled), **5** (rejected, with a decision reason), **17** (cancelled).

## 4. The API

### Conventions

- Base path **`/api/v1`**. JSON in and out, **camelCase** field names.
- **No authentication.** No headers are needed except `Content-Type: application/json` when you send a body.
- **Dates** are `YYYY-MM-DD` strings (`"2026-11-05"`). **Date-times** are ISO 8601 with the Toronto offset (`"2026-11-05T10:15:00-05:00"`).
- **Salaries** are whole numbers: annual pay in dollars (`95000`). No decimals.
- **Ids** are whole numbers. Seeded ids are below 1000; new ids start at 1001.
- **Lists:** jobs, departments, a department's employees, direct reports and department stats are plain JSON arrays. Employees and leave requests are **paged**:
  `?page=0&size=20&sort=lastName,asc` returns `{ "content": [...], "page": 0, "size": 20, "totalElements": 60, "totalPages": 3 }`.
  `page` starts at 0; `size` is 1 to 100 (default 20); `sort` is `field` or `field,asc|desc` (default `id,asc`). A page past the end returns `content: []` with status 200.
- **Created:** a `POST` that creates something returns **201** with a **`Location`** header (e.g. `/api/v1/employees/1001`) and the new record in the body.
- **Deleted:** `DELETE` returns **204** with no body.
- **Unknown fields** in a request body are ignored (sending `"id"` or `"status"` changes nothing).
- **Unknown query parameters** are ignored too: a typo such as `?department=2` (instead of `departmentId`) returns every employee. Check that a filter really filtered.
- **Invalid query parameters** give 400 with an `errors` list. The filters (`status`, `departmentId`, dates...) are checked first, then `page`, `size` and `sort`, so `?status=FIRED&size=101` reports only `status`.
- Every response has an **`X-Request-Id`** header. Send your own `X-Request-Id` (letters, digits, `.`, `_`, `-`, up to 100 characters) and it is echoed back.

### Status codes

| Code | Meaning in Ice HR |
| --- | --- |
| 200 | OK (GET, PUT, PATCH, approve, reject, cancel, terminate, reset) |
| 201 | Created, with a `Location` header |
| 204 | Deleted, no body |
| 400 | The request itself is wrong: invalid field, bad id in the URL, bad query parameter, malformed JSON, no body |
| 404 | No record with that id, or no such endpoint |
| 405 | The endpoint exists but not with this method (the `Allow` header lists the right ones) |
| 409 | Conflict with existing data: duplicate email or name, record in the wrong state, still referenced |
| 415 | A body was sent without `Content-Type: application/json` |
| 422 | The request is well-formed but breaks a business rule (salary out of range, too young, not enough leave...) |
| 500 | A bug. Should never happen: report it with the `X-Request-Id` |

### Errors (RFC 7807)

Every error has `Content-Type: application/problem+json` and this shape:

```json
{
  "type": "https://icehr.test/problems/salary-out-of-range",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "Salary 30000 is outside the range for Software Engineer (80000 to 115000).",
  "instance": "/api/v1/employees",
  "code": "SALARY_OUT_OF_RANGE"
}
```

Assert on **`code`**: it is stable. `detail` is for humans. For **400 VALIDATION_FAILED**, `errors` lists **every** invalid field at once, in the order the fields are defined:

```json
{
  "type": "https://icehr.test/problems/validation-failed",
  "title": "Bad Request",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/employees",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "email", "message": "must be a valid email address" },
    { "field": "salary", "message": "must be a whole number" }
  ]
}
```

Other 400 codes: `MALFORMED_JSON` (the body is not valid JSON, or is not a JSON object) and `BODY_REQUIRED` (no body at all).

### Endpoints

| Method | Path | Does |
| --- | --- | --- |
| GET | `/health` | `{"status":"UP","database":"UP","today":"2026-11-05",...}`. `today` is the date in Toronto that every date rule uses. |
| POST | `/reset` | Back to the seed data. No body. Returns the counts. |
| GET | `/jobs` | All 15 jobs (array) |
| GET | `/jobs/{id}` | One job |
| GET | `/departments` | All departments (array) with `employeeCount` (active employees) |
| POST | `/departments` | Create |
| GET | `/departments/{id}` | One department |
| PUT | `/departments/{id}` | Replace (send every field) |
| PATCH | `/departments/{id}` | Change only the fields you send |
| DELETE | `/departments/{id}` | Delete an empty department |
| GET | `/departments/{id}/employees` | The department's employees (array), optional `?status=ACTIVE` or `TERMINATED` |
| GET | `/employees` | Search (paged). Filters: `departmentId`, `jobId`, `managerId`, `status`, `gender` (`MALE` or `FEMALE`), `search` (in first name, last name or email, ignoring case), `hiredFrom`, `hiredTo`, `minSalary`, `maxSalary`. Sort: `id`, `firstName`, `lastName`, `email`, `hireDate`, `dateOfBirth`, `salary`. |
| POST | `/employees` | Hire |
| GET | `/employees/{id}` | One employee |
| PUT | `/employees/{id}` | Replace (send every field) |
| PATCH | `/employees/{id}` | Change only the fields you send |
| DELETE | `/employees/{id}` | Delete (and their leave requests) |
| POST | `/employees/{id}/terminate` | `{"terminationDate":"2026-11-05"}` |
| GET | `/employees/{id}/reports` | Their direct reports (array) |
| GET | `/employees/{id}/leave-balance` | Allowance, used, pending and remaining per leave type. Optional `?year=2026` (default: this year). |
| GET | `/leave-requests` | Search (paged). Filters: `employeeId`, `status`, `type`, `from`, `to` (keeps requests with at least one day in the range). Sort: `id`, `startDate`, `days`, `createdAt`. |
| POST | `/leave-requests` | Request leave |
| GET | `/leave-requests/{id}` | One leave request |
| POST | `/leave-requests/{id}/approve` | `{"approverId": 3}` |
| POST | `/leave-requests/{id}/reject` | `{"approverId": 3, "reason": "..."}` |
| POST | `/leave-requests/{id}/cancel` | No body |
| GET | `/reports/department-stats` | Headcount and salary figures per department, read from the view `v_department_stats` |

Swagger (http://localhost:8080/swagger) shows every request body, every response and an example of each error.

### Example: hire an employee

```http
POST /api/v1/employees
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "gender": "FEMALE",
  "email": "Jane.Doe@icehr.test",
  "phone": "416-555-0199",
  "dateOfBirth": "1995-06-15",
  "hireDate": "2026-11-02",
  "jobId": 4,
  "departmentId": 2,
  "managerId": 9,
  "salary": 95000
}
```

```http
HTTP/1.1 201 Created
Location: /api/v1/employees/1001
Content-Type: application/json; charset=utf-8

{"id":1001,"firstName":"Jane","lastName":"Doe","gender":"FEMALE","email":"jane.doe@icehr.test","phone":"416-555-0199",
 "dateOfBirth":"1995-06-15","hireDate":"2026-11-02","jobId":4,"departmentId":2,"managerId":9,"salary":95000,
 "status":"ACTIVE","terminationDate":null,"createdAt":"2026-11-05T10:15:00-05:00","updatedAt":"2026-11-05T10:15:00-05:00"}
```

## 5. Business rules (the test oracle)

"Today" always means **today's date in Toronto** (America/Toronto), whatever your computer's time zone is. `GET /api/v1/health` shows it.

**Order of checks.** A request is checked in this order, and the **first** problem found is the one reported:
1. 400: the URL id, the query parameters, the body format, then the fields (all field errors are reported together)
2. 404: the record in the URL does not exist
3. 409 and 422: the business rules, in the order listed in each table below

### Employees

| # | Field or rule | Valid | Otherwise |
| --- | --- | --- | --- |
| E1 | `firstName`, `lastName` | Required, 1 to 50 characters after trimming spaces | 400 |
| E1a | `gender` | Required: exactly `MALE` or `FEMALE` (upper case; `male`, `OTHER` or `""` are invalid) | 400 |
| E2 | `email` | Required, looks like `name@domain.tld`, at most 100 characters. **Stored in lower case.** | 400 |
| E3 | `phone` | Optional (`null` or left out). Format `416-555-0100` | 400 |
| E4 | `dateOfBirth`, `hireDate` | Required, real dates `YYYY-MM-DD` (`2026-02-30` is invalid) | 400 |
| E5 | `jobId`, `departmentId` | Required whole numbers greater than 0 | 400 |
| E6 | `managerId` | Optional whole number greater than 0 | 400 |
| E7 | `salary` | Required whole number greater than 0 (`95000.5` and `"95000"` are invalid) | 400 |
| E8 | Job exists | | 422 `JOB_NOT_FOUND` |
| E9 | Department exists | | 422 `DEPARTMENT_NOT_FOUND` |
| E10 | Not their own manager (update only) | | 422 `SELF_MANAGER` |
| E11 | Manager exists | | 422 `MANAGER_NOT_FOUND` |
| E12 | Manager is ACTIVE | | 422 `MANAGER_NOT_ACTIVE` |
| E13 | No loop: the new manager must not report (directly or through others) to this employee (update only) | | 422 `MANAGER_CYCLE` |
| E14 | At least **18 on the hire date**. The 18th birthday itself is fine. Born on 29 February: 18 on 28 February. | | 422 `EMPLOYEE_UNDERAGE` |
| E15 | Hire date is **not after today** (today is fine) | | 422 `HIRE_DATE_IN_FUTURE` |
| E16 | Salary within the job's range, **both ends included** | | 422 `SALARY_OUT_OF_RANGE` |
| E17 | Email not used by another employee (compared in lower case) | | 409 `EMAIL_TAKEN` |

- **New employees** are `ACTIVE` with `terminationDate: null`.
- **PUT** replaces every editable field: leaving out `phone` or `managerId` sets them to `null`; leaving out a required field is a 400.
- **PATCH** changes only the fields you send (at least one, or 400). Send `"phone": null` or `"managerId": null` to clear them. The result must still pass E8 to E17: for example, changing only `jobId` can fail E16 because the old salary no longer fits.
- **Terminated** employees cannot be changed with PUT or PATCH: 409 `EMPLOYEE_TERMINATED` (checked before E8).
- **DELETE**: 409 `EMPLOYEE_HAS_REPORTS` if anyone (active or terminated) has them as manager. Otherwise the employee is deleted, **their leave requests are deleted too** (`ON DELETE CASCADE`), and any department they managed or leave they decided keeps its row with `manager_id` / `approver_id` set to `NULL` (`ON DELETE SET NULL`).

### Terminating an employee

`POST /employees/{id}/terminate` with `{"terminationDate": "YYYY-MM-DD"}`. Checked in this order:

| # | Rule | Otherwise |
| --- | --- | --- |
| T1 | `terminationDate` is a real date | 400 |
| T2 | Not already terminated | 409 `ALREADY_TERMINATED` |
| T3 | Manages no **active** employees | 409 `EMPLOYEE_HAS_REPORTS` |
| T4 | Not before the hire date (the hire date itself is fine) | 422 `TERMINATION_BEFORE_HIRE` |
| T5 | Not after today | 422 `TERMINATION_DATE_IN_FUTURE` |

On success, all in one database transaction: `status` becomes `TERMINATED` and `terminationDate` is set; every **PENDING** leave request, and every **APPROVED** one that starts **after** the termination date, becomes `CANCELLED` with `decisionReason` "Employee terminated."; a department they managed gets `managerId: null`.

### Departments

| # | Field or rule | Valid | Otherwise |
| --- | --- | --- | --- |
| D1 | `name` | Required, 1 to 50 characters after trimming | 400 |
| D2 | `code` | Required, **2 to 5 uppercase letters** A to Z (`ENG`). Lower case is not converted: it is a 400. | 400 |
| D3 | `location` | Required, 1 to 100 characters | 400 |
| D4 | `managerId` | Optional whole number greater than 0 | 400 |
| D5 | Manager exists | | 422 `MANAGER_NOT_FOUND` |
| D6 | Manager is ACTIVE | | 422 `MANAGER_NOT_ACTIVE` |
| D7 | Name not used by another department, **ignoring case** (`engineering` = `Engineering`) | | 409 `DEPARTMENT_NAME_TAKEN` |
| D8 | Code not used by another department | | 409 `DEPARTMENT_CODE_TAKEN` |

- `employeeCount` counts **ACTIVE** employees only.
- **PUT** replaces all fields (a missing `managerId` becomes `null`); **PATCH** changes only what you send (at least one field).
- **DELETE**: 409 `DEPARTMENT_HAS_EMPLOYEES` while it has any employees, **terminated ones included**. Department 9 starts empty.

### Leave requests

**Days** are counted **Monday to Friday**, both ends included. Weekends do not count and there is no holiday list. Example: Friday to the next Monday is 2 days.

**Allowance per calendar year:** VACATION **20** days, SICK **10**, PERSONAL **3**. A request belongs to the year of its `startDate`. For the balance, `used` = days of APPROVED requests, `pending` = days of PENDING requests, and `remaining = allowance - used - pending`. REJECTED and CANCELLED requests do not count.

**Request leave** (`POST /leave-requests`), checked in this order:

| # | Field or rule | Valid | Otherwise |
| --- | --- | --- | --- |
| L1 | `employeeId` | Required whole number greater than 0 | 400 |
| L2 | `type` | `VACATION`, `SICK` or `PERSONAL` | 400 |
| L3 | `startDate`, `endDate` | Required real dates | 400 |
| L4 | `reason` | Optional, at most 200 characters | 400 |
| L5 | `endDate` | On or after `startDate` (one-day leave: the same date) | 400 (field `endDate`) |
| L6 | `endDate` | In the **same calendar year** as `startDate` (split a Christmas break into two requests) | 400 (field `endDate`) |
| L7 | Employee exists | | 422 `EMPLOYEE_NOT_FOUND` |
| L8 | Employee is ACTIVE | | 422 `EMPLOYEE_NOT_ACTIVE` |
| L9 | At least one weekday in the range | | 422 `NO_WORKING_DAYS` |
| L10 | VACATION and PERSONAL: start **today or later** | | 422 `START_DATE_IN_PAST` |
| L11 | SICK: start **at most 30 days ago** (today minus 30 days is fine; minus 31 is not) | | 422 `START_DATE_TOO_OLD` |
| L12 | No overlap with a **PENDING or APPROVED** request of the same employee (any type; sharing even one day counts) | | 409 `LEAVE_OVERLAP` |
| L13 | Enough days left for that type in that year (`days <= remaining`; using exactly all of it is fine) | | 422 `LEAVE_BALANCE_EXCEEDED` |

L5 and L6 are only checked when both dates are valid (L3). A new request is `PENDING`, with `approverId`, `decisionReason` and `decidedAt` all `null`.

**Approve** (`{"approverId": n}`) and **reject** (`{"approverId": n, "reason": "..."}`), checked in this order:

| # | Rule | Otherwise |
| --- | --- | --- |
| A1 | `approverId` is a whole number greater than 0; for reject, `reason` is 1 to 200 characters | 400 |
| A2 | The leave request exists | 404 |
| A3 | The request is `PENDING` | 409 `LEAVE_NOT_PENDING` |
| A4 | The approver exists | 422 `APPROVER_NOT_FOUND` |
| A5 | The approver is not the employee themself | 422 `SELF_APPROVAL` |
| A6 | The approver is ACTIVE | 422 `APPROVER_NOT_ACTIVE` |
| A7 | The approver is the employee's **direct manager**, or has the **HR Manager** job (job 8: Chloé Tremblay, id 5) | 422 `NOT_AUTHORIZED_APPROVER` |

On success: `status` becomes `APPROVED` or `REJECTED`, `approverId` and `decidedAt` are set, and for a rejection `decisionReason` holds the reason.

**Cancel** (no body needed; any body is ignored):

| Current status | Result |
| --- | --- |
| PENDING | `CANCELLED` |
| APPROVED, starts **after today** | `CANCELLED` (`approverId` and `decidedAt` are kept) |
| APPROVED, starts today or earlier | 409 `LEAVE_ALREADY_STARTED` |
| REJECTED or CANCELLED | 409 `LEAVE_NOT_CANCELLABLE` |

```
             approve                 cancel (before it starts)
  PENDING ───────────► APPROVED ───────────────────────────► CANCELLED
     │   reject
     ├───────────────► REJECTED
     │   cancel
     └──────────────────────────────────────────────────────► CANCELLED
```

## 6. Database (SQL and JDBC)

| Setting | Value |
| --- | --- |
| Host / port | `localhost` / `5434` |
| Database | `icehr` |
| JDBC URL | `jdbc:postgresql://localhost:5434/icehr` |
| Read-only user | `qa_reader` / `qa_reader` (use this one for checks) |
| Read-write user | `qa_writer` / `qa_writer` (for test setup: INSERT, UPDATE, DELETE) |
| App user | `hr_app` (used by the app; not for tests) |

The database runs whenever `npm run dev` (or `npm run db:start`) runs. Connect with DBeaver, IntelliJ's Database tool window or JDBC.

**DBeaver:** New Database Connection, PostgreSQL, Host `localhost`, Port `5434`, Database `icehr`, Username `qa_reader`, Password `qa_reader`, then Test Connection (DBeaver offers to download the driver the first time).

### Tables

| Table | Columns | Rules enforced by the database |
| --- | --- | --- |
| `jobs` | `id`, `title`, `min_salary`, `max_salary` | title unique; `min_salary > 0`; `max_salary >= min_salary` |
| `departments` | `id`, `name`, `code`, `location`, `manager_id`, `created_at`, `updated_at` | `code` unique and `^[A-Z]{2,5}$`; `lower(name)` unique; `manager_id` → `employees.id` **ON DELETE SET NULL** |
| `employees` | `id`, `first_name`, `last_name`, `gender`, `email`, `phone`, `date_of_birth`, `hire_date`, `job_id`, `department_id`, `manager_id`, `salary`, `status`, `termination_date`, `created_at`, `updated_at` | `gender` NOT NULL, `MALE` or `FEMALE`; `email` unique and lower case; `phone` NULL or `###-###-####`; `salary > 0`; `status` in (`ACTIVE`, `TERMINATED`); `termination_date` set exactly when TERMINATED; not their own manager; `hire_date > date_of_birth`; `job_id` → `jobs`; `department_id` → `departments` **ON DELETE RESTRICT**; `manager_id` → `employees` **ON DELETE RESTRICT** |
| `leave_requests` | `id`, `employee_id`, `type`, `start_date`, `end_date`, `days`, `reason`, `status`, `approver_id`, `decision_reason`, `decided_at`, `created_at`, `updated_at` | `type` and `status` from the fixed lists; `end_date >= start_date`; `days > 0`; `employee_id` → `employees` **ON DELETE CASCADE**; `approver_id` → `employees` **ON DELETE SET NULL** |

**Dates in SQL:** the database server runs in UTC, so `CURRENT_DATE` can be a different day from Ice HR's "today" late in the evening. When a query needs Toronto's today, write `(now() AT TIME ZONE 'America/Toronto')::date`.

Some rules live **only in the API** (salary range, age at hire, leave balance, overlapping leave, who may approve). A row inserted directly with SQL can break them. That is a good discussion point: which layer should enforce which rule?

### Views

- **`v_department_stats`**: one row per department: `department_id`, `department_name`, `department_code`, `headcount` (active only), `average_salary` (rounded), `min_salary`, `max_salary`, `total_salary`. `GET /reports/department-stats` returns exactly this.
- **`v_employee_directory`**: every employee with `full_name`, `email`, `status`, `job_title`, `department_name`, `manager_id`, `manager_name`, `salary`, `hire_date`, `gender`.

### A few queries to start with

```sql
-- Everyone in Engineering, best paid first
SELECT id, first_name, last_name, salary FROM employees WHERE department_id = 2 ORDER BY salary DESC;

-- Employees with their manager's name (a self-join)
SELECT e.first_name || ' ' || e.last_name AS employee, m.first_name || ' ' || m.last_name AS manager
  FROM employees e LEFT JOIN employees m ON m.id = e.manager_id ORDER BY e.id;

-- Approved vacation days per employee in 2026
SELECT employee_id, SUM(days) AS used FROM leave_requests
 WHERE type = 'VACATION' AND status = 'APPROVED' AND start_date BETWEEN '2026-01-01' AND '2026-12-31'
 GROUP BY employee_id ORDER BY used DESC;
```

## 7. Starter test project, Postman and tutorials

- **`starter/`** is a ready-to-run Java test project: Maven, JUnit 5, REST Assured, AssertJ and the PostgreSQL JDBC driver. With Ice HR running: `cd starter` then `mvn test`. See [starter/README.md](starter/README.md).
- **`postman/`** has a collection covering every endpoint, with tests in each request. Import `postman/IceHR.postman_collection.json` and `postman/IceHR-local.postman_environment.json`, pick the **Ice HR - local** environment, and run. Run the whole collection from the command line with `npx newman run postman/IceHR.postman_collection.json -e postman/IceHR-local.postman_environment.json`.
- **Tutorials** at http://localhost:8080/tutorials/: *Getting started*, *API testing with REST Assured* and *SQL and database testing with JDBC*, with worked examples, exercises with tick boxes and a short quiz on every lesson. Your progress is saved in your browser; use **Export progress** to keep a copy.

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm run dev` says port 8080 is in use | Another program uses it. Stop it, or start Ice HR on another port: `set PORT=8081` (PowerShell: `$env:PORT="8081"`), then `npm run dev`. Change your tests' base URL too. |
| Port 5434 is in use by something that is not Ice HR's database | Set `DB_PORT` to another port, e.g. `set DB_PORT=5435`, and use it in your JDBC URL. |
| The database will not start (often antivirus on Windows) | Delete the `.icehr` folder and run `npm run dev` again. If it still fails, install Docker Desktop, run `docker run -d --name icehr-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=icehr -p 5434:5432 postgres:16`, then `set DATABASE_URL=postgres://postgres:postgres@localhost:5434/icehr` and `npm run dev`. |
| My tests worked yesterday and fail today | Something changed the data. Reset: `POST /api/v1/reset`, the Reset button on the dashboard, or `npm run reset`. |
| A leave test fails with `START_DATE_IN_PAST` | Leave dates must be in the future. Build them from today (`LocalDate.now(ZoneId.of("America/Toronto")).plusWeeks(2)`), not as fixed strings. |
| 415 Unsupported Media Type | You sent a body without `Content-Type: application/json`. In REST Assured add `.contentType(ContentType.JSON)`. |

## 9. Project layout

```
src/
  app.ts            Express app: API routes, 404/405, Swagger UI, the web UI and the tutorials
  api/              one file per area: employees, departments, jobs, leave, reports, support (health, reset)
  http.ts           body/query/id parsing, paging, request ids, the error handler
  errors.ts         RFC 7807 errors
  openapi.ts        OpenAPI registry, field types and their error messages
  schemas.ts        response schemas shown in Swagger
  model.ts          database rows and their JSON shape
  dates.ts          "today" in Toronto, weekday counting, age
  db.ts             PostgreSQL connection pool and transactions
db/migrations/      SQL: tables and constraints, views, database users
db/seed/            the seed data and the reset routine
public/             the web UI (plain HTML, CSS and JavaScript)
tutorials/          the tutorial site (static, served at /tutorials)
starter/            the Java starter test project
postman/            Postman collection and environment
scripts/            dev (database + app), reset, db-only, Postman builder
tests/              the app's own smoke tests (Vitest)
```
