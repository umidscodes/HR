/* Tutorial 1: Getting started. Setup, a tour of the app and Swagger, HTTP basics, Postman and the Java toolkit. */
(window.ICEHR = window.ICEHR || { tutorials: [] }).tutorials.push({
  id: "getting-started",
  number: 1,
  title: "Getting started",
  summary: "Run Ice HR, explore it in the browser and in Swagger, send your first requests, and get the Java test project running.",
  intro: `
<p>Before you write automated tests, you need to know the system you are testing. In this tutorial you install Ice HR, click around its web pages,
send requests by hand in Swagger and Postman, and run the Java starter project once so you know your tools work. Nothing here needs
programming yet. The next two tutorials (REST Assured, and SQL with JDBC) build on it.</p>
<div class="callout rule"><p><strong>The one rule of this course.</strong> Before you run a test, write down what the correct result is, and where that
comes from. For Ice HR the answer is always the README, section 5 ("Business rules: the test oracle"). If the app disagrees with the README,
you have found a bug.</p></div>`,
  lessons: [
    // ------------------------------------------------------------------------------------------
    {
      id: "what-is-ice-hr",
      title: "What Ice HR is and how this course works",
      summary: "The company in the database, the four things you can test, and how the next weeks are organised.",
      body: `
<p><strong>Ice HR</strong> is a small, made-up HR system: the kind of internal app a company uses to keep track of its people. It was built only so that
you have something realistic, but not overwhelming, to test. It has:</p>
<ul>
<li>a <strong>REST API</strong> (the main thing you test) at <code>http://localhost:8080/api/v1</code>,</li>
<li>a <strong>PostgreSQL database</strong> where the data really lives,</li>
<li><strong>Swagger UI</strong>, an interactive page that documents every endpoint and lets you try it,</li>
<li>a plain <strong>web UI</strong> (no frills) that uses the same API.</li>
</ul>
<p>Unlike a real company app, Ice HR has <strong>no login</strong>: no passwords, tokens or keys. That is on purpose. You can focus on HTTP, JSON,
status codes and SQL first. Authentication comes later, with Ice Bank.</p>

<h3>The data</h3>
<p>The fictional company has <strong>9 departments</strong>, <strong>15 jobs</strong> (each with a salary range), <strong>60 employees</strong> and
<strong>35 leave requests</strong> (time off: vacation, sick or personal days). Every employee has a job, a department and, except the CEO, a manager.
Managers approve or reject their team's leave.</p>
<p>The company is based in Canada, but people work from many countries: each employee has a <code>countryCode</code> (35 in Canada, 9 in the
United States, 16 elsewhere), and every country belongs to one of <strong>20 regions</strong> (1 Northern America, 2 Central America, ...).</p>
<p>The data is <strong>seeded</strong>: after every reset it is exactly the same, with the same ids and values. So "employee 13" is always
Ethan Nguyen, a Software Engineer earning 80000. That lets you write tests that expect exact values.</p>

<h3>What you will learn</h3>
<div class="table-wrap"><table>
<thead><tr><th>Week</th><th>Focus</th><th>Where</th></tr></thead>
<tbody>
<tr><td>1</td><td>HTTP and JSON by hand; first REST Assured tests (GET, status, body); first SQL queries</td><td>This tutorial, REST Assured lessons 1 to 6, Database lessons 1 to 4</td></tr>
<tr><td>2</td><td>Negative and boundary tests, POJOs, schemas, chained flows; JDBC and checking API actions in the database</td><td>REST Assured lessons 7 to 13, Database lessons 5 to 11</td></tr>
</tbody></table></div>

<h3>How to use this site</h3>
<p>Each lesson has an explanation, examples with a <strong>Copy</strong> button, <strong>exercises</strong> you tick when you have really done them,
and a short <strong>quiz</strong>. Your ticks, notes and quiz scores are saved in this browser. Use <strong>Export progress</strong> (top right) now
and then to keep a copy.</p>`,
      examples: [
        {
          title: "The tables and how they connect",
          lang: "text",
          code: `
jobs           id, title, min_salary, max_salary
departments    id, name, code, location, manager_id -> employees.id
employees      id, first_name, last_name, gender, email, ..., job_id -> jobs.id,
               department_id -> departments.id, manager_id -> employees.id (their manager),
               country_code -> countries.code (the country they work in)
leave_requests id, employee_id -> employees.id, type, start_date, end_date, days,
               status, approver_id -> employees.id
countries      code (CA, US, ...), name, region_id -> regions.id
regions        id (1 to 20), name`,
        },
        {
          title: "A test idea, written the right way round",
          lang: "text",
          code: `
Rule (README, E16): salary must be within the job's range, both ends included.
Job 4 (Software Engineer) is 80000 to 115000.

Test: hire a Software Engineer with salary 79999.
Expected (decided BEFORE running): 422 Unprocessable Entity, code SALARY_OUT_OF_RANGE.
Then run it and compare.`,
        },
      ],
      exercises: [
        "Open the Ice HR README (in the repository root) and read sections 3 and 5. Write down three personas and why each is useful for testing.",
        "In your own words, write the difference between a 409 and a 422 in Ice HR, using one example rule for each.",
        "Pick any three rules from README section 5 and write one test idea for each, in the format of the example above (rule, test, expected result).",
      ],
      quiz: [
        {
          q: "Where does the expected result of an Ice HR test come from?",
          options: ["Whatever the API returns the first time", "The README's business rules (section 5)", "The web UI", "Swagger's example values only"],
          answer: 1,
          explain: "The README is the test oracle. If you take the expected value from the app itself, a bug becomes \"expected\" and your test can never catch it.",
        },
        {
          q: "Why does Ice HR have no login?",
          options: ["Security is not important in HR", "It is unfinished", "So you can learn HTTP, JSON and SQL first, without tokens getting in the way", "Swagger cannot handle logins"],
          answer: 2,
          explain: "Authentication is a topic of its own. Ice Bank, later in the course, has a full sign-in flow with one-time codes and tokens.",
        },
        {
          q: "After a reset, employee 13 is...",
          options: ["Whoever was created last", "A random employee", "Deleted", "Always Ethan Nguyen, with the same data"],
          answer: 3,
          explain: "The seed is fixed: same ids and values after every reset. That is what makes exact assertions possible.",
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "install",
      title: "Install and start Ice HR",
      summary: "Node.js, Git, one clone and one command. Plus how to stop, reset and fix the usual problems.",
      body: `
<p>Ice HR needs only two programs on your computer: <strong>Node.js</strong> (version 22 or newer; take the LTS version from nodejs.org) and
<strong>Git</strong>. You do not install a database: Ice HR starts its own PostgreSQL in the background.</p>

<h3>Step by step (Windows)</h3>
<ol>
<li>Open <strong>Command Prompt</strong> or <strong>PowerShell</strong> and check the tools: <code>node -v</code> (should print v22 or higher) and <code>git --version</code>.</li>
<li>Go to the folder where you keep projects, for example <code>cd %USERPROFILE%\\Documents</code>.</li>
<li>Clone and install: <code>git clone https://github.com/umidscodes/HR.git</code>, then <code>cd HR</code>, then <code>npm install</code>. The install takes a minute or two.</li>
<li>Start it: <code>npm run dev</code>. The first start creates the database and loads the data. When you see <em>Ice HR is running</em>, open
<a href="/" target="_blank" rel="noopener">http://localhost:8080</a>.</li>
</ol>
<p>Keep that terminal window open: closing it, or pressing <kbd>Ctrl</kbd>+<kbd>C</kbd>, stops Ice HR and its database. While it runs, the terminal prints
one line per API call, for example <code>[api] GET /api/v1/employees/13 -&gt; 200 4ms</code>. When your tests run, you will see their requests arrive here.</p>

<h3>Resetting the data</h3>
<p>Your tests (and you, in Swagger) will create, change and delete data. Your changes are kept even when you stop and restart Ice HR. To get back to the
seed data there are three ways, all doing the same thing:</p>
<ul>
<li>the <strong>Reset all data</strong> button on the dashboard,</li>
<li><code>POST http://localhost:8080/api/v1/reset</code> (from Swagger, Postman or a test),</li>
<li><code>npm run reset</code> in a second terminal.</li>
</ul>
<p>After a reset, the next new record gets id <strong>1001</strong> again.</p>

<div class="callout warn"><p><strong>Common problems</strong></p>
<ul>
<li><em>"Port 8080 is already in use"</em>: another program (often a Java app or a second Ice HR) uses it. Close it, or run Ice HR on another port:
<code>set PORT=8081</code> (PowerShell: <code>$env:PORT="8081"</code>) and then <code>npm run dev</code>.</li>
<li><em>The database will not start</em>: usually antivirus. Delete the <code>.icehr</code> folder inside HR and try again; if it keeps failing, see the README's troubleshooting table.</li>
<li><em>"npm is not recognized"</em>: Node.js is not installed, or the terminal was open before you installed it. Open a new terminal.</li>
<li>Pages load but show "Network error": the terminal running <code>npm run dev</code> was closed.</li>
</ul></div>`,
      examples: [
        {
          title: "First-time setup (Command Prompt or PowerShell)",
          lang: "bash",
          code: `
node -v
git --version
git clone https://github.com/umidscodes/HR.git
cd HR
npm install
npm run dev`,
        },
        {
          title: "What a good start looks like",
          lang: "text",
          code: `
[db] PostgreSQL 16 running on localhost:5434 (win32)
[db] Applying migration 001_schema.sql
[db] Applying migration 002_views.sql
[db] Applying migration 003_roles.sql
[db] Loading the seed data (first run) ...
[db] Seeded 9 departments, 15 jobs, 60 employees, 35 leave requests

  Ice HR is running  (started in 4.2s)
    App:        http://localhost:8080
    Swagger UI: http://localhost:8080/swagger
    API:        http://localhost:8080/api/v1
    Tutorials:  http://localhost:8080/tutorials/
    Database:   jdbc:postgresql://localhost:5434/icehr  (qa_reader / qa_reader)
  Press Ctrl+C to stop.`,
        },
        {
          title: "Reset from a second terminal",
          lang: "bash",
          code: `
cd HR
npm run reset`,
        },
      ],
      exercises: [
        "Install Node.js and Git if needed, clone Ice HR, run <code>npm install</code> and <code>npm run dev</code>, and open http://localhost:8080.",
        "Open http://localhost:8080/api/v1/health in your browser. Write down the value of <code>today</code>.",
        "Stop Ice HR with Ctrl+C, start it again, and time how long the second start takes compared to the first.",
        "Change an employee's phone number in the web UI, then reset the data (any of the three ways) and check that the change is gone.",
      ],
      quiz: [
        {
          q: "You closed the terminal that was running <code>npm run dev</code>. What happens?",
          options: ["Nothing, Ice HR keeps running in the background", "Ice HR and its database stop", "Only the web UI stops", "The data is deleted"],
          answer: 1,
          explain: "npm run dev runs both the app and the database. Your data is kept on disk, though: start it again and it is all still there.",
        },
        {
          q: "You created employee 1001, then reset the data. What id does the next new employee get?",
          options: ["1002", "61", "1001", "A random id"],
          answer: 2,
          explain: "A reset restores the seed and restarts new ids at 1001, so tests that create data behave the same after every reset.",
        },
        {
          q: "Which of these is NOT a way to reset Ice HR's data?",
          options: ["Restarting npm run dev", "POST /api/v1/reset", "npm run reset", "The button on the dashboard"],
          answer: 0,
          explain: "A restart keeps your data. Only the reset endpoint, the npm script and the dashboard button restore the seed.",
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "tour",
      title: "A tour of the web UI and Swagger",
      summary: "See the data in the browser, watch the API calls in DevTools, and send requests from Swagger UI.",
      body: `
<p>The quickest way to understand an API is to watch it being used. Ice HR's web pages are thin: every button calls the REST API, and the page only shows
what comes back. So the browser's DevTools show you the exact requests your tests will send later.</p>

<h3>The web UI</h3>
<ul>
<li><strong>Dashboard</strong>: counts, department statistics, and the Reset button.</li>
<li><strong>Employees</strong>: search, filter by department and status, sort, page through the 60 employees. Click a name to open the detail page:
edit the fields, see the leave balance, direct reports and leave requests, terminate or delete.</li>
<li><strong>Departments</strong>: list, add, edit and delete.</li>
<li><strong>Leave requests</strong>: request leave, and approve, reject or cancel requests.</li>
</ul>
<p>When something is not allowed, the page shows the API's error exactly as it came back: the status, the <code>code</code> and the list of invalid fields.</p>

<h3>Worked example: watch a save in DevTools</h3>
<ol>
<li>Open <a href="/employee?id=13" target="_blank" rel="noopener">Ethan Nguyen (employee 13)</a>. Press <kbd>F12</kbd> and open the <strong>Network</strong> tab. Click <strong>Fetch/XHR</strong> to hide everything except API calls.</li>
<li>Change the salary to <code>79000</code> and click <strong>Save</strong>.</li>
<li>A request <code>13</code> appears in red. Click it. <em>Headers</em> shows <code>PUT http://localhost:8080/api/v1/employees/13</code> and status <strong>422</strong>.
<em>Payload</em> shows the JSON the page sent. <em>Response</em> shows the error:
<code>"code": "SALARY_OUT_OF_RANGE"</code>, because a Software Engineer must earn 80000 to 115000.</li>
<li>Change it to <code>82000</code>, save, and look again: status <strong>200</strong>, and the response is the updated employee.</li>
</ol>

<h3>Swagger UI</h3>
<p><a href="/swagger" target="_blank" rel="noopener">Swagger UI</a> is generated from the API's <strong>OpenAPI</strong> description
(<code>/api/v1/openapi.json</code>): a machine-readable list of every endpoint, its parameters, request body and possible responses.
Open an endpoint, click <strong>Try it out</strong>, fill in the fields and click <strong>Execute</strong>. Swagger shows the <em>curl</em> command it sent,
the request URL, the response code, body and headers.</p>
<p>Below each endpoint, the <em>Responses</em> section lists every status it can return, with an example body. That is half of your test design done
for you: every listed response is at least one test.</p>`,
      examples: [
        {
          title: "What Swagger shows for GET /api/v1/employees/13",
          lang: "text",
          code: `
Curl
curl -X 'GET' 'http://localhost:8080/api/v1/employees/13' -H 'accept: application/json'

Request URL
http://localhost:8080/api/v1/employees/13

Code 200
{
  "id": 13, "firstName": "Ethan", "lastName": "Nguyen", "gender": "MALE",
  "email": "ethan.nguyen@icehr.test", "phone": "416-555-0113",
  "dateOfBirth": "1996-02-14", "hireDate": "2023-04-03",
  "jobId": 4, "departmentId": 2, "managerId": 9,
  "countryCode": "CA", "regionId": 1, "salary": 80000,
  "status": "ACTIVE", "terminationDate": null,
  "createdAt": "2023-04-03T09:00:00-04:00", "updatedAt": "2023-04-03T09:00:00-04:00"
}
Response headers
content-type: application/json
x-request-id: 1b4e...`,
        },
        {
          title: "Try it out: create a department (POST /api/v1/departments)",
          lang: "json",
          code: `
{
  "name": "Data Science",
  "code": "DS",
  "location": "Toronto"
}`,
        },
      ],
      exercises: [
        "In the web UI, find every employee with no phone number. How many are there, and what are their ids?",
        "Do the DevTools worked example above. Then trigger a 409 from the UI (hint: give an employee someone else's email) and write down the request method, URL, status and <code>code</code>.",
        "In Swagger, create the Data Science department from the example. Write down the status code and the <code>Location</code> header. Then delete it with DELETE /api/v1/departments/{id}.",
        "In Swagger, open <code>POST /api/v1/leave-requests</code> and list every error <code>code</code> it says it can return.",
      ],
      quiz: [
        {
          q: "In Swagger, what does a <code>Location</code> header on a 201 response tell you?",
          options: ["Where the server is hosted", "The URL of the resource that was just created", "The client's location", "Which page to open next"],
          answer: 1,
          explain: "After POST /api/v1/departments, Location is for example /api/v1/departments/1001: you can GET it right away.",
        },
        {
          q: "You save an employee in the web UI and get an error. Where do you see exactly what was sent?",
          options: ["In the README", "In the database", "DevTools, Network tab, the request's Payload", "In Swagger"],
          answer: 2,
          explain: "The Network tab shows the method, URL, request body (Payload), response status and response body of every call the page makes.",
        },
        {
          q: "What is <code>/api/v1/openapi.json</code>?",
          options: ["A machine-readable description of every endpoint, which Swagger UI displays", "The seed data", "A log of all requests", "The list of employees"],
          answer: 0,
          explain: "OpenAPI is the standard format for describing REST APIs. Tools (Swagger UI, Postman, code generators) read it.",
        },
      ],
      links: [
        { label: "Open Swagger UI", href: "/swagger" },
        { label: "Open the web UI", href: "/" },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "http-basics",
      title: "HTTP in ten minutes, the Ice HR way",
      summary: "Requests, responses, methods, status codes, headers and JSON: the vocabulary of every API test.",
      body: `
<p>Every API test sends an HTTP <strong>request</strong> and checks the <strong>response</strong>. Here is what each one contains.</p>

<h3>The request</h3>
<ul>
<li>A <strong>method</strong>: what you want to do. <code>GET</code> reads, <code>POST</code> creates (or triggers an action, like <code>/approve</code>),
<code>PUT</code> replaces a whole record, <code>PATCH</code> changes some fields, <code>DELETE</code> deletes.</li>
<li>A <strong>URL</strong>: <code>http://localhost:8080/api/v1/employees/13?year=2026</code> is the base URL (<code>http://localhost:8080</code>),
the base path (<code>/api/v1</code>), the resource path (<code>/employees/13</code>, where <code>13</code> is a <em>path parameter</em>) and the
<em>query parameters</em> after <code>?</code>.</li>
<li><strong>Headers</strong>: extra information as <code>Name: value</code> lines. When you send JSON you must say so: <code>Content-Type: application/json</code>.</li>
<li>Optionally a <strong>body</strong>: for Ice HR, always JSON.</li>
</ul>

<h3>The response</h3>
<ul>
<li>A <strong>status code</strong>. 2xx means success, 4xx means the client (your test) did something wrong, 5xx means the server failed.</li>
<li><strong>Headers</strong>, such as <code>Content-Type</code>, <code>Location</code> (after a create) and <code>X-Request-Id</code> (on every Ice HR response).</li>
<li>Usually a <strong>body</strong>. Ice HR errors have a standard shape called <em>problem details</em> (RFC 7807).</li>
</ul>

<h3>Ice HR's status codes</h3>
<div class="table-wrap"><table>
<thead><tr><th>Code</th><th>When</th><th>Example</th></tr></thead>
<tbody>
<tr><td>200 OK</td><td>Read, update or action succeeded</td><td>GET /employees/13</td></tr>
<tr><td>201 Created</td><td>Something new was created (with a Location header)</td><td>POST /employees</td></tr>
<tr><td>204 No Content</td><td>Deleted; there is no body</td><td>DELETE /departments/9</td></tr>
<tr><td>400 Bad Request</td><td>The request itself is wrong: missing or invalid field, broken JSON</td><td>salary "lots"</td></tr>
<tr><td>404 Not Found</td><td>No record with that id, or no such endpoint</td><td>GET /employees/999</td></tr>
<tr><td>405 Method Not Allowed</td><td>The endpoint exists but not for this method</td><td>DELETE /jobs/1</td></tr>
<tr><td>409 Conflict</td><td>Clashes with existing data or state</td><td>email already used; approving twice</td></tr>
<tr><td>415 Unsupported Media Type</td><td>A body without Content-Type: application/json</td><td>forgetting the header</td></tr>
<tr><td>422 Unprocessable Entity</td><td>Well-formed but breaks a business rule</td><td>salary outside the job's range</td></tr>
</tbody></table></div>

<h3>Worked example: one error, read carefully</h3>
<p>Send <code>DELETE /api/v1/departments/2</code>. Engineering still has people in it, so the answer is:</p>
<pre><code>HTTP/1.1 409 Conflict
Content-Type: application/problem+json
X-Request-Id: 6c1f...

{"type":"https://icehr.test/problems/department-has-employees","title":"Conflict","status":409,
 "detail":"Department 2 still has 14 employees (terminated employees count too). Move or delete them first.",
 "instance":"/api/v1/departments/2","code":"DEPARTMENT_HAS_EMPLOYEES"}</code></pre>
<p>Your test should check the <strong>status</strong> (409) and the <strong>code</strong> (<code>DEPARTMENT_HAS_EMPLOYEES</code>). The <code>detail</code> is a
sentence for humans; its wording may change, so do not build tests on it unless a rule says exactly what it must contain.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Sending JSON without <code>Content-Type: application/json</code>: Ice HR answers 415.</li>
<li>Writing numbers as strings: <code>"salary": "95000"</code> is a 400; it must be <code>"salary": 95000</code>.</li>
<li>Treating 404 and 400 the same. <code>/employees/abc</code> is a 400 (not a valid id at all); <code>/employees/999</code> is a 404 (valid id, no such employee).</li>
</ul></div>`,
      examples: [
        {
          title: "curl: read an employee (works in Command Prompt, PowerShell and Git Bash)",
          lang: "bash",
          code: `curl -i http://localhost:8080/api/v1/employees/13`,
        },
        {
          title: "curl: create a department (Git Bash or macOS/Linux)",
          lang: "bash",
          code: `
curl -i -X POST http://localhost:8080/api/v1/departments \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Data Science", "code": "DS", "location": "Toronto"}'`,
        },
        {
          title: "The same in PowerShell (single line, built-in Invoke-RestMethod)",
          lang: "powershell",
          code: `Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/departments -ContentType "application/json" -Body '{"name": "Data Science", "code": "DS", "location": "Toronto"}'`,
        },
      ],
      exercises: [
        "Send <code>GET /api/v1/employees/abc</code> and <code>GET /api/v1/employees/999</code> (browser, curl or Swagger). Write down the status and <code>code</code> of each, and explain the difference.",
        "Trigger a 405 and read the <code>Allow</code> header. Which methods does <code>/api/v1/jobs/1</code> accept?",
        "Send a POST to <code>/api/v1/departments</code> with a JSON body but without the Content-Type header (curl without <code>-H</code>). What status do you get?",
        "Find one request that returns 200, 201, 204, 400, 404, 409 and 422 each. Write them in a table: method, URL, body, status, code.",
      ],
      quiz: [
        {
          q: "<code>GET /api/v1/employees?departmentId=2&amp;size=5</code>: what is <code>departmentId</code>?",
          options: ["A path parameter", "A header", "A query parameter", "Part of the body"],
          answer: 2,
          explain: "Everything after ? is the query string: name=value pairs separated by &amp;. Path parameters are parts of the path itself, like 13 in /employees/13.",
        },
        {
          q: "Hiring someone with salary 30000 as a Software Engineer returns...",
          options: ["400, because the number is invalid", "422 SALARY_OUT_OF_RANGE", "409 Conflict", "201, salaries are not checked"],
          answer: 1,
          explain: "30000 is a valid whole number, so the request is well-formed (not 400). It breaks a business rule (range 80000 to 115000), which is a 422.",
        },
        {
          q: "Which part of an error response should your test assert on?",
          options: ["status and code", "Only the detail sentence", "Only X-Request-Id", "The title only"],
          answer: 0,
          explain: "code is stable and machine-readable. detail is written for people and may be reworded.",
        },
        {
          q: "What does a 204 response contain?",
          options: ["The deleted record", "An error", "A Location header", "No body"],
          answer: 3,
          explain: "204 No Content: success, and nothing to send back. Ice HR uses it for DELETE.",
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "postman",
      title: "Postman: requests, variables and tests",
      summary: "Import the Ice HR collection, run it, and read the small tests inside each request.",
      body: `
<p><strong>Postman</strong> is a desktop app for sending HTTP requests and saving them in <em>collections</em>. Testers use it to explore an API before
automating it, and teams share collections as living documentation. Ice HR ships a collection with <strong>64 requests</strong> covering every endpoint,
including the error cases.</p>

<h3>Import it</h3>
<ol>
<li>Install Postman (the free desktop app) and open it. You can skip creating an account.</li>
<li>Click <strong>Import</strong> and select both files from the <code>postman</code> folder in Ice HR:
<code>IceHR.postman_collection.json</code> and <code>IceHR-local.postman_environment.json</code>.</li>
<li>Top right, choose the environment <strong>Ice HR - local</strong>. It holds one variable, <code>baseUrl</code> = <code>http://localhost:8080/api/v1</code>.
Requests use it as <code>{{baseUrl}}/employees/13</code>, so you can point every request at another server by changing one value.</li>
</ol>

<h3>Variables that carry data between requests</h3>
<p>"Hire an employee" saves the new id with <code>pm.collectionVariables.set("employeeId", ...)</code>. Later requests use <code>{{employeeId}}</code>:
give a raise, request leave, terminate, delete. This is called <strong>chaining</strong>: the output of one request is the input of the next. You will
do the same in Java with REST Assured.</p>

<h3>Tests in Postman</h3>
<p>Each request has a <strong>Tests</strong> tab (called <em>Scripts, Post-response</em> in newer versions) with JavaScript that runs after the response arrives:</p>
<pre><code>pm.test("status is 422", () =&gt; pm.response.to.have.status(422));
pm.test("code SALARY_OUT_OF_RANGE", () =&gt; pm.expect(pm.response.json().code).to.eql("SALARY_OUT_OF_RANGE"));</code></pre>
<p>Results appear in the <strong>Test Results</strong> tab of the response. The <strong>Collection Runner</strong> (Run collection) sends every request in
order and shows a pass/fail report. The collection starts and ends with a reset, so you can run it again and again.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>No environment selected: every URL starts with <code>{{baseUrl}}</code> and fails with "Invalid URL".</li>
<li>Running "Request vacation" before "Hire an employee": <code>{{employeeId}}</code> is empty, so the body is invalid JSON. Run the folders in order.</li>
<li>Editing a request and forgetting to save (<kbd>Ctrl</kbd>+<kbd>S</kbd>): the Runner uses the saved version.</li>
</ul></div>`,
      examples: [
        {
          title: "A test you can paste into any request's Tests tab",
          lang: "javascript",
          code: `
pm.test("status is 200", () => pm.response.to.have.status(200));
pm.test("JSON response", () => pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json"));
pm.test("fast enough", () => pm.expect(pm.response.responseTime).to.be.below(500));`,
        },
        {
          title: "Run the whole collection from the command line with Newman",
          lang: "bash",
          code: `npx newman run postman/IceHR.postman_collection.json -e postman/IceHR-local.postman_environment.json`,
        },
      ],
      exercises: [
        "Import the collection and environment, select the environment, and send <em>0. Start here / Health</em>. Check that both tests pass.",
        "Run the whole collection in the Collection Runner. How many requests and how many tests are there? Did all pass?",
        "Add a new request to the Employees folder: <code>GET {{baseUrl}}/employees?status=TERMINATED</code>, with tests that the status is 200 and that <code>totalElements</code> is 1.",
        "Duplicate \"Hire below the salary range (422)\" and turn it into a boundary test: salary 80000 must return 201. Delete the employee afterwards so the data stays clean.",
      ],
      quiz: [
        {
          q: "Why do the requests use <code>{{baseUrl}}</code> instead of the full URL?",
          options: ["Postman requires it", "It is faster", "To hide the URL", "To point every request at another server by changing one variable"],
          answer: 3,
          explain: "Environments hold values that change between setups (local, a test server, another port). Requests stay the same.",
        },
        {
          q: "\"Request vacation\" uses <code>{{employeeId}}</code>. Where does that value come from?",
          options: ["The environment file", "The Tests script of \"Hire an employee\" saved it after the 201 response", "Postman generates it", "The README"],
          answer: 1,
          explain: "pm.collectionVariables.set(\"employeeId\", pm.response.json().id) stores the new id so later requests can use it: chaining.",
        },
        {
          q: "Where do you see the result of a request's <code>pm.test(...)</code> checks?",
          options: ["In the Test Results tab of the response", "In the terminal running npm run dev", "In Swagger", "In the database"],
          answer: 0,
          explain: "Each pm.test appears as PASS or FAIL in Test Results, and in the Runner's report.",
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "java-toolkit",
      title: "Your Java toolkit: JDK, Maven, IntelliJ and the starter project",
      summary: "Install the tools, open the starter project, run its 28 tests and read the results.",
      body: `
<p>Your automated tests live in <code>starter/</code>, a ready-made <strong>Maven</strong> project inside the Ice HR folder. Maven is Java's build tool:
it downloads the libraries listed in <code>pom.xml</code> (REST Assured, JUnit 5, AssertJ, the PostgreSQL driver...), compiles your code and runs the tests.</p>

<h3>Install</h3>
<ul>
<li>A <strong>JDK</strong>, version 17 or 21 (for example Eclipse Temurin). Check with <code>java -version</code>.</li>
<li><strong>Maven</strong> 3.9 or newer. Check with <code>mvn -v</code>. (IntelliJ also has Maven built in, so you can run tests from the IDE even without it.)</li>
<li><strong>IntelliJ IDEA</strong> Community Edition.</li>
</ul>

<h3>Open and run</h3>
<ol>
<li>Make sure Ice HR is running (<code>npm run dev</code>).</li>
<li>In IntelliJ: <em>File, Open</em>, select the <code>starter</code> folder (the one containing <code>pom.xml</code>), and open it as a project.
Wait while IntelliJ downloads the libraries (bottom status bar).</li>
<li>Open <code>src/test/java/com/icehr/tests/HealthApiTest.java</code> and click the green arrow next to the class name. Two tests should pass.</li>
<li>In a terminal in the <code>starter</code> folder, run <code>mvn test</code>. The first run downloads libraries and takes a few minutes; then you should see
<code>Tests run: 28, Failures: 0, Errors: 0, Skipped: 0</code> and <code>BUILD SUCCESS</code>.</li>
</ol>

<h3>What is in the starter</h3>
<div class="table-wrap"><table>
<thead><tr><th>Where</th><th>What it is for</th></tr></thead>
<tbody>
<tr><td><code>config/Config</code> and <code>resources/config/local.properties</code></td><td>Base URL and database settings in one place</td></tr>
<tr><td><code>api/Specs</code></td><td>Shared request settings (base URL, <code>/api/v1</code>, JSON) and common response checks</td></tr>
<tr><td><code>model/</code></td><td>Java records matching the JSON: Employee, NewEmployee, Department, LeaveRequest, Problem, Page</td></tr>
<tr><td><code>db/Db</code></td><td>Run SQL from tests, as <code>qa_reader</code> or <code>qa_writer</code></td></tr>
<tr><td><code>support/TestData</code></td><td>Unique emails and dates that never go stale</td></tr>
<tr><td><code>tests/</code></td><td>The example tests. Start with <code>HealthApiTest</code>.</td></tr>
</tbody></table></div>

<h3>Reading a failure</h3>
<p>Stop Ice HR and run <code>HealthApiTest</code> again. It fails with <code>java.net.ConnectException: Connection refused</code>: nothing answers on port 8080.
Start Ice HR and it passes. Get used to reading the first lines of a failure: they nearly always say what went wrong. An assertion failure looks like
<code>Expected status code &lt;200&gt; but was &lt;404&gt;</code>, and the starter then prints the whole request and response below it.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Opening the <em>HR</em> folder instead of <em>starter</em> in IntelliJ: it does not find <code>pom.xml</code> at the top, so nothing runs.</li>
<li>PowerShell and <code>-D</code> flags: write <code>mvn test "-Dtest=JobsApiTest"</code> with quotes.</li>
<li>Red imports in IntelliJ: open the Maven tool window and click <em>Reload All Maven Projects</em>.</li>
</ul></div>`,
      examples: [
        {
          title: "Run the tests from a terminal (in the starter folder)",
          lang: "bash",
          code: `
mvn test
mvn test -Dtest=JobsApiTest
mvn test -Dgroups=db`,
        },
        {
          title: "Your first test (HealthApiTest)",
          lang: "java",
          code: `
@Test
void ice_hr_is_up() {
    given()
            .baseUri("http://localhost:8080")
    .when()
            .get("/api/v1/health")
    .then()
            .statusCode(200)
            .body("status", equalTo("UP"))
            .body("database", equalTo("UP"));
}`,
        },
      ],
      exercises: [
        "Install a JDK (17 or 21), Maven and IntelliJ Community. Paste the output of <code>java -version</code> and <code>mvn -v</code> into your notes.",
        "Open the starter project in IntelliJ and run <code>HealthApiTest</code> from the green arrow.",
        "Run <code>mvn test</code> in a terminal. How many tests ran, and how long did the whole run take?",
        "Stop Ice HR, run <code>JobsApiTest</code>, and copy the first line of the error into your notes. Start Ice HR again and rerun it.",
        "Change <code>equalTo(\"UP\")</code> to <code>equalTo(\"DOWN\")</code> in HealthApiTest, run it, read the failure message, then change it back.",
      ],
      quiz: [
        {
          q: "What does Maven do when you run <code>mvn test</code>?",
          options: ["Starts Ice HR", "Downloads the libraries from pom.xml, compiles the tests and runs them", "Resets the database", "Opens IntelliJ"],
          answer: 1,
          explain: "Maven reads pom.xml, fetches the dependencies (once), compiles src/test/java and runs the tests with JUnit.",
        },
        {
          q: "A test fails with <code>Connection refused</code>. The most likely cause?",
          options: ["Ice HR (npm run dev) is not running", "The assertion is wrong", "Maven is too old", "The employee does not exist"],
          answer: 0,
          explain: "Connection refused means nothing is listening on that port. Start Ice HR and run the test again.",
        },
        {
          q: "Which folder do you open in IntelliJ?",
          options: ["HR (the repository root)", "src", "node_modules", "starter, the folder that contains pom.xml"],
          answer: 3,
          explain: "IntelliJ recognises a Maven project by the pom.xml at the top of the folder you open.",
        },
      ],
    },
  ],
});
