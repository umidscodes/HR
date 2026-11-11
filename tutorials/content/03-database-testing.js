/*
 * Tutorial 3: SQL and database testing with JDBC.
 * Every query and result below was run against a fresh Ice HR seed (db/migrations/*.sql, db/seed/data.ts).
 * Every Java example compiles and passes against the starter project (starter/, package com.icehr).
 */
(window.ICEHR = window.ICEHR || { tutorials: [] }).tutorials.push({
  id: "database-testing",
  number: 3,
  title: "SQL and database testing with JDBC",
  summary: "Read the Ice HR database with SQL, learn its rules, and write Java tests that check what the API really did to the rows.",
  intro: `
<p>An API test tells you what the server <em>said</em> happened. A database check shows you what <em>really</em> happened. When you hire someone
through <code>POST /api/v1/employees</code>, the response says <code>"status": "ACTIVE"</code>. But was the email stored in lower case? Did the
row get the right department? When you terminate someone, were their pending leave requests cancelled too? Only the tables can answer that.</p>
<p>This tutorial is your database material for weeks 1 and 2. You start in DBeaver, writing SQL by hand against the Ice HR seed data, and you
finish in Java, with JUnit tests in the starter project that call the API and then check the rows with JDBC.</p>
<p>When you finish, you will be able to:</p>
<ul>
<li>connect to the Ice HR database as a read-only and as a read-write user, and find your way around its 6 tables and 3 views;</li>
<li>write <code>SELECT</code> queries with filters, sorting, grouping, joins, subqueries and CTEs, and predict their results from the seed data;</li>
<li>change data safely inside a transaction, and explain each database constraint and the error it gives;</li>
<li>use JDBC and the starter's <code>Db</code> helper to check API actions in the database, set up test data with SQL, and clean up after yourself.</li>
</ul>
<div class="callout rule"><p><strong>Two rules for every lesson.</strong> (1) Read with <code>qa_reader</code>; switch to <code>qa_writer</code> only when you
mean to change data, and then do it inside a transaction you can roll back. (2) Before you run a query, write down the result you expect.
The seed data is the same after every reset, so every number in this tutorial is one you can reproduce.</p></div>
<p>If your data no longer matches the numbers here, reset it: <code>POST /api/v1/reset</code> in Swagger, the Reset button on the dashboard, or
<code>npm run reset</code>.</p>`,
  lessons: [
    // ------------------------------------------------------------------------------------------
    {
      id: "connect",
      title: "Connecting to the Ice HR database",
      summary: "Set up DBeaver (or IntelliJ) as the read-only and the read-write user, and take a tour of the tables, views and their links.",
      body: `
<p>Ice HR stores everything in a <strong>PostgreSQL 16</strong> database. A <strong>database</strong> is a program that keeps data in
<strong>tables</strong>: grids with named <strong>columns</strong> and one <strong>row</strong> per record. You talk to it in <strong>SQL</strong>
(Structured Query Language). To type SQL and see the results you need a client. This course uses <strong>DBeaver</strong> (free, Community edition).
IntelliJ IDEA <em>Ultimate</em> has the same features in its Database tool window; the Community edition does not.</p>

<h3>Before you connect</h3>
<p>The database is started by <code>npm run dev</code> (or <code>npm run db:start</code> if you only want the database). It listens on port
<strong>5434</strong>, not the usual PostgreSQL port 5432, so it never clashes with another PostgreSQL on your PC. If Ice HR is not running,
nothing listens on 5434 and every client reports <em>Connection refused</em>.</p>

<div class="table-wrap"><table>
<thead><tr><th>Setting</th><th>Value</th></tr></thead>
<tbody>
<tr><td>Host / port</td><td><code>localhost</code> / <code>5434</code></td></tr>
<tr><td>Database</td><td><code>icehr</code> (all lower case)</td></tr>
<tr><td>JDBC URL</td><td><code>jdbc:postgresql://localhost:5434/icehr</code></td></tr>
<tr><td>Read-only user</td><td><code>qa_reader</code>, password <code>qa_reader</code>: can <code>SELECT</code> from every table and view, nothing else</td></tr>
<tr><td>Read-write user</td><td><code>qa_writer</code>, password <code>qa_writer</code>: can also <code>INSERT</code>, <code>UPDATE</code> and <code>DELETE</code></td></tr>
</tbody></table></div>
<p>The app itself connects as a third user, <code>hr_app</code>. You never need it.</p>

<h3>Step by step in DBeaver</h3>
<ol>
<li>Install <em>DBeaver Community</em> for Windows and open it.</li>
<li>Choose <strong>Database → New Database Connection → PostgreSQL → Next</strong>.</li>
<li>Fill in Host <code>localhost</code>, Port <code>5434</code>, Database <code>icehr</code>, Username <code>qa_reader</code>, Password <code>qa_reader</code>.
Tick <em>Save password</em>.</li>
<li>Click <strong>Test Connection</strong>. The first time, DBeaver offers to download the PostgreSQL driver. Accept.</li>
<li>Click <strong>Connection details (name, type, ...)</strong>, name it <em>Ice HR (reader)</em>, tick <strong>Read-only connection</strong>, then Finish.</li>
<li>Create a second connection the same way with <code>qa_writer</code> / <code>qa_writer</code>. Name it <em>Ice HR (WRITER)</em> and give it a
different connection type colour (for example orange), so you always see which one you are in.</li>
<li>For the WRITER connection, turn auto-commit off: <em>Edit Connection → Connection settings → Initialization</em>, untick <strong>Auto-commit</strong>
(or use the auto-commit button in the SQL editor toolbar). In <strong>manual commit</strong> mode nothing you change is permanent until you
press Commit or run <code>COMMIT</code>. Rollback undoes it.</li>
</ol>
<p>Open a SQL editor with <kbd>Ctrl</kbd>+<kbd>]</kbd>. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs the statement under the cursor.
<kbd>Alt</kbd>+<kbd>X</kbd> runs the whole script, one statement after another.</p>
<p><strong>IntelliJ Ultimate instead:</strong> open the <em>Database</em> tool window, click <strong>+ → Data Source → PostgreSQL</strong>, and enter
the same host, port, database, user and password. Click <em>Test Connection</em> (download the driver if asked). Right-click the data source →
<em>New → Query Console</em> to type SQL. The connection's <em>Options</em> tab has a <em>Read-only</em> tick and a transaction mode (Auto or Manual).</p>

<h3>A tour of the schema</h3>
<p>A <strong>schema</strong> is a folder of tables inside a database. Ice HR uses the default one, <code>public</code>. In DBeaver open
<em>icehr → Schemas → public</em>. You will see:</p>
<div class="table-wrap"><table>
<thead><tr><th>Object</th><th>Rows after a reset</th><th>What it holds</th></tr></thead>
<tbody>
<tr><td><code>jobs</code> (table)</td><td>15</td><td>Job titles with a salary range: <code>min_salary</code>, <code>max_salary</code></td></tr>
<tr><td><code>departments</code> (table)</td><td>9</td><td>Name, code, location and <code>manager_id</code> (an employee)</td></tr>
<tr><td><code>employees</code> (table)</td><td>60</td><td>People, with <code>job_id</code>, <code>department_id</code>, <code>manager_id</code>, <code>country_code</code>, gender, salary, status</td></tr>
<tr><td><code>leave_requests</code> (table)</td><td>35</td><td>Time off: <code>employee_id</code>, type, dates, <code>days</code>, status, <code>approver_id</code></td></tr>
<tr><td><code>regions</code> (table)</td><td>20</td><td>World regions, ids 1 to 20 (Northern America, Western Europe, Eastern Asia, ...). Read-only reference data.</td></tr>
<tr><td><code>countries</code> (table)</td><td>82</td><td>Countries by two-letter <code>code</code> (<code>CA</code>, <code>US</code>, ...), each with a <code>region_id</code>. Read-only reference data.</td></tr>
<tr><td><code>v_department_stats</code> (view)</td><td>9</td><td>Headcount and salary figures per department</td></tr>
<tr><td><code>v_employee_directory</code> (view)</td><td>60</td><td>Every employee with job title, department, manager, country and region names</td></tr>
<tr><td><code>v_region_stats</code> (view)</td><td>20</td><td>Countries and active headcount per region, including regions where nobody works</td></tr>
</tbody></table></div>
<p>A <strong>view</strong> is a saved <code>SELECT</code>. You query it like a table, and it always shows current data. You also see a seventh table,
<code>schema_migrations</code>. It only records which setup scripts have run (one row per script). Ignore it.</p>

<h3>Reading the ER diagram</h3>
<p>An <strong>ER diagram</strong> (entity-relationship diagram) draws each table as a box and each link between tables as a line. In DBeaver,
right-click <code>public</code> → <strong>View Diagram</strong> (or open a table and pick its <em>ER Diagram</em> tab). In IntelliJ, right-click
the schema → <em>Diagrams → Show Diagram</em>.</p>
<p>Each line is a <strong>foreign key</strong>: a column whose value must be the id of a row in another table. The line usually has a "many" end
(a fork, or "crow's foot") and a "one" end. Read Ice HR like this:</p>
<ul>
<li><code>employees.job_id → jobs.id</code>: many employees have one job.</li>
<li><code>employees.department_id → departments.id</code>: many employees work in one department.</li>
<li><code>employees.manager_id → employees.id</code>: a line from the table to itself. An employee's manager is another employee.</li>
<li><code>departments.manager_id → employees.id</code>: a department is run by one employee. With the line above, departments and employees point at each other.</li>
<li><code>employees.country_code → countries.code</code>: many employees work in one country. This key is a two-letter text code, not a number.</li>
<li><code>countries.region_id → regions.id</code>: many countries are in one region. So an employee's region is two hops away: employee → country → region.</li>
<li><code>leave_requests.employee_id → employees.id</code> and <code>leave_requests.approver_id → employees.id</code>: two lines to the same table, one for who asked and one for who decided.</li>
</ul>

<h3>Worked example: your first query</h3>
<p>In the reader connection run <code>SELECT current_user, current_database(), version();</code>. You get one row:</p>
<div class="table-wrap"><table>
<thead><tr><th>Column</th><th>Value</th><th>What it tells you</th></tr></thead>
<tbody>
<tr><td><code>current_user</code></td><td><code>qa_reader</code></td><td>Which user you are. If it says <code>qa_writer</code>, you can change data: slow down.</td></tr>
<tr><td><code>current_database</code></td><td><code>icehr</code></td><td>You are in the right database.</td></tr>
<tr><td><code>version</code></td><td><code>PostgreSQL 16.x on ...</code></td><td>The server version (the exact build depends on your PC).</td></tr>
</tbody></table></div>
<p>One more thing to know from day one: columns such as <code>created_at</code> are <code>timestamptz</code>, a single moment in time. DBeaver shows
them in your PC's time zone. Ethan Nguyen's row was created at 09:00 Toronto time on 2023-04-03; a client set to UTC shows the same moment as 13:00.</p>

<h3>Reading connection errors</h3>
<div class="table-wrap"><table>
<thead><tr><th>Message (shortened)</th><th>SQLSTATE</th><th>Meaning and fix</th></tr></thead>
<tbody>
<tr><td><em>Connection to localhost:5434 refused</em></td><td><code>08001</code></td><td>Nothing listens on that port: Ice HR is not running. Start <code>npm run dev</code>, and check you typed 5434.</td></tr>
<tr><td><em>password authentication failed for user "qa_reader"</em></td><td><code>28P01</code></td><td>Wrong user or password. Locally the password equals the user name.</td></tr>
<tr><td><em>database "IceHR" does not exist</em></td><td><code>3D000</code></td><td>Database names are exact. It is <code>icehr</code>.</td></tr>
<tr><td><em>permission denied for table employees</em></td><td><code>42501</code></td><td>You are connected, but this user may not do that (for example <code>qa_reader</code> running <code>UPDATE</code>).</td></tr>
</tbody></table></div>
<p>A <strong>SQLSTATE</strong> is a five-character error code defined by the SQL standard. It does not change between versions or languages, so
it is what you check in automated tests, the same way you check <code>code</code> rather than <code>detail</code> in an API error.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Typing port <code>5432</code> out of habit. Ice HR's database is on <code>5434</code>.</li>
<li>Doing all your reading in the WRITER connection "because it can do more". One stray <code>UPDATE</code> and your data no longer matches the seed.</li>
<li>Leaving the WRITER connection on auto-commit. Then every statement is permanent the moment it runs.</li>
<li>Stopping <code>npm run dev</code> (Ctrl+C) and wondering why DBeaver lost its connection. The database stops with the app.</li>
</ul></div>`,
      examples: [
        {
          title: "Who am I, and where am I?",
          lang: "sql",
          code: `
SELECT current_user, current_database(), version();

-- The time zone DBeaver uses for this session (timestamps are shown in it)
SHOW TIME ZONE;`,
        },
        {
          title: "List the tables and views, then the columns of one table",
          lang: "sql",
          code: `
SELECT table_name, table_type
  FROM information_schema.tables
 WHERE table_schema = 'public'
 ORDER BY table_type, table_name;

SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'employees'
 ORDER BY ordinal_position;`,
          note: "<code>information_schema</code> is the standard catalogue that every SQL database has. It is the same information DBeaver's navigator shows.",
        },
        {
          title: "How many rows does each table have?",
          lang: "sql",
          code: `
SELECT 'jobs' AS table_name, COUNT(*) AS row_count FROM jobs
UNION ALL SELECT 'departments', COUNT(*) FROM departments
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL SELECT 'regions', COUNT(*) FROM regions
UNION ALL SELECT 'countries', COUNT(*) FROM countries;`,
          note: "After a reset: 15, 9, 60, 35, 20 and 82. <code>UNION ALL</code> glues the results of several queries into one list.",
        },
        {
          title: "What may this user do?",
          lang: "sql",
          code: `
SELECT current_user,
       has_table_privilege('employees', 'SELECT') AS can_select,
       has_table_privilege('employees', 'INSERT') AS can_insert,
       has_table_privilege('employees', 'UPDATE') AS can_update,
       has_table_privilege('employees', 'DELETE') AS can_delete;`,
          note: "As <code>qa_reader</code> you get <code>true, false, false, false</code>. Run it in the WRITER connection and compare.",
        },
      ],
      exercises: [
        "Create the <em>Ice HR (reader)</em> connection as <code>qa_reader</code>, mark it read-only, and run the first example. Write down the PostgreSQL version and the time zone of your session.",
        "Create the <em>Ice HR (WRITER)</em> connection as <code>qa_writer</code> with a different colour and auto-commit off. Run the privileges example in both connections and note the difference.",
        "Open the ER diagram of the <code>public</code> schema. On paper, list every foreign key line with its \"many\" table and its \"one\" table. You should find six.",
        "Stop Ice HR (Ctrl+C in its terminal), click <em>Test Connection</em> in DBeaver, and copy the exact error message. Start Ice HR again and check the connection works.",
        "Run the column list for <code>leave_requests</code>. Which columns may be NULL (<code>is_nullable = YES</code>)? For each one, say in one sentence why it makes sense that it can be empty.",
      ],
      quiz: [
        {
          q: `DBeaver says <em>Connection to localhost:5434 refused</em>. What is the most likely cause?`,
          options: [`The password for <code>qa_reader</code> is wrong`, `<code>qa_reader</code> may not read the employees table`, `Ice HR (and so its database) is not running`, `The database is called <code>IceHR</code>, not <code>icehr</code>`],
          answer: 2,
          explain: `"Refused" means nothing answered on that port at all. A wrong password (28P01), a wrong database name (3D000) and a missing permission (42501) all give different messages, because the server has to be running to send them.`,
        },
        {
          q: `Why do you make a second connection as <code>qa_writer</code> with auto-commit switched off?`,
          options: [`So every change waits for your <code>COMMIT</code>, and you can undo experiments with a rollback`, `Because <code>qa_writer</code> cannot run <code>SELECT</code>`, `Because auto-commit is not supported by PostgreSQL`, `So the app can see your changes before you commit them`],
          answer: 0,
          explain: `In manual commit mode your changes stay inside an open transaction. Nobody else sees them, and a rollback throws them away. The app only sees them after you commit.`,
        },
        {
          q: `In the ER diagram there is a line from <code>employees</code> back to <code>employees</code>. What does it mean?`,
          options: [`The table is stored twice`, `Each employee has a unique email`, `It is a view, not a table`, `<code>manager_id</code> holds the id of another employee: the manager`],
          answer: 3,
          explain: `A foreign key can point at its own table. <code>employees.manager_id</code> references <code>employees.id</code>. Margaret Chen (1), the CEO, is the only employee with no manager.`,
        },
        {
          q: `What is a view such as <code>v_department_stats</code>?`,
          options: [`A copy of the data made at the last reset`, `A saved SELECT that you query like a table, always showing current data`, `A table that only <code>qa_writer</code> can read`, `A backup of the departments table`],
          answer: 1,
          explain: `A view stores the query, not the rows. Each time you read it, PostgreSQL runs the query again on the current data.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "select",
      title: "SELECT, WHERE and ORDER BY",
      summary: "Choose the rows and columns you need, filter them with conditions, handle NULL, and sort and page the result like the API does.",
      body: `
<p>Almost every database check in a test is a <code>SELECT</code>: "find the row the API just changed and compare its columns with what I expect".
A <code>SELECT</code> has up to five parts. PostgreSQL works through them in this order:</p>
<ol>
<li><code>FROM</code>: which table.</li>
<li><code>WHERE</code>: which rows to keep.</li>
<li><code>SELECT</code>: which columns to show.</li>
<li><code>ORDER BY</code>: in which order.</li>
<li><code>LIMIT</code> / <code>OFFSET</code>: how many rows, starting where.</li>
</ol>

<h3>Columns or *</h3>
<p><code>SELECT * FROM employees</code> shows every column. That is fine while you explore. In a test, name the columns you check:
<code>SELECT first_name, salary FROM employees</code>. The query then says what you test, and it does not break when someone adds a column.
You can rename a result column with an <strong>alias</strong>: <code>SELECT salary AS yearly_pay</code>.</p>

<h3>WHERE: filtering rows</h3>
<ul>
<li>Compare with <code>=</code>, <code>&lt;&gt;</code> (not equal), <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code>.</li>
<li>Combine conditions with <code>AND</code> (both must be true), <code>OR</code> (at least one) and <code>NOT</code>.</li>
<li><code>department_id IN (5, 6)</code> is short for <code>department_id = 5 OR department_id = 6</code>.</li>
<li><code>salary BETWEEN 80000 AND 90000</code> includes <em>both</em> ends: it means <code>salary &gt;= 80000 AND salary &lt;= 90000</code>.</li>
</ul>
<p><code>AND</code> is applied before <code>OR</code>, like × before + in maths. Use brackets whenever you mix them. Worked example:</p>
<pre><code>WHERE department_id = 7 OR department_id = 8 AND salary &gt; 55000</code></pre>
<p>returns <strong>13</strong> rows: all 11 Sales employees, plus the two Customer Support employees who earn more than 55000 (Marc Gagnon 92000 and
Sophie Pelletier 58000). PostgreSQL read it as <code>7 OR (8 AND salary &gt; 55000)</code>. What you probably meant,
<code>(department_id = 7 OR department_id = 8) AND salary &gt; 55000</code>, returns <strong>8</strong> rows.</p>

<h3>Text: quotes, LIKE and ILIKE</h3>
<p>Text values go in <strong>single quotes</strong>: <code>WHERE last_name = 'Wong'</code>. Double quotes mean something else in SQL (a column or
table name), so never use them for values. If the text itself contains an apostrophe, write it twice:
<code>WHERE last_name = 'O''Brien'</code> finds Liam O'Brien (id 10). Just one quote, <code>'O'Brien'</code>, is a syntax error.</p>
<p><code>LIKE</code> matches a pattern: <code>%</code> means "any characters, or none", and <code>_</code> means "exactly one character".
<code>LIKE</code> is case-sensitive. <code>ILIKE</code> (a PostgreSQL extra) ignores case:</p>
<ul>
<li><code>last_name LIKE 'M%'</code> → 6 rows (MacDonald, Martin, Murray, Mendez, Morin, Mensah).</li>
<li><code>last_name LIKE 'm%'</code> → 0 rows. Every last name starts with a capital.</li>
<li><code>last_name ILIKE 'm%'</code> → the same 6 rows again.</li>
</ul>
<p>The API's <code>?search=</code> filter ignores case and looks in first name, last name and email. <code>GET /api/v1/employees?search=MAR</code>
returns ids 1, 8, 12, 21 and 39, exactly the rows of
<code>WHERE first_name ILIKE '%mar%' OR last_name ILIKE '%mar%' OR email ILIKE '%mar%'</code>. That is how you build a test oracle with SQL.</p>

<h3>NULL: "no value"</h3>
<p><strong>NULL</strong> means "unknown" or "nothing here". It is not 0 and not an empty string. Employees 20 (Hannah Schmidt), 35 (Sarah Cohen)
and 47 (Andrew Campbell) have no phone, so their <code>phone</code> is NULL. Any comparison with NULL gives "unknown", which <code>WHERE</code>
treats as false. So <code>WHERE phone = NULL</code> returns <strong>0</strong> rows, always. Use <code>WHERE phone IS NULL</code> (3 rows) or
<code>IS NOT NULL</code> (57 rows).</p>

<h3>Dates</h3>
<p>Dates are written as text in ISO format, <code>'2025-01-01'</code>, and PostgreSQL turns them into a <code>date</code> because the column is a date.
You can be explicit with <code>DATE '2025-01-01'</code>. <code>hire_date BETWEEN '2025-01-01' AND '2025-12-31'</code> finds the 6 people hired in
2025 (ids 41, 21, 57, 32, 49 and 36 in date order). Never write dates as <code>'01/02/2025'</code>: is that January or February?</p>

<h3>ORDER BY, LIMIT and OFFSET (and API paging)</h3>
<p>Without <code>ORDER BY</code> the order of rows is <em>not defined</em>. It may look stable today and change tomorrow. Always sort when the order
matters, and add a unique column (usually <code>id</code>) at the end to break ties: <code>ORDER BY last_name, id</code>.
<code>DESC</code> sorts from high to low.</p>
<p><code>LIMIT n</code> keeps the first n rows; <code>OFFSET k</code> skips k rows first. This is exactly how the API's paging works:
<code>?page=p&amp;size=s</code> is <code>LIMIT s OFFSET p × s</code>. Worked example: <code>GET /api/v1/employees?page=4&amp;size=5</code> returns ids
21, 22, 23, 24 and 25, the same as <code>SELECT id FROM employees ORDER BY id LIMIT 5 OFFSET 20</code>. The API always adds <code>id</code> as a
tie-breaker, so you should too.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li><code>WHERE phone = NULL</code>. It never matches. Use <code>IS NULL</code>.</li>
<li>Mixing <code>AND</code> and <code>OR</code> without brackets.</li>
<li>Double quotes around text: <code>WHERE last_name = "Wong"</code> fails with <em>column "Wong" does not exist</em>.</li>
<li>Expecting <code>LIKE</code> to ignore case. Use <code>ILIKE</code> when the API's search ignores case.</li>
<li>Comparing the "first row" of a query without <code>ORDER BY</code>.</li>
</ul></div>`,
      examples: [
        {
          title: "Everyone in Engineering, best paid first",
          lang: "sql",
          code: `
SELECT id, first_name, last_name, salary
  FROM employees
 WHERE department_id = 2
 ORDER BY salary DESC, id;`,
          note: "14 rows, from Daniel Okafor (172000) down to Ethan Nguyen (80000, the minimum for a Software Engineer).",
        },
        {
          title: "Filters: AND, OR, IN, BETWEEN, LIKE and ILIKE",
          lang: "sql",
          code: `
-- QA department, 80000 or more: Sofia, Nadia, Emma, Isabella (4 rows)
SELECT id, first_name, last_name, salary
  FROM employees
 WHERE department_id = 3 AND salary >= 80000
 ORDER BY salary DESC;

-- Human Resources or Finance (11 rows)
SELECT id, first_name, last_name, department_id
  FROM employees
 WHERE department_id IN (5, 6)
 ORDER BY id;

-- Hired in 2025 (6 rows)
SELECT id, first_name, last_name, hire_date
  FROM employees
 WHERE hire_date BETWEEN DATE '2025-01-01' AND DATE '2025-12-31'
 ORDER BY hire_date;

-- The same rows as GET /api/v1/employees?search=MAR (ids 1, 8, 12, 21, 39)
SELECT id, first_name, last_name, email
  FROM employees
 WHERE first_name ILIKE '%mar%' OR last_name ILIKE '%mar%' OR email ILIKE '%mar%'
 ORDER BY id;`,
        },
        {
          title: "NULL and the apostrophe in O'Brien",
          lang: "sql",
          code: `
-- 0 rows: a comparison with NULL is never true
SELECT id, first_name, last_name FROM employees WHERE phone = NULL;

-- 3 rows: 20 Hannah Schmidt, 35 Sarah Cohen, 47 Andrew Campbell
SELECT id, first_name, last_name, phone FROM employees WHERE phone IS NULL ORDER BY id;

-- Two single quotes inside the text stand for one apostrophe
SELECT id, first_name, last_name, email FROM employees WHERE last_name = 'O''Brien';`,
        },
        {
          title: "Paging like the API: page 4, size 5",
          lang: "sql",
          code: `
-- GET /api/v1/employees?page=4&size=5  ->  ids 21 to 25
SELECT id, first_name, last_name
  FROM employees
 ORDER BY id
 LIMIT 5 OFFSET 20;   -- OFFSET = page * size

-- GET /api/v1/employees?sort=lastName,asc&size=3  (first page)
SELECT id, first_name, last_name
  FROM employees
 ORDER BY last_name, id
 LIMIT 3;`,
        },
      ],
      exercises: [
        "Write a query that lists the Sales employees (department 7) who earn less than 55000, lowest salary first. Before you run it, use the README to predict how many rows you will get.",
        "Find every employee whose email contains <code>son</code>. Then call <code>GET /api/v1/employees?search=son</code> in Swagger and compare the ids. Are they the same? Explain any difference.",
        "Write a query that returns the second page (page 1) of <code>GET /api/v1/employees?sort=salary,desc&amp;size=10</code>. Check your ids against the API response.",
        "List the employees with no phone number, then the ones who have one. Check that the two counts add up to 60.",
        "Find the employees hired in 2026. Then find everyone hired <em>before</em> Ethan Nguyen's hire date (2023-04-03) who works in Engineering. Write down both counts.",
      ],
      quiz: [
        {
          q: `How many rows does <code>SELECT * FROM employees WHERE phone = NULL</code> return on the seed data?`,
          options: [`3`, `0`, `57`, `60`],
          answer: 1,
          explain: `Comparing anything with NULL using <code>=</code> gives "unknown", and <code>WHERE</code> only keeps rows where the condition is true. Use <code>phone IS NULL</code> to get the 3 employees (20, 35, 47).`,
        },
        {
          q: `Which query finds Liam O'Brien?`,
          options: [`<code>WHERE last_name = "O'Brien"</code>`, `<code>WHERE last_name = 'O'Brien'</code>`, `<code>WHERE last_name LIKE 'o''brien'</code>`, `<code>WHERE last_name = 'O''Brien'</code>`],
          answer: 3,
          explain: `Text goes in single quotes, and an apostrophe inside the text is written as two single quotes. Double quotes are for names of columns and tables. <code>LIKE</code> is case-sensitive, so the lower-case pattern does not match.`,
        },
        {
          q: `The API call <code>GET /employees?page=2&amp;size=20</code> matches which SQL?`,
          options: [`<code>ORDER BY id LIMIT 20 OFFSET 40</code>`, `<code>ORDER BY id LIMIT 20 OFFSET 20</code>`, `<code>ORDER BY id LIMIT 40 OFFSET 20</code>`, `<code>ORDER BY id LIMIT 2 OFFSET 20</code>`],
          answer: 0,
          explain: `Pages start at 0. Page 2 skips pages 0 and 1, that is 2 × 20 = 40 rows, then takes the next 20.`,
        },
        {
          q: `<code>WHERE department_id = 7 OR department_id = 8 AND salary &gt; 55000</code> returns 13 rows. Why not 8?`,
          options: [`<code>OR</code> is applied before <code>AND</code>`, `<code>salary &gt; 55000</code> includes 55000`, `<code>AND</code> is applied first, so the salary condition only limits department 8`, `Department 8 has a terminated employee`],
          answer: 2,
          explain: `<code>AND</code> binds tighter than <code>OR</code>, so this is <code>7 OR (8 AND salary &gt; 55000)</code>: all 11 Sales people plus 2 from Customer Support. Put brackets around the <code>OR</code> to get the 8 rows you meant.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "grouping",
      title: "Counting and grouping",
      summary: "Count, add up and average rows with aggregate functions, group them per department or employee, and rebuild a report by hand.",
      body: `
<p>Testers count things all the time: "Engineering has 14 active employees", "Kevin Singh has used 15 vacation days in 2026", "the department report
shows an average salary of 112357". An <strong>aggregate function</strong> turns many rows into one value.</p>

<div class="table-wrap"><table>
<thead><tr><th>Function</th><th>Returns</th><th>On all 60 employees</th></tr></thead>
<tbody>
<tr><td><code>COUNT(*)</code></td><td>the number of rows</td><td>60</td></tr>
<tr><td><code>COUNT(phone)</code></td><td>the number of rows where <code>phone</code> is <em>not</em> NULL</td><td>57</td></tr>
<tr><td><code>SUM(salary)</code></td><td>the total</td><td>5215000</td></tr>
<tr><td><code>AVG(salary)</code></td><td>the average, as a decimal</td><td>86916.666666666667</td></tr>
<tr><td><code>MIN(salary)</code> / <code>MAX(salary)</code></td><td>the smallest / largest value</td><td>40000 / 310000</td></tr>
<tr><td><code>ROUND(AVG(salary))</code></td><td>rounded to a whole number</td><td>86917</td></tr>
<tr><td><code>ROUND(AVG(salary), 2)</code></td><td>rounded to 2 decimals</td><td>86916.67</td></tr>
</tbody></table></div>
<p>The difference between <code>COUNT(*)</code> and <code>COUNT(column)</code> matters: <code>COUNT(*)</code> counts rows, <code>COUNT(column)</code>
skips NULLs. All aggregate functions except <code>COUNT(*)</code> ignore NULL values.</p>

<h3>GROUP BY: one result row per group</h3>
<p><code>GROUP BY</code> splits the rows into groups with the same value, then runs the aggregate once per group:</p>
<pre><code>SELECT status, COUNT(*) FROM employees GROUP BY status;</code></pre>
<p>gives two rows: <code>ACTIVE 59</code> and <code>TERMINATED 1</code> (Tanya Ivanova, 58). The rule: every column in the <code>SELECT</code> must
either be in the <code>GROUP BY</code> or be inside an aggregate function. Otherwise PostgreSQL does not know which value to show and says
<em>column "employees.first_name" must appear in the GROUP BY clause or be used in an aggregate function</em>.</p>

<h3>HAVING: filtering groups</h3>
<p><code>WHERE</code> filters rows <em>before</em> grouping. <code>HAVING</code> filters groups <em>after</em> grouping, so it can use aggregates.
"Departments with more than 8 active employees" needs both:</p>
<pre><code>SELECT department_id, COUNT(*) AS headcount
  FROM employees
 WHERE status = 'ACTIVE'
 GROUP BY department_id
HAVING COUNT(*) &gt; 8;</code></pre>
<p>Result: department 2 (14), 7 (11) and 8 (9).</p>

<h3>Worked example: rebuild the department report</h3>
<p><code>GET /api/v1/reports/department-stats</code> reads the view <code>v_department_stats</code>. As a tester you do not trust the view: you write
the same numbers yourself and compare. The rules (README section 6): one row per department, <strong>active</strong> employees only, average rounded,
and departments with no active employees still appear with headcount 0.</p>
<p>Because Research Lab (9) has no employees, you need a <code>LEFT JOIN</code> from departments to employees (lesson 4 explains joins; for now,
read it as "every department, with its employees if it has any"). The first example below builds it. Your query must give exactly the view's numbers:</p>
<div class="table-wrap"><table>
<thead><tr><th>Dept</th><th>Code</th><th>Headcount</th><th>Average</th><th>Min</th><th>Max</th><th>Total</th></tr></thead>
<tbody>
<tr><td>1</td><td>EXEC</td><td>1</td><td>310000</td><td>310000</td><td>310000</td><td>310000</td></tr>
<tr><td>2</td><td>ENG</td><td>14</td><td>112357</td><td>80000</td><td>172000</td><td>1573000</td></tr>
<tr><td>3</td><td>QA</td><td>8</td><td>83625</td><td>65000</td><td>128000</td><td>669000</td></tr>
<tr><td>4</td><td>PROD</td><td>5</td><td>110000</td><td>95000</td><td>136000</td><td>550000</td></tr>
<tr><td>5</td><td>HR</td><td>5</td><td>75600</td><td>57000</td><td>118000</td><td>378000</td></tr>
<tr><td>6</td><td>FIN</td><td>6</td><td>83833</td><td>62000</td><td>141000</td><td>503000</td></tr>
<tr><td>7</td><td>SALES</td><td>11</td><td>63636</td><td>45000</td><td>125000</td><td>700000</td></tr>
<tr><td>8</td><td>SUP</td><td>9</td><td>54000</td><td>40000</td><td>92000</td><td>486000</td></tr>
<tr><td>9</td><td>LAB</td><td>0</td><td>NULL</td><td>NULL</td><td>NULL</td><td>0</td></tr>
</tbody></table></div>
<p>Two traps hide in this query. First, <code>COUNT(*)</code> gives Research Lab a headcount of <strong>1</strong>, because the <code>LEFT JOIN</code>
still produces one row for it (with NULL employee columns). <code>COUNT(e.id)</code> skips that NULL and gives the correct 0. Second, if you put
<code>e.status = 'ACTIVE'</code> in <code>WHERE</code> instead of in the join condition, the NULL row of Research Lab is filtered out and the
department disappears: you get 8 rows instead of 9. <code>COALESCE(SUM(e.salary), 0)</code> turns the NULL total into 0, like the view does.</p>

<h3>Worked example: vacation days used in 2026</h3>
<p>The leave balance rules say: <code>used</code> = days of APPROVED requests of that type whose <code>start_date</code> is in the year.
The vacation query in the third example returns 10 employees. The top three are 16 Fatima Haddad (20, her whole allowance), 23 Kevin Singh (15) and
2 Daniel Okafor (10). Compare a row with <code>GET /api/v1/employees/23/leave-balance?year=2026</code>: the API says <code>used: 15</code>,
<code>remaining: 5</code>.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Using <code>COUNT(*)</code> after a <code>LEFT JOIN</code>: empty groups count as 1. Count a column of the joined table instead.</li>
<li>Putting an aggregate in <code>WHERE</code> (<code>WHERE COUNT(*) &gt; 8</code>). That is an error; use <code>HAVING</code>.</li>
<li>Forgetting a filter the report uses (here: <code>status = 'ACTIVE'</code>). Your numbers will be close, but wrong.</li>
<li>Comparing an unrounded <code>AVG</code> (86916.666...) with a rounded API value (86917) and calling it a bug.</li>
</ul></div>`,
      examples: [
        {
          title: "Rebuild v_department_stats by hand",
          lang: "sql",
          code: `
SELECT d.id                          AS department_id,
       d.code                        AS department_code,
       COUNT(e.id)                   AS headcount,
       ROUND(AVG(e.salary))          AS average_salary,
       MIN(e.salary)                 AS min_salary,
       MAX(e.salary)                 AS max_salary,
       COALESCE(SUM(e.salary), 0)    AS total_salary
  FROM departments d
  LEFT JOIN employees e
         ON e.department_id = d.id
        AND e.status = 'ACTIVE'
 GROUP BY d.id, d.code
 ORDER BY d.id;

-- Now the view itself. The numbers must be identical.
SELECT * FROM v_department_stats ORDER BY department_id;`,
          note: "Then open <code>GET /api/v1/reports/department-stats</code> in Swagger and check the same 9 rows there.",
        },
        {
          title: "COUNT(*) against COUNT(column)",
          lang: "sql",
          code: `
-- 60 rows, 57 phones, 1 termination date
SELECT COUNT(*) AS all_rows, COUNT(phone) AS with_phone, COUNT(termination_date) AS terminated
  FROM employees;

-- Research Lab: count_star = 1 (wrong), count_id = 0 (right)
SELECT d.code, COUNT(*) AS count_star, COUNT(e.id) AS count_id
  FROM departments d
  LEFT JOIN employees e ON e.department_id = d.id
 GROUP BY d.id, d.code
 ORDER BY d.id;`,
        },
        {
          title: "Vacation days used per employee in 2026",
          lang: "sql",
          code: `
SELECT employee_id, SUM(days) AS used
  FROM leave_requests
 WHERE type = 'VACATION'
   AND status = 'APPROVED'
   AND start_date BETWEEN '2026-01-01' AND '2026-12-31'
 GROUP BY employee_id
 ORDER BY used DESC, employee_id;`,
          note: "10 rows: 16 has 20, 23 has 15, 2 has 10, then five people with 5 and two with 4.",
        },
        {
          title: "HAVING, and leave requests per status",
          lang: "sql",
          code: `
-- Departments with more than 8 active employees: 2, 7, 8
SELECT department_id, COUNT(*) AS headcount
  FROM employees
 WHERE status = 'ACTIVE'
 GROUP BY department_id
HAVING COUNT(*) > 8
 ORDER BY headcount DESC;

-- Leave requests and days per status
SELECT status, COUNT(*) AS requests, SUM(days) AS total_days
  FROM leave_requests
 GROUP BY status
 ORDER BY requests DESC;`,
          note: "The second query gives APPROVED 22, PENDING 8, REJECTED 3, CANCELLED 2. Check the README's leave-request summary against it.",
        },
      ],
      exercises: [
        "Run the rebuild of <code>v_department_stats</code> and the view itself. Then call <code>GET /api/v1/reports/department-stats</code>. Compare the three for Engineering and for Research Lab, and write down any difference.",
        "Change the rebuild so that <code>e.status = 'ACTIVE'</code> is in a <code>WHERE</code> clause instead of the join condition. How many rows do you get, and which department is missing? Explain why in two sentences.",
        "Write a query that shows, per job title id, how many employees have that job and their average salary rounded to a whole number. Which job has the most people?",
        "Write a query for SICK days used per employee in 2026 (APPROVED only). Pick one employee from the result and compare with <code>GET /api/v1/employees/{id}/leave-balance?year=2026</code>.",
        "Count the leave requests per type and status (two columns in <code>GROUP BY</code>). How many PENDING VACATION requests are there?",
      ],
      quiz: [
        {
          q: `<code>SELECT COUNT(phone) FROM employees</code> returns 57, but <code>COUNT(*)</code> returns 60. Why?`,
          options: [`3 employees are terminated`, `<code>COUNT(phone)</code> counts distinct phone numbers`, `3 rows are hidden from <code>qa_reader</code>`, `<code>COUNT(column)</code> skips NULL values, and 3 employees have no phone`],
          answer: 3,
          explain: `<code>COUNT(*)</code> counts rows. <code>COUNT(column)</code> counts rows where that column is not NULL. Employees 20, 35 and 47 have a NULL phone.`,
        },
        {
          q: `Where does a condition like <code>COUNT(*) &gt; 8</code> go?`,
          options: [`In <code>WHERE</code>`, `In <code>HAVING</code>`, `In <code>ORDER BY</code>`, `In the <code>GROUP BY</code> list`],
          answer: 1,
          explain: `<code>WHERE</code> runs before grouping, so it cannot see aggregates. <code>HAVING</code> runs after grouping and filters the groups.`,
        },
        {
          q: `Your hand-written department report gives Research Lab a headcount of 1. The view says 0. What is the likely mistake?`,
          options: [`You forgot <code>ROUND</code>`, `You used <code>MIN</code> instead of <code>COUNT</code>`, `You used <code>COUNT(*)</code> after a <code>LEFT JOIN</code> instead of <code>COUNT(e.id)</code>`, `You sorted by name instead of id`],
          answer: 2,
          explain: `A <code>LEFT JOIN</code> keeps Research Lab as one row with NULL employee columns. <code>COUNT(*)</code> counts that row; <code>COUNT(e.id)</code> skips the NULL and gives 0.`,
        },
        {
          q: `Which statement about <code>SELECT department_id, first_name, COUNT(*) FROM employees GROUP BY department_id</code> is true?`,
          options: [`It fails: <code>first_name</code> is neither grouped nor inside an aggregate`, `It shows the first employee of each department`, `It returns 60 rows`, `It returns one row with the total`],
          answer: 0,
          explain: `Each department has many first names, and PostgreSQL will not guess which one to show. Group by it too, or wrap it in an aggregate such as <code>MIN(first_name)</code>.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "joins",
      title: "JOINs: combining tables",
      summary: "Put names next to ids with INNER and LEFT JOIN, join a table to itself for managers, and find rows that have no partner.",
      body: `
<p>The <code>employees</code> table stores <code>job_id = 4</code>, not "Software Engineer". To see the title you have to look it up in
<code>jobs</code>. A <strong>JOIN</strong> does that lookup for every row: it combines rows of two tables where a condition is true, usually
"this foreign key equals that id".</p>
<pre><code>SELECT e.first_name, e.last_name, j.title
  FROM employees e
  JOIN jobs j ON j.id = e.job_id;</code></pre>
<p><code>e</code> and <code>j</code> are <strong>table aliases</strong>: short names so you can write <code>e.first_name</code> instead of
<code>employees.first_name</code>. Once two tables are joined, always put the alias in front of a column. Both tables have an <code>id</code>, so
a plain <code>id</code> is ambiguous and PostgreSQL refuses it.</p>

<h3>INNER JOIN and LEFT JOIN</h3>
<ul>
<li><strong>INNER JOIN</strong> (or just <code>JOIN</code>) keeps only rows that found a partner. Rows without one disappear.</li>
<li><strong>LEFT JOIN</strong> keeps <em>every</em> row of the left table (the one in <code>FROM</code>). When there is no partner, the columns of the
right table are NULL.</li>
</ul>
<p>Worked example with departments and their managers:</p>
<div class="table-wrap"><table>
<thead><tr><th>Query</th><th>Rows</th><th>Why</th></tr></thead>
<tbody>
<tr><td><code>departments d JOIN employees e ON e.id = d.manager_id</code></td><td>8</td><td>Research Lab (9) has <code>manager_id</code> NULL, so it finds no partner and is dropped.</td></tr>
<tr><td><code>departments d LEFT JOIN employees e ON e.id = d.manager_id</code></td><td>9</td><td>Research Lab stays, with NULL as the manager's name.</td></tr>
</tbody></table></div>
<p>Ask yourself each time: "may the right side be missing?" A department may have no manager, an employee may have no manager (only the CEO), a leave
request may have no approver (pending and cancelled ones). In those cases use <code>LEFT JOIN</code>, or rows silently vanish from your check.</p>
<p>Joins can also <em>multiply</em> rows. Employees joined to leave requests gives one row per request, not per employee:
<code>employees e JOIN leave_requests lr ON lr.employee_id = e.id</code> returns 35 rows (only the 32 employees who have leave, some of them twice).
With <code>LEFT JOIN</code> you get 63 rows: the 35 requests plus one row for each of the 28 employees without any leave.</p>

<h3>Joining more than two tables</h3>
<p>Add one <code>JOIN</code> per table. Each needs its own <code>ON</code> condition:</p>
<pre><code>SELECT e.id, e.first_name, e.last_name, j.title AS job_title, d.name AS department
  FROM employees e
  JOIN jobs j        ON j.id = e.job_id
  JOIN departments d ON d.id = e.department_id;</code></pre>
<p>Inner joins are safe here, because <code>job_id</code> and <code>department_id</code> are <code>NOT NULL</code> foreign keys: every employee
has exactly one job and one department.</p>

<h3>The self-join: employee and manager</h3>
<p><code>manager_id</code> points at another row of the <em>same</em> table. To get the manager's name, join <code>employees</code> to itself under
two different aliases: <code>e</code> for the employee and <code>m</code> for the manager.</p>
<pre><code>SELECT e.first_name || ' ' || e.last_name AS employee,
       m.first_name || ' ' || m.last_name AS manager
  FROM employees e
  LEFT JOIN employees m ON m.id = e.manager_id;</code></pre>
<p><code>||</code> joins text together. Worked example: Ethan Nguyen (13) → Aisha Rahman; Zoe Leblanc (18) → Liam O'Brien; Margaret Chen (1) →
NULL. With an inner join you get 59 rows, because Margaret has no manager and drops out.</p>

<h3>The view that does it for you</h3>
<p><code>v_employee_directory</code> is exactly such a join, saved as a view: every employee with <code>full_name</code>, <code>job_title</code>,
<code>department_name</code>, <code>manager_id</code> and <code>manager_name</code>. Look at its definition in DBeaver (open the view → <em>Source</em>)
and you will see <code>JOIN jobs</code>, <code>JOIN departments</code>, <code>JOIN countries</code>, <code>JOIN regions</code> and <code>LEFT JOIN employees m</code>. It returns 60 rows, so it includes
Tanya Ivanova (58, TERMINATED) and Margaret Chen with an empty manager.</p>

<h3>Rows without a partner (anti-join)</h3>
<p>"Which employees have never asked for leave?" is a question about <em>missing</em> rows. Two ways:</p>
<ol>
<li><strong>LEFT JOIN … IS NULL</strong>: join to <code>leave_requests</code>, then keep only rows where the right side found nothing:
<code>WHERE lr.id IS NULL</code>.</li>
<li><strong>NOT EXISTS</strong>: keep an employee if no leave request with their id exists (lesson 5 explains subqueries).</li>
</ol>
<p>Both return <strong>28</strong> employees on the seed, starting with 1 Margaret Chen, 3 Sofia Rossi, 4 Arjun Patel and ending with
60 Ella Robinson. This pattern finds test data ("an employee with no leave at all") and finds problems ("leave requests whose employee is missing").</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Using an inner join where the right side may be missing, and losing the CEO, Research Lab or every pending request without noticing.</li>
<li>Forgetting the <code>ON</code> condition, or joining on the wrong columns (<code>ON m.id = e.id</code> pairs everyone with themselves).</li>
<li>Counting rows after a join that multiplies them. "35 rows" is the number of requests, not of employees.</li>
<li>Writing <code>WHERE lr.status = 'PENDING'</code> after a <code>LEFT JOIN</code> when you meant to keep employees without leave: the
<code>WHERE</code> throws away the NULL rows. Put such a condition in the <code>ON</code> clause instead.</li>
</ul></div>`,
      examples: [
        {
          title: "Two hops: employee → country → region",
          lang: "sql",
          code: `
-- Everyone who does not work in Canada, with the country and region names.
-- 25 rows: Mei Wong (11, United States, Northern America) first ... Jordan Lee (49, Australia) last.
SELECT e.id, e.first_name, c.name AS country, r.name AS region
  FROM employees e
  JOIN countries c ON c.code = e.country_code
  JOIN regions r   ON r.id = c.region_id
 WHERE c.code <> 'CA'
 ORDER BY r.id, e.id;

-- Active employees per region. LEFT JOIN twice keeps all 20 regions:
-- Northern America 43 ... and 7 regions with 0 (Southern Europe, Eastern Europe, Middle Africa, ...).
SELECT r.id, r.name AS region, COUNT(e.id) AS employees
  FROM regions r
  LEFT JOIN countries c ON c.region_id = r.id
  LEFT JOIN employees e ON e.country_code = c.code AND e.status = 'ACTIVE'
 GROUP BY r.id, r.name
 ORDER BY r.id;`,
          note: "Compare the second query with <code>SELECT * FROM v_region_stats</code> and <code>GET /api/v1/reports/region-stats</code>: the same headcounts. Try it with plain <code>JOIN</code> instead of <code>LEFT JOIN</code> and the 7 empty regions disappear.",
        },
        {
          title: "Employees with their job title and department name",
          lang: "sql",
          code: `
SELECT e.id, e.first_name, e.last_name, j.title AS job_title, d.name AS department
  FROM employees e
  JOIN jobs j        ON j.id = e.job_id
  JOIN departments d ON d.id = e.department_id
 WHERE e.id IN (1, 13, 22, 58)
 ORDER BY e.id;`,
          note: "Margaret Chen is Chief Executive Officer in Executive; Tanya Ivanova (58) is a Support Agent in Customer Support.",
        },
        {
          title: "INNER against LEFT: departments and their managers",
          lang: "sql",
          code: `
-- 8 rows: Research Lab has no manager and disappears
SELECT d.code, e.id AS manager_id, e.first_name || ' ' || e.last_name AS manager
  FROM departments d
  JOIN employees e ON e.id = d.manager_id
 ORDER BY d.id;

-- 9 rows: Research Lab stays, with NULL
SELECT d.code, e.id AS manager_id, e.first_name || ' ' || e.last_name AS manager
  FROM departments d
  LEFT JOIN employees e ON e.id = d.manager_id
 ORDER BY d.id;`,
        },
        {
          title: "Self-join for manager names, and the directory view",
          lang: "sql",
          code: `
SELECT e.id,
       e.first_name || ' ' || e.last_name AS employee,
       m.first_name || ' ' || m.last_name AS manager
  FROM employees e
  LEFT JOIN employees m ON m.id = e.manager_id
 ORDER BY e.id;

-- The same names, from the view
SELECT id, full_name, job_title, department_name, manager_id, manager_name
  FROM v_employee_directory
 ORDER BY id;`,
        },
        {
          title: "Employees with no leave requests, two ways",
          lang: "sql",
          code: `
-- LEFT JOIN ... IS NULL: 28 rows
SELECT e.id, e.first_name, e.last_name
  FROM employees e
  LEFT JOIN leave_requests lr ON lr.employee_id = e.id
 WHERE lr.id IS NULL
 ORDER BY e.id;

-- NOT EXISTS: the same 28 rows
SELECT e.id, e.first_name, e.last_name
  FROM employees e
 WHERE NOT EXISTS (SELECT 1 FROM leave_requests lr WHERE lr.employee_id = e.id)
 ORDER BY e.id;`,
        },
      ],
      exercises: [
        "List every PENDING leave request with the employee's full name, the employee's manager's full name, the type and the dates, earliest start first. You need two joins to <code>employees</code>. You should get 8 rows.",
        "List every APPROVED or REJECTED request with the approver's name. Then do the same for all 35 requests: which join do you need so that pending and cancelled requests are not lost?",
        "For each department, show its name, its manager's name and its manager's job title (three tables). Make sure Research Lab is still in the result.",
        "Find the employees whose manager works in a different department from them. Write down who they are and explain why that is normal in this company.",
        "Find the jobs that no employee has. Use either <code>LEFT JOIN … IS NULL</code> or <code>NOT EXISTS</code>, then try the other way and check both give the same answer.",
        "Write one query that lists every region with the number of <em>countries</em> it has and the number of <em>active employees</em> working there, including regions with 0 employees. Check your numbers against <code>v_region_stats</code>.",
      ],
      quiz: [
        {
          q: `<code>SELECT … FROM employees e JOIN employees m ON m.id = e.manager_id</code> returns 59 rows. Who is missing?`,
          options: [`Margaret Chen, who has no manager`, `Tanya Ivanova, who is terminated`, `Ella Robinson, the newest hire`, `Nobody: there are only 59 employees`],
          answer: 0,
          explain: `An inner join drops rows that find no partner. Margaret Chen's <code>manager_id</code> is NULL, so <code>m.id = e.manager_id</code> is never true for her. Use <code>LEFT JOIN</code> to keep her.`,
        },
        {
          q: `Which join keeps every department, even one with no manager?`,
          options: [`<code>departments d JOIN employees e ON e.id = d.manager_id</code>`, `<code>employees e JOIN departments d ON d.manager_id = e.id</code>`, `<code>departments d LEFT JOIN employees e ON e.id = d.manager_id</code>`, `<code>employees e LEFT JOIN departments d ON d.id = e.department_id</code>`],
          answer: 2,
          explain: `<code>LEFT JOIN</code> keeps every row of the table on the left. With <code>departments</code> on the left, Research Lab stays, with NULL manager columns.`,
        },
        {
          q: `<code>employees e LEFT JOIN leave_requests lr ON lr.employee_id = e.id</code> returns 63 rows. Why more than 60?`,
          options: [`Some leave requests have no employee`, `Employees with several requests appear once per request`, `The query counts the views as well`, `LEFT JOIN always adds three extra rows`],
          answer: 1,
          explain: `A join gives one row per matching pair. The 32 employees with leave give 35 rows (three of them have two requests), and the 28 without leave give one row each: 35 + 28 = 63.`,
        },
        {
          q: `What does <code>WHERE lr.id IS NULL</code> do after <code>employees e LEFT JOIN leave_requests lr ON lr.employee_id = e.id</code>?`,
          options: [`Keeps leave requests that have no id`, `Removes every employee`, `Keeps requests that are pending`, `Keeps only employees for whom no leave request was found`],
          answer: 3,
          explain: `When the left join finds no partner, every <code>lr</code> column is NULL, including <code>lr.id</code>, which is never NULL in a real row. So this keeps exactly the employees with no leave.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "subqueries",
      title: "Subqueries and CTEs",
      summary: "Use a query inside a query, give it a name with WITH, and (optionally) walk the reporting line with a recursive CTE.",
      body: `
<p>A <strong>subquery</strong> is a <code>SELECT</code> in brackets inside another statement. You use it when the answer to one question is the
input of the next: "which employees have a pending request?" needs the list of ids from <code>leave_requests</code> first.</p>

<h3>IN with a subquery</h3>
<pre><code>SELECT id, first_name, last_name
  FROM employees
 WHERE id IN (SELECT employee_id FROM leave_requests WHERE status = 'PENDING');</code></pre>
<p>The inner query returns a list of employee ids. The outer query keeps employees whose id is in that list. Worked example: 8 employees
(15, 21, 26, 31, 34, 44, 55, 59), the same 8 as the pending table in the README.</p>

<h3>A subquery that returns one value</h3>
<p>If the inner query returns exactly one value, you can compare with it: "who earns more than the company average?"</p>
<pre><code>SELECT id, first_name, salary
  FROM employees
 WHERE salary &gt; (SELECT AVG(salary) FROM employees);</code></pre>
<p>The average is 86916.67, and 24 employees earn more.</p>

<h3>EXISTS and correlated subqueries</h3>
<p><code>EXISTS (subquery)</code> is true when the subquery returns at least one row. The subquery can refer to the outer row; it is then called
<strong>correlated</strong> and runs once per outer row:</p>
<pre><code>SELECT m.id, m.first_name, m.last_name
  FROM employees m
 WHERE EXISTS (SELECT 1 FROM employees e WHERE e.manager_id = m.id);</code></pre>
<p>"Keep employee <code>m</code> if somebody has <code>m</code> as manager." Result: the 10 managers, ids 1 to 10. <code>SELECT 1</code> is a convention:
<code>EXISTS</code> only cares whether a row exists, not what is in it. <code>NOT EXISTS</code> is the opposite, and you met it in lesson 4.</p>

<h3>CTEs: naming a step with WITH</h3>
<p>A <strong>CTE</strong> (common table expression) is a named subquery written <em>before</em> the main query, with <code>WITH name AS (…)</code>.
It reads top to bottom, like steps in a test, and you can use the name like a table.</p>
<p>Worked example: "which active employees earn more than the average of their own department?"</p>
<pre><code>WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
   WHERE status = 'ACTIVE'
   GROUP BY department_id
)
SELECT e.id, e.first_name, e.last_name, e.department_id, e.salary,
       ROUND(a.avg_salary) AS department_average
  FROM employees e
  JOIN dept_avg a ON a.department_id = e.department_id
 WHERE e.status = 'ACTIVE'
   AND e.salary &gt; a.avg_salary
 ORDER BY e.department_id, e.salary DESC;</code></pre>
<p>Step 1 computes one average per department. Step 2 joins each employee to their department's average and keeps those above it. The result is
<strong>19</strong> rows. In Engineering (average 112357) they are Daniel Okafor, Aisha Rahman, Liam O'Brien, Mei Wong and Lucas Martin.
Executive does not appear: Margaret Chen <em>is</em> the average of a department of one, and "more than" is strict. Compare with the unrounded
average (as here), not the rounded one, or a salary very close to the average can land on the wrong side.</p>
<p>The same question can be written as a correlated subquery:
<code>WHERE e.salary &gt; (SELECT AVG(x.salary) FROM employees x WHERE x.department_id = e.department_id AND x.status = 'ACTIVE')</code>.
It also returns 19 rows. Pick the one you find easier to read.</p>

<h3>Optional, advanced: a recursive CTE</h3>
<p>Who is above Ethan Nguyen, all the way to the top? Ethan's manager is 9, whose manager is 2, whose manager is 1. You do not know in advance how
many steps there are. <code>WITH RECURSIVE</code> repeats a step until it finds nothing new:</p>
<ol>
<li>The <strong>anchor</strong> (before <code>UNION ALL</code>) is the starting row: Ethan, level 0.</li>
<li>The <strong>recursive part</strong> (after <code>UNION ALL</code>) joins the rows found so far to their manager, at level + 1.</li>
<li>It stops when a row has no manager: Margaret Chen.</li>
</ol>
<p>Result: 13 Ethan Nguyen (level 0) → 9 Aisha Rahman (1) → 2 Daniel Okafor (2) → 1 Margaret Chen (3). Turn the join around and you walk
<em>down</em> instead: everyone under Daniel Okafor is 1 + 4 + 9 = 14 people, which is exactly Engineering's headcount. This is how you could test
the API rule E13 (no manager loops) from the database side. You will not need recursive CTEs often; skip this part if it is too much for now.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Using <code>=</code> with a subquery that returns several rows: <em>more than one row returned by a subquery used as an expression</em>. Use <code>IN</code>.</li>
<li><code>NOT IN (subquery)</code> when the subquery can return NULL: then <code>NOT IN</code> is never true and you get 0 rows.
<code>NOT EXISTS</code> does not have this problem; prefer it.</li>
<li>Forgetting the department link inside a correlated subquery, so it compares with the company average instead.</li>
<li>A recursive CTE without a stopping point loops for ever. Following <code>manager_id</code> always stops at the CEO, because rule E13 prevents cycles.</li>
</ul></div>`,
      examples: [
        {
          title: "IN and EXISTS",
          lang: "sql",
          code: `
-- Employees with a pending leave request (8 rows)
SELECT id, first_name, last_name
  FROM employees
 WHERE id IN (SELECT employee_id FROM leave_requests WHERE status = 'PENDING')
 ORDER BY id;

-- Employees who manage at least one person (ids 1 to 10)
SELECT m.id, m.first_name, m.last_name
  FROM employees m
 WHERE EXISTS (SELECT 1 FROM employees e WHERE e.manager_id = m.id)
 ORDER BY m.id;

-- Above the company average (24 rows)
SELECT id, first_name, last_name, salary
  FROM employees
 WHERE salary > (SELECT AVG(salary) FROM employees)
 ORDER BY salary DESC;`,
        },
        {
          title: "Who earns more than their department's average? (CTE)",
          lang: "sql",
          code: `
WITH dept_avg AS (
  SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
   WHERE status = 'ACTIVE'
   GROUP BY department_id
)
SELECT e.id, e.first_name, e.last_name, e.department_id, e.salary,
       ROUND(a.avg_salary) AS department_average
  FROM employees e
  JOIN dept_avg a ON a.department_id = e.department_id
 WHERE e.status = 'ACTIVE'
   AND e.salary > a.avg_salary
 ORDER BY e.department_id, e.salary DESC;`,
          note: "19 rows. The averages match <code>v_department_stats.average_salary</code>.",
        },
        {
          title: "Optional: the reporting line from Ethan (13) up to the CEO",
          lang: "sql",
          code: `
WITH RECURSIVE chain AS (
  SELECT id, first_name, last_name, manager_id, 0 AS level
    FROM employees
   WHERE id = 13
  UNION ALL
  SELECT m.id, m.first_name, m.last_name, m.manager_id, c.level + 1
    FROM employees m
    JOIN chain c ON m.id = c.manager_id
)
SELECT * FROM chain ORDER BY level;

-- Walking down instead: everyone under Daniel Okafor (2), per level
WITH RECURSIVE team AS (
  SELECT id, manager_id, 0 AS depth FROM employees WHERE id = 2
  UNION ALL
  SELECT e.id, e.manager_id, t.depth + 1
    FROM employees e
    JOIN team t ON e.manager_id = t.id
)
SELECT depth, COUNT(*) AS people FROM team GROUP BY depth ORDER BY depth;`,
          note: "The first query gives 4 rows (13, 9, 2, 1). The second gives depth 0: 1, depth 1: 4, depth 2: 9.",
        },
      ],
      exercises: [
        "Find the employees who have at least one APPROVED SICK request, using <code>IN</code> with a subquery. Then rewrite it with <code>EXISTS</code> and check you get the same rows.",
        "Find the employees whose salary equals the maximum of their job's range (<code>jobs.max_salary</code>). Use a subquery or a join, your choice. The README names one of them.",
        "Write a CTE that first computes the number of direct reports per manager, then lists the managers with more than 4 reports, most first.",
        "Compare <code>NOT IN</code> and <code>NOT EXISTS</code>: find employees who are nobody's approver, first with <code>WHERE id NOT IN (SELECT approver_id FROM leave_requests)</code>, then with <code>NOT EXISTS</code>. Explain the difference in the row counts.",
        "Optional: change the recursive CTE to start from Zoe Leblanc (18). Write down her reporting line and its length.",
      ],
      quiz: [
        {
          q: `Which subquery belongs after <code>WHERE salary &gt;</code>?`,
          options: [`One that returns a list of salaries`, `One that returns two columns`, `One that returns exactly one value, such as <code>SELECT AVG(salary) FROM employees</code>`, `Any subquery: PostgreSQL picks the first row`],
          answer: 2,
          explain: `A comparison operator needs one value. If the subquery can return several rows, use <code>IN</code>, <code>EXISTS</code>, or an aggregate that makes it one value.`,
        },
        {
          q: `Why is <code>NOT EXISTS</code> usually safer than <code>NOT IN (subquery)</code>?`,
          options: [`If the subquery returns a NULL, <code>NOT IN</code> is never true and returns no rows`, `<code>NOT IN</code> does not work in PostgreSQL`, `<code>NOT EXISTS</code> ignores the <code>WHERE</code> clause`, `<code>NOT IN</code> only works with text`],
          answer: 0,
          explain: `<code>x NOT IN (1, 2, NULL)</code> means <code>x &lt;&gt; 1 AND x &lt;&gt; 2 AND x &lt;&gt; NULL</code>, and the last part is unknown, so the whole thing is never true. <code>leave_requests.approver_id</code> contains NULLs, so this trap is real in Ice HR.`,
        },
        {
          q: `What is a CTE?`,
          options: [`A kind of index that makes queries faster`, `A named subquery written with <code>WITH</code> before the main query`, `A stored procedure`, `A temporary table that stays until you reset`],
          answer: 1,
          explain: `<code>WITH name AS (SELECT …)</code> gives a subquery a name that the main query can use like a table. It exists only while that statement runs.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "changing-data",
      title: "Changing data safely",
      summary: "INSERT, UPDATE and DELETE as qa_writer, inside a transaction you can roll back, and how to get back to the seed.",
      body: `
<p>So far you have only read. To set up test data, or to try what the database allows, you change rows. The three statements are:</p>
<ul>
<li><code>INSERT INTO table (columns) VALUES (values)</code> adds a row.</li>
<li><code>UPDATE table SET column = value WHERE …</code> changes rows.</li>
<li><code>DELETE FROM table WHERE …</code> removes rows.</li>
</ul>
<p>Only <code>qa_writer</code> may run them. Try one as <code>qa_reader</code> and PostgreSQL answers
<em>ERROR: permission denied for table employees</em> (SQLSTATE <code>42501</code>). That is not a bug: it is the safety net that lets you read
freely with the reader connection.</p>

<h3>Transactions: your undo button</h3>
<p>A <strong>transaction</strong> is a group of statements that succeed or fail together. You start one with <code>BEGIN</code>. Until you finish it,
your changes are visible only to you. Then:</p>
<ul>
<li><code>COMMIT</code> makes them permanent and visible to everybody, including the app.</li>
<li><code>ROLLBACK</code> throws them all away, as if they never happened.</li>
</ul>
<p>So the safe way to experiment is: <code>BEGIN</code>, change, look at the result with <code>SELECT</code>, <code>ROLLBACK</code>. In DBeaver's WRITER
connection with auto-commit off, a transaction starts by itself with your first change, and the toolbar's Commit and Rollback buttons finish it.</p>
<p>If one statement inside a transaction fails, PostgreSQL marks the whole transaction as failed. Every following statement answers
<em>current transaction is aborted, commands ignored until end of transaction block</em>. Run <code>ROLLBACK</code> and start again.</p>

<h3>RETURNING: see what you changed</h3>
<p>Add <code>RETURNING</code> to an <code>INSERT</code>, <code>UPDATE</code> or <code>DELETE</code> and it returns the affected rows, like a
<code>SELECT</code>. Most useful: <code>RETURNING id</code> after an insert, so you know the new row's id without searching for it.</p>

<h3>Ids from 1001</h3>
<p>Seed rows have ids 1 to 999. Each table has its own counter (a <strong>sequence</strong>) that hands out ids from <strong>1001</strong> up. That is
how a test tells its own data from seed data: anything with an id above 1000 was created after the reset.</p>
<p>Worked example, right after a reset:</p>
<pre><code>BEGIN;
INSERT INTO departments (name, code, location) VALUES ('Training', 'TRN', 'Calgary') RETURNING id, name, manager_id;
-- id 1001, Training, manager_id NULL
SELECT COUNT(*) FROM departments;   -- 10
ROLLBACK;
SELECT COUNT(*) FROM departments;   -- 9 again</code></pre>
<p>Now run the same <code>BEGIN … INSERT … RETURNING id … ROLLBACK</code> again. The new id is <strong>1002</strong>, not 1001. A sequence never goes
back, even after a rollback, so ids can have gaps. Never write a test that expects "the next id is 1001". Read the id from <code>RETURNING</code> or
from the API's response instead. Only a reset puts the counters back to 1001.</p>

<h3>UPDATE and DELETE: WHERE first</h3>
<p>An <code>UPDATE</code> or <code>DELETE</code> without <code>WHERE</code> changes <em>every</em> row. A safe habit:</p>
<ol>
<li>Write the <code>SELECT</code> with your <code>WHERE</code> and check the rows: <code>SELECT id, salary FROM employees WHERE department_id = 3</code> (8 rows).</li>
<li>Replace the start of the statement, keep the <code>WHERE</code>: <code>UPDATE employees SET salary = salary + 1000 WHERE department_id = 3</code>.</li>
<li>Check the count DBeaver reports (<em>Updated Rows: 8</em>) matches step 1. Then decide: commit or roll back.</li>
</ol>

<h3>SQL skips the API</h3>
<p>When you change a row with SQL, the app's code does not run. Two things follow:</p>
<ul>
<li>Business rules that live only in the API (salary range, age, leave balance…) are not checked. Lesson 7 shows this.</li>
<li>Columns the app maintains are not touched. <code>updated_at</code> is set by the app on every API change; there is no database trigger for it.
<code>UPDATE employees SET phone = '416-555-0999' WHERE id = 13</code> leaves Ethan's <code>updated_at</code> at 2023-04-03. If your test data needs a
realistic <code>updated_at</code>, set it yourself.</li>
</ul>

<h3>Back to the seed</h3>
<p>If you committed something by mistake, or your data is in a mess, reset everything: <code>POST /api/v1/reset</code> (Swagger, curl or the dashboard's
Reset button) or <code>npm run reset</code> in a second terminal. Both reload the exact seed and restart the ids at 1001. <code>qa_writer</code>
cannot do this itself: it has no right to empty tables (<code>TRUNCATE</code>) or to reset sequences.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Running <code>UPDATE</code> or <code>DELETE</code> without <code>WHERE</code>, on auto-commit. There is no undo; reset.</li>
<li>Forgetting to commit, then wondering why the API does not see your new row. Uncommitted rows are invisible to other connections.</li>
<li>Forgetting to commit <em>or</em> roll back and leaving the transaction open. Your open transaction can block the app's changes to the same rows.</li>
<li>Expecting id 1001. Ids depend on what happened since the last reset, including rolled-back inserts.</li>
</ul></div>`,
      examples: [
        {
          title: "Try an INSERT and throw it away (run in the WRITER connection)",
          lang: "sql",
          code: `
BEGIN;

INSERT INTO departments (name, code, location)
VALUES ('Training', 'TRN', 'Calgary')
RETURNING id, name, code, manager_id, created_at;

SELECT COUNT(*) FROM departments;   -- 10 inside the transaction

ROLLBACK;

SELECT COUNT(*) FROM departments;   -- 9: the insert never happened`,
        },
        {
          title: "UPDATE and DELETE the safe way: SELECT first, RETURNING, then roll back",
          lang: "sql",
          code: `
BEGIN;

-- 1. Which rows will change?
SELECT id, first_name, salary FROM employees WHERE department_id = 3 ORDER BY id;

-- 2. Same WHERE, now an UPDATE (8 rows)
UPDATE employees SET salary = salary + 1000 WHERE department_id = 3
RETURNING id, salary, updated_at;

-- 3. A DELETE that shows what it removed (requests 17 and 19)
DELETE FROM leave_requests WHERE status = 'CANCELLED'
RETURNING id, employee_id, status;

ROLLBACK;`,
          note: "Look at <code>updated_at</code> in step 2: it does not change. Only the app sets it.",
        },
        {
          title: "What qa_reader may not do (run in the READER connection)",
          lang: "sql",
          code: `
-- ERROR: permission denied for table employees  (SQLSTATE 42501)
UPDATE employees SET salary = 85000 WHERE id = 13;

-- ERROR: permission denied for table departments
INSERT INTO departments (name, code, location) VALUES ('Training', 'TRN', 'Calgary');`,
          note: "If you marked the connection read-only in DBeaver, DBeaver stops you first with its own message. Untick it for a moment to see PostgreSQL's answer.",
        },
        {
          title: "Reset to the seed",
          lang: "bash",
          code: `
# From the Ice HR folder, in a second terminal (Ice HR keeps running)
npm run reset

# Or through the API (Command Prompt, PowerShell or Git Bash)
curl -X POST http://localhost:8080/api/v1/reset`,
        },
      ],
      exercises: [
        "In the WRITER connection: <code>BEGIN</code>, insert a department, read its id with <code>RETURNING</code>, roll back, and repeat. Write down both ids and explain why they differ.",
        "In the WRITER connection: start a transaction and insert a department, but do <em>not</em> commit. Call <code>GET /api/v1/departments</code> in Swagger. Is it there? Now commit and call it again. Finally delete it (or reset).",
        "Raise every QA Analyst's salary (job 6) by 5% inside a transaction, using <code>RETURNING</code> to see the new values. Which of them would now break the job's salary range (60000 to 90000)? Roll back.",
        "As <code>qa_reader</code>, try an <code>INSERT</code>, an <code>UPDATE</code> and a <code>DELETE</code>. Copy each error message and its SQLSTATE into your notes.",
        "In a transaction, make one statement fail on purpose (for example insert a department with code <code>ENG</code>, which exists), then run a <code>SELECT</code>. Copy the message you get, then roll back.",
      ],
      quiz: [
        {
          q: `You run <code>BEGIN; INSERT … RETURNING id; ROLLBACK;</code> twice right after a reset. What ids do you see?`,
          options: [`1001 both times`, `1001, then 1002`, `1000, then 1001`, `No id: a rolled-back insert returns nothing`],
          answer: 1,
          explain: `The rollback removes the row but not the id the sequence handed out. Sequences only go forward, so the second insert gets 1002. Only a reset restarts them at 1001.`,
        },
        {
          q: `You inserted a row in DBeaver's WRITER connection (auto-commit off) but the API cannot find it. Why?`,
          options: [`The API caches data for 5 minutes`, `<code>qa_writer</code> rows are hidden from the app`, `The id is below 1000`, `The transaction is not committed, so other connections cannot see the row`],
          answer: 3,
          explain: `Until you commit, changes are visible only inside your own transaction. Commit (or roll back) to finish it.`,
        },
        {
          q: `You change Ethan's phone with an SQL <code>UPDATE</code>. What happens to <code>updated_at</code>?`,
          options: [`It is set to now() by a database trigger`, `It is set to NULL`, `It stays as it was, because only the app sets it`, `The update fails because <code>updated_at</code> is required`],
          answer: 2,
          explain: `There is no trigger in the Ice HR database. The app sets <code>updated_at = now()</code> in its own UPDATE statements. SQL changes bypass that.`,
        },
        {
          q: `What is the safest order of steps for an <code>UPDATE</code> on real-looking data?`,
          options: [`<code>SELECT</code> with the <code>WHERE</code>, then <code>UPDATE</code> with the same <code>WHERE</code> in a transaction, check the count, then commit or roll back`, `<code>UPDATE</code> on auto-commit, then <code>SELECT</code> to check`, `<code>UPDATE</code> without <code>WHERE</code>, then fix the rows you did not mean to change`, `Reset first, then <code>UPDATE</code>`],
          answer: 0,
          explain: `Seeing the rows first and working inside a transaction means you can always compare the count and back out.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "constraints",
      title: "Constraints: the database's own rules",
      summary: "Primary keys, foreign keys with RESTRICT, CASCADE and SET NULL, UNIQUE and CHECK: see each one fail with its real name and SQLSTATE, and see which rules only the API checks.",
      body: `
<p>A <strong>constraint</strong> is a rule the database itself enforces on every write, whoever sends it: the app, DBeaver or your JDBC test.
If a statement would break one, PostgreSQL refuses the whole statement and reports the constraint's <strong>name</strong> and a
<strong>SQLSTATE</strong>. Ice HR names its constraints so that the name says what is wrong, for example <code>employees_phone_format</code>.</p>
<p>Run the statements in this lesson in the WRITER connection, one at a time. Each one fails, so nothing changes. When you run them inside
<code>BEGIN</code>, roll back after each error (lesson 6).</p>

<h3>The five kinds</h3>
<div class="table-wrap"><table>
<thead><tr><th>Kind</th><th>Meaning</th><th>SQLSTATE when broken</th></tr></thead>
<tbody>
<tr><td><code>NOT NULL</code></td><td>The column must have a value.</td><td><code>23502</code></td></tr>
<tr><td><code>PRIMARY KEY</code></td><td>The row's identity: unique and not null. Every Ice HR table uses <code>id</code> (constraint <code>jobs_pkey</code>, <code>employees_pkey</code>…).</td><td><code>23505</code></td></tr>
<tr><td><code>FOREIGN KEY</code></td><td>The value must be the id of an existing row in another table.</td><td><code>23503</code></td></tr>
<tr><td><code>UNIQUE</code></td><td>No two rows may have the same value.</td><td><code>23505</code></td></tr>
<tr><td><code>CHECK</code></td><td>A condition every row must satisfy.</td><td><code>23514</code></td></tr>
</tbody></table></div>
<p>All five codes start with <code>23</code>, the class "integrity constraint violation". In a Java test you assert the SQLSTATE and the
constraint name, never the full message.</p>

<h3>Foreign keys and ON DELETE</h3>
<p>A foreign key also decides what happens when you delete the row it points to. Ice HR uses all three common choices:</p>
<div class="table-wrap"><table>
<thead><tr><th>Foreign key (constraint name)</th><th>ON DELETE</th><th>Effect when you delete the referenced row</th></tr></thead>
<tbody>
<tr><td><code>employees.department_id</code> (<code>employees_department_id_fkey</code>)</td><td>RESTRICT</td><td>Refused while the department has employees.</td></tr>
<tr><td><code>employees.country_code</code> (<code>employees_country_fk</code>)</td><td>RESTRICT</td><td>A country someone works in cannot be deleted. (You cannot try it: <code>regions</code> and <code>countries</code> are read-only even for <code>qa_writer</code>. Setting <code>country_code = 'XX'</code> on an employee fails with the same constraint name.)</td></tr>
<tr><td><code>employees.manager_id</code> (<code>employees_manager_id_fkey</code>)</td><td>RESTRICT</td><td>Refused while someone has this employee as manager.</td></tr>
<tr><td><code>employees.job_id</code> (<code>employees_job_id_fkey</code>)</td><td>(default)</td><td>Refused while someone has this job.</td></tr>
<tr><td><code>leave_requests.employee_id</code> (<code>leave_requests_employee_id_fkey</code>)</td><td>CASCADE</td><td>The employee's leave requests are deleted too.</td></tr>
<tr><td><code>leave_requests.approver_id</code> (<code>leave_requests_approver_id_fkey</code>)</td><td>SET NULL</td><td>Requests they decided keep their row, with <code>approver_id</code> NULL.</td></tr>
<tr><td><code>departments.manager_id</code> (<code>departments_manager_fk</code>)</td><td>SET NULL</td><td>The department keeps its row, with <code>manager_id</code> NULL.</td></tr>
</tbody></table></div>
<p>Worked example: <code>DELETE FROM departments WHERE id = 2</code> fails with</p>
<pre><code>ERROR: update or delete on table "departments" violates foreign key constraint
       "employees_department_id_fkey" on table "employees"
DETAIL: Key (id)=(2) is still referenced from table "employees".   SQLSTATE 23503</code></pre>
<p>The API checks the same thing first and answers 409 <code>DEPARTMENT_HAS_EMPLOYEES</code>. The database is the second line of defence.</p>
<p>CASCADE, inside a transaction: Fatima Haddad (16) has 2 leave requests (7 and 8). <code>DELETE FROM employees WHERE id = 16</code> works, and
afterwards <code>SELECT COUNT(*) FROM leave_requests WHERE employee_id = 16</code> is 0. Roll back and the 2 rows are back.</p>
<p>SET NULL needs a little preparation, because Sofia Rossi (3) manages 7 people and RESTRICT stops you deleting her. Inside a transaction, move her
reports to Margaret first (<code>UPDATE employees SET manager_id = 1 WHERE manager_id = 3</code>, 7 rows), then delete her. Now department 3 (QA)
has <code>manager_id</code> NULL, and the requests she approved (2, 9, 10, 11 and 12) have <code>approver_id</code> NULL. Roll back.</p>

<h3>UNIQUE</h3>
<ul>
<li><code>employees_email_unique</code>: two employees cannot share an email. Setting Olivia's (14) email to <code>ethan.nguyen@icehr.test</code> gives
<em>duplicate key value violates unique constraint "employees_email_unique"</em>, <code>Key (email)=(ethan.nguyen@icehr.test) already exists.</code></li>
<li><code>jobs_title_unique</code> and <code>departments_code_unique</code>: no two jobs with one title, no two departments with one code.</li>
<li><code>departments_name_unique</code> is a unique <em>index</em> on <code>lower(name)</code>, so names are unique ignoring case. A department called
<code>ENGINEERING</code> fails with <code>Key (lower(name::text))=(engineering) already exists.</code></li>
</ul>

<h3>CHECK</h3>
<div class="table-wrap"><table>
<thead><tr><th>Constraint</th><th>Rule</th><th>Fails for</th></tr></thead>
<tbody>
<tr><td><code>employees_phone_format</code></td><td><code>phone IS NULL OR phone ~ '^\\d{3}-\\d{3}-\\d{4}$'</code></td><td><code>'4165550114'</code></td></tr>
<tr><td><code>employees_email_lowercase</code></td><td><code>email = lower(email)</code></td><td><code>'Olivia.Brown@icehr.test'</code></td></tr>
<tr><td><code>employees_status_valid</code></td><td>status is <code>ACTIVE</code> or <code>TERMINATED</code></td><td><code>'RETIRED'</code></td></tr>
<tr><td><code>employees_gender_valid</code></td><td>gender is <code>MALE</code> or <code>FEMALE</code> (and <code>NOT NULL</code>)</td><td><code>'OTHER'</code>, <code>'male'</code></td></tr>
<tr><td><code>employees_termination_date_matches_status</code></td><td>TERMINATED exactly when <code>termination_date</code> is set</td><td>status TERMINATED with no date, or a date on an ACTIVE row</td></tr>
<tr><td><code>employees_not_own_manager</code></td><td><code>manager_id &lt;&gt; id</code></td><td>Olivia as her own manager</td></tr>
<tr><td><code>employees_hired_after_birth</code></td><td><code>hire_date &gt; date_of_birth</code></td><td>hired in 1990, born in 1994</td></tr>
<tr><td><code>employees_salary_positive</code></td><td><code>salary &gt; 0</code></td><td>0</td></tr>
<tr><td><code>leave_dates_in_order</code></td><td><code>end_date &gt;= start_date</code></td><td>end before start</td></tr>
<tr><td><code>leave_days_positive</code>, <code>leave_type_valid</code>, <code>leave_status_valid</code></td><td><code>days &gt; 0</code>; type and status from the fixed lists</td><td><code>0</code>, <code>'HOLIDAY'</code>, <code>'DONE'</code></td></tr>
<tr><td><code>departments_code_format</code>, <code>jobs_salary_range_valid</code>, <code>jobs_min_salary_positive</code></td><td>2 to 5 capital letters; <code>max_salary &gt;= min_salary</code>; <code>min_salary &gt; 0</code></td><td><code>'ENG2'</code>; 40000 to 30000</td></tr>
</tbody></table></div>
<p>A CHECK error looks like <em>new row for relation "employees" violates check constraint "employees_phone_format"</em>, SQLSTATE <code>23514</code>,
with a DETAIL that prints the whole failing row. Notice the email pair: the unique constraint compares exact text, but the lower-case check makes
sure every stored email is already lower case, so together they make emails unique ignoring case.</p>

<h3>Rules that live only in the API</h3>
<p>Many rules in README section 5 are <strong>not</strong> in the database: the salary range of the job (E16), at least 18 on the hire date (E14),
hire date not in the future (E15), an active manager and no manager loops (E12, E13), the leave balance (L13), overlapping leave (L12), who may approve
(A7), leave not in the same calendar year (L6), and even <code>days</code> being the number of weekdays (the database only checks <code>days &gt; 0</code>).</p>
<p>Worked example: as <code>qa_writer</code>, insert a Software Engineer with salary 30000. The database accepts it (the job's range is 80000 to
115000). <code>GET /api/v1/employees/{id}</code> happily returns the row. Then a harmless <code>PATCH</code> of just the phone answers
422 <code>SALARY_OUT_OF_RANGE</code>, <em>Salary 30000 is outside the range for Software Engineer (80000 to 115000).</em>, because a PATCH re-checks the
whole employee. Bad data that got in through a side door now blocks normal use. Delete the row afterwards.</p>
<p>Which layer should own a rule? A useful way to think about it:</p>
<ul>
<li><strong>Database:</strong> facts that must never be false, whoever writes: identity, references, formats, simple conditions on one row.
They protect the data from every client, including scripts and migrations.</li>
<li><strong>API:</strong> rules that depend on "today", on other rows, on configuration, or that need a friendly error code. They are easier to change,
but only protect requests that go through the API.</li>
<li><strong>Both:</strong> the API checks first to give a clear 409 or 422 (for example <code>EMAIL_TAKEN</code>), and the constraint is the safety net.
If you ever get a 500 from the API, ask whether it hit a constraint the API forgot to check first.</li>
</ul>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Asserting the full error message. It contains the failing row and can change; assert the SQLSTATE and the constraint name.</li>
<li>Thinking "the database accepted it, so it is valid". It only checked its own constraints, not the business rules.</li>
<li>Forgetting that CASCADE deletes more than you asked for. Deleting one employee also deletes all their leave requests.</li>
<li>Expecting <code>departments_name_unique</code> in <code>pg_constraint</code> or the Constraints tab. It is a unique <em>index</em>, so DBeaver lists it under Indexes.</li>
</ul></div>`,
      examples: [
        {
          title: "Break UNIQUE, CHECK and NOT NULL (WRITER connection, one statement at a time)",
          lang: "sql",
          code: `
-- 23505 employees_email_unique
UPDATE employees SET email = 'ethan.nguyen@icehr.test' WHERE id = 14;

-- 23505 departments_name_unique (case-insensitive name)
INSERT INTO departments (name, code, location) VALUES ('ENGINEERING', 'ENGX', 'Toronto');

-- 23505 jobs_pkey (id 1 exists)
INSERT INTO jobs (id, title, min_salary, max_salary) VALUES (1, 'Intern', 30000, 40000);

-- 23514 employees_phone_format
UPDATE employees SET phone = '4165550114' WHERE id = 14;

-- 23514 employees_email_lowercase
UPDATE employees SET email = 'Olivia.Brown@icehr.test' WHERE id = 14;

-- 23514 employees_termination_date_matches_status
UPDATE employees SET status = 'TERMINATED' WHERE id = 14;

-- 23514 leave_dates_in_order
UPDATE leave_requests SET end_date = '2026-01-01' WHERE id = 6;

-- 23502 not-null: null value in column "first_name"
UPDATE employees SET first_name = NULL WHERE id = 14;`,
        },
        {
          title: "Foreign keys: RESTRICT, CASCADE and SET NULL (inside a transaction)",
          lang: "sql",
          code: `
-- RESTRICT: 23503 employees_department_id_fkey
DELETE FROM departments WHERE id = 2;

-- RESTRICT: 23503 employees_manager_id_fkey (Aisha manages 13 to 17)
DELETE FROM employees WHERE id = 9;

-- CASCADE: Fatima's 2 leave requests go with her
BEGIN;
SELECT COUNT(*) AS before FROM leave_requests WHERE employee_id = 16;   -- 2
DELETE FROM employees WHERE id = 16;
SELECT COUNT(*) AS after FROM leave_requests WHERE employee_id = 16;    -- 0
ROLLBACK;

-- SET NULL: department 3 and Sofia's approvals lose their link to her
BEGIN;
UPDATE employees SET manager_id = 1 WHERE manager_id = 3;   -- 7 rows
DELETE FROM employees WHERE id = 3;
SELECT id, code, manager_id FROM departments WHERE id = 3;                     -- manager_id NULL
SELECT id, status, approver_id FROM leave_requests WHERE id IN (2, 9, 10, 11, 12);   -- approver_id NULL
ROLLBACK;`,
        },
        {
          title: "A row the API would never accept (WRITER connection, auto-commit off)",
          lang: "sql",
          code: `
-- The database accepts a Software Engineer at 30000. The API's range is 80000 to 115000.
INSERT INTO employees (first_name, last_name, gender, email, date_of_birth, hire_date,
                       job_id, department_id, manager_id, salary, country_code)
VALUES ('Sql', 'Lowpay', 'FEMALE', 'sql.lowpay@icehr.test', '1995-06-15', '2026-11-02', 4, 2, 9, 30000, 'CA')
RETURNING id;
COMMIT;

-- Now in Swagger: GET /api/v1/employees/{id} works,
-- PATCH /api/v1/employees/{id} with {"phone": "416-555-0100"} gives 422 SALARY_OUT_OF_RANGE.

-- Clean up
DELETE FROM employees WHERE email = 'sql.lowpay@icehr.test';
COMMIT;`,
        },
        {
          title: "Assert a constraint in Java (ConstraintTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.db.Db;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

/** The database's own rules. Every statement here fails, so no data changes. */
@Tag("db")
class ConstraintTest {

    private final Db writer = Db.writer();

    /** Db wraps the SQLException; the original one, with the SQLSTATE, is the cause. */
    private static String sqlState(Throwable thrown) {
        return ((SQLException) thrown.getCause()).getSQLState();
    }

    @Test
    void two_employees_cannot_share_an_email() {
        Throwable thrown = catchThrowable(() ->
                writer.update("UPDATE employees SET email = ? WHERE id = ?", "ethan.nguyen@icehr.test", 14));

        assertThat(thrown).hasMessageContaining("employees_email_unique");
        assertThat(sqlState(thrown)).isEqualTo("23505");
    }

    @Test
    void a_phone_without_dashes_is_rejected() {
        Throwable thrown = catchThrowable(() ->
                writer.update("UPDATE employees SET phone = ? WHERE id = ?", "4165550114", 14));

        assertThat(thrown).hasMessageContaining("employees_phone_format");
        assertThat(sqlState(thrown)).isEqualTo("23514");
    }

    @Test
    void a_department_with_employees_cannot_be_deleted() {
        Throwable thrown = catchThrowable(() -> writer.update("DELETE FROM departments WHERE id = ?", 2));

        assertThat(thrown).hasMessageContaining("employees_department_id_fkey");
        assertThat(sqlState(thrown)).isEqualTo("23503");
        assertThat(Db.reader().scalar(Long.class, "SELECT COUNT(*) FROM departments WHERE id = ?", 2)).isEqualTo(1L);
    }
}`,
          note: "Run it with <code>mvn test -Dtest=ConstraintTest</code>. <code>catchThrowable</code> runs the code and returns the exception it threw (or null), so you can look at it in several assertions.",
        },
      ],
      exercises: [
        "Run every statement of the first example one by one. For each, write down the constraint name and the SQLSTATE. Then find the constraint in DBeaver (table → Constraints tab, or Indexes for <code>departments_name_unique</code>).",
        "Run the SET NULL example. Before you roll back, also check <code>v_department_stats</code> and <code>v_employee_directory</code> for QA: what do they show for the manager now?",
        "Find two more CHECK constraints from the table above that you have not broken yet, write a statement that breaks each one, and record the result.",
        "Pick three rules from README section 5 that live only in the API. For each, write an SQL statement that breaks it and that the database accepts. Run them inside a transaction and roll back.",
        "Add a test to <code>ConstraintTest</code> that tries to delete Aisha Rahman (9) and asserts <code>employees_manager_id_fkey</code> and <code>23503</code>. Run it and make it pass.",
      ],
      quiz: [
        {
          q: `You delete employee 16. What happens to her leave requests 7 and 8?`,
          options: [`The delete is refused while she has leave`, `Their <code>employee_id</code> becomes NULL`, `Nothing; they keep pointing at 16`, `They are deleted too, because of ON DELETE CASCADE`],
          answer: 3,
          explain: `<code>leave_requests.employee_id</code> is declared <code>ON DELETE CASCADE</code>. Deleting an employee deletes their requests in the same statement. The API's DELETE relies on exactly this.`,
        },
        {
          q: `What SQLSTATE does <code>UPDATE employees SET phone = '4165550114' WHERE id = 14</code> give?`,
          options: [`<code>23514</code>, a CHECK violation (<code>employees_phone_format</code>)`, `<code>23505</code>, a unique violation`, `<code>23503</code>, a foreign key violation`, `<code>42501</code>, permission denied`],
          answer: 0,
          explain: `The phone must be NULL or match <code>###-###-####</code>. That is a CHECK constraint, and all CHECK violations are SQLSTATE 23514.`,
        },
        {
          q: `As <code>qa_writer</code> you insert a Software Engineer with salary 30000. What happens?`,
          options: [`23514: the salary is outside the job range`, `23503: the job does not allow it`, `The insert succeeds, because the salary range is checked only by the API`, `The API rolls it back within a minute`],
          answer: 2,
          explain: `The database only checks <code>salary &gt; 0</code>. The job's range (rule E16) lives in the API, so direct SQL can store data the API would reject with 422 <code>SALARY_OUT_OF_RANGE</code>.`,
        },
        {
          q: `Why can't two departments be called "Finance" and "FINANCE"?`,
          options: [`The API converts names to upper case`, `A unique index on <code>lower(name)</code> (<code>departments_name_unique</code>)`, `A CHECK constraint forbids capital letters`, `The code column must match the name`],
          answer: 1,
          explain: `<code>CREATE UNIQUE INDEX departments_name_unique ON departments (lower(name))</code> compares the lower-case names, so both become "finance" and the second one is a duplicate (23505).`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "jdbc",
      title: "JDBC basics in Java",
      summary: "Open a connection, run a query with ? placeholders, read the ResultSet, and close everything with try-with-resources.",
      body: `
<p><strong>JDBC</strong> (Java Database Connectivity) is the standard Java API for talking to a database. It lives in <code>java.sql</code>, so it
is part of the JDK. What the JDK does not have is the code that speaks PostgreSQL's network protocol: the <strong>driver</strong>. The starter's
<code>pom.xml</code> already includes it:</p>
<pre><code>&lt;dependency&gt;
    &lt;groupId&gt;org.postgresql&lt;/groupId&gt;
    &lt;artifactId&gt;postgresql&lt;/artifactId&gt;
    &lt;version&gt;\${postgresql.version}&lt;/version&gt;
    &lt;scope&gt;test&lt;/scope&gt;
&lt;/dependency&gt;</code></pre>
<p>The version (42.7.14) is set once, in the <code>&lt;properties&gt;</code> block at the top of the pom. Scope <code>test</code> means it is only on the classpath when tests run, which is all this project does.</p>

<h3>The five classes</h3>
<div class="table-wrap"><table>
<thead><tr><th>Class</th><th>What it is</th><th>How you get one</th></tr></thead>
<tbody>
<tr><td><code>DriverManager</code></td><td>Finds the driver for a URL and opens connections.</td><td>Static methods; you never create it.</td></tr>
<tr><td><code>Connection</code></td><td>One open session with the database, as one user.</td><td><code>DriverManager.getConnection(url, user, password)</code></td></tr>
<tr><td><code>PreparedStatement</code></td><td>An SQL statement with <code>?</code> placeholders for values.</td><td><code>connection.prepareStatement(sql)</code></td></tr>
<tr><td><code>ResultSet</code></td><td>The rows a query returned, read one row at a time.</td><td><code>statement.executeQuery()</code></td></tr>
<tr><td><code>SQLException</code></td><td>Anything that went wrong; <code>getSQLState()</code> gives the code.</td><td>Thrown by all of the above.</td></tr>
</tbody></table></div>

<h3>Where the URL and user come from</h3>
<p>Never hard-code them in a test. The starter's <code>Config</code> class reads <code>src/test/resources/config/local.properties</code>:
<code>Config.jdbcUrl()</code> gives <code>jdbc:postgresql://localhost:5434/icehr</code>, <code>Config.dbUser()</code> and
<code>Config.dbPassword()</code> give <code>qa_reader</code>, and <code>Config.dbWriterUser()</code> / <code>Config.dbWriterPassword()</code> give
<code>qa_writer</code>. Any key can be overridden on the command line, for example <code>mvn test -DjdbcUrl=jdbc:postgresql://localhost:5435/icehr</code>.</p>

<h3>Step by step</h3>
<ol>
<li><strong>Connect:</strong> <code>Connection con = DriverManager.getConnection(Config.jdbcUrl(), Config.dbUser(), Config.dbPassword());</code></li>
<li><strong>Prepare</strong> the SQL with a <code>?</code> for each value: <code>con.prepareStatement("SELECT … WHERE last_name = ?")</code>.</li>
<li><strong>Bind</strong> the values. Placeholders are numbered from <strong>1</strong>: <code>ps.setString(1, "O'Brien")</code>. Also <code>setInt</code>,
<code>setLong</code>, and <code>setObject</code>, which accepts a <code>LocalDate</code> for a date column.</li>
<li><strong>Execute:</strong> <code>executeQuery()</code> for a <code>SELECT</code> (returns a <code>ResultSet</code>), <code>executeUpdate()</code> for
<code>INSERT</code>/<code>UPDATE</code>/<code>DELETE</code> (returns how many rows changed).</li>
<li><strong>Read</strong> the rows. A <code>ResultSet</code> starts <em>before</em> the first row. <code>rs.next()</code> moves to the next row and returns
<code>false</code> when there are no more. Typical loop: <code>while (rs.next()) { … }</code>.</li>
<li><strong>Close</strong> the result set, statement and connection. Open connections are limited (Ice HR's server allows 60), so a test that forgets to
close them eventually breaks every other test.</li>
</ol>

<h3>Reading columns</h3>
<p>You read a column of the current row by name (or by position, starting at 1):</p>
<ul>
<li><code>rs.getInt("salary")</code>, <code>rs.getLong(…)</code>, <code>rs.getString("email")</code>, <code>rs.getBoolean(…)</code>.</li>
<li><code>rs.getObject("hire_date", LocalDate.class)</code> for a <code>date</code> column, and <code>rs.getObject("created_at", OffsetDateTime.class)</code>
for a <code>timestamptz</code>.</li>
<li><strong>NULL trap:</strong> <code>getInt</code> returns <code>0</code> for NULL, because an <code>int</code> cannot be null. Margaret Chen's
<code>getInt("manager_id")</code> is 0, which looks like a real id. Use <code>rs.getObject("manager_id", Integer.class)</code> (gives <code>null</code>) or
call <code>rs.wasNull()</code> right after <code>getInt</code>. <code>getString</code> simply returns <code>null</code>, as for Hannah Schmidt's phone.</li>
</ul>

<h3>try-with-resources</h3>
<p>Everything you open goes in the brackets of a <code>try ( … )</code>. Java closes it at the end of the block, in reverse order, even when an
assertion fails or an exception is thrown:</p>
<pre><code>try (Connection con = DriverManager.getConnection(url, user, password);
     PreparedStatement ps = con.prepareStatement(sql)) {
    ps.setInt(1, 13);
    try (ResultSet rs = ps.executeQuery()) {
        …
    }
}</code></pre>

<h3>Why never string concatenation</h3>
<p>It is tempting to build SQL by gluing text together: <code>"… WHERE last_name = '" + lastName + "'"</code>. Two things go wrong:</p>
<ol>
<li><strong>Quoting bugs.</strong> With <code>lastName = "O'Brien"</code> the SQL becomes <code>… = 'O'Brien'</code>. The driver refuses it with a syntax
error (SQLSTATE <code>42601</code>, <em>Unterminated string literal</em>). Your test fails for a reason that has nothing to do with the app.</li>
<li><strong>SQL injection.</strong> With <code>lastName = "x' OR '1'='1"</code> the SQL becomes <code>… = 'x' OR '1'='1'</code>, which is true for every
row: a count returns <strong>60</strong> instead of 0. The input rewrote your query. In an application this is one of the most common security holes,
and testers look for it.</li>
</ol>
<p>With <code>?</code> the value is sent separately from the SQL text, so it can never change the query, and you never quote anything yourself.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Reading a column before calling <code>rs.next()</code>: <em>ResultSet not positioned properly, perhaps you need to call next.</em></li>
<li>Numbering placeholders from 0. The first <code>?</code> is 1.</li>
<li>Calling <code>executeQuery()</code> for an <code>UPDATE</code>, or <code>executeUpdate()</code> for a <code>SELECT</code>.</li>
<li>Using <code>getInt</code> on a nullable column and treating 0 as a real value.</li>
<li>Opening a connection without try-with-resources.</li>
<li>Quotes around a placeholder: <code>WHERE last_name = '?'</code> searches for a literal question mark.</li>
</ul></div>`,
      examples: [
        {
          title: "Plain JDBC tests (JdbcBasicsTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.config.Config;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** JDBC with no helper: Connection, PreparedStatement, ResultSet. */
@Tag("db")
class JdbcBasicsTest {

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(Config.jdbcUrl(), Config.dbUser(), Config.dbPassword());
    }

    @Test
    void liam_obrien_is_found_with_a_placeholder() throws SQLException {
        String sql = "SELECT id, first_name, email, salary, hire_date FROM employees WHERE last_name = ?";
        try (Connection con = connect();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, "O'Brien");                    // no quoting needed
            try (ResultSet rs = ps.executeQuery()) {
                assertThat(rs.next()).as("a first row").isTrue();
                assertThat(rs.getInt("id")).isEqualTo(10);
                assertThat(rs.getString("first_name")).isEqualTo("Liam");
                assertThat(rs.getString("email")).isEqualTo("liam.obrien@icehr.test");
                assertThat(rs.getInt("salary")).isEqualTo(142000);
                assertThat(rs.getObject("hire_date", LocalDate.class)).isEqualTo(LocalDate.of(2017, 2, 6));
                assertThat(rs.next()).as("a second row").isFalse();
            }
        }
    }

    @Test
    void null_columns_need_care() throws SQLException {
        String sql = "SELECT phone, manager_id FROM employees WHERE id = ?";
        try (Connection con = connect();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, 1);                                // Margaret Chen: a phone, but no manager
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                assertThat(rs.getString("phone")).isEqualTo("416-555-0101");
                assertThat(rs.getInt("manager_id")).isEqualTo(0);      // NULL read as int: 0!
                assertThat(rs.wasNull()).isTrue();                    // ...so ask
                assertThat(rs.getObject("manager_id", Integer.class)).isNull();   // better
            }
        }
    }

    @Test
    void engineering_salaries_best_paid_first() throws SQLException {
        String sql = "SELECT salary FROM employees WHERE department_id = ? ORDER BY salary DESC, id";
        List<Integer> salaries = new ArrayList<>();
        try (Connection con = connect();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, 2);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    salaries.add(rs.getInt("salary"));
                }
            }
        }
        assertThat(salaries).hasSize(14);
        assertThat(salaries.get(0)).isEqualTo(172000);       // Daniel Okafor
        assertThat(salaries.get(13)).isEqualTo(80000);       // Ethan Nguyen
        assertThat(salaries).isSortedAccordingTo((a, b) -> b - a);
    }
}`,
          note: "Seed data only, so it passes after a reset. Run it with <code>mvn test -Dtest=JdbcBasicsTest</code>.",
        },
        {
          title: "Why never concatenate (SqlInjectionTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.config.Config;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

/** What goes wrong when SQL is glued together from strings. Read-only: safe to run. */
@Tag("db")
class SqlInjectionTest {

    private long count(String sql) throws SQLException {
        try (Connection con = DriverManager.getConnection(Config.jdbcUrl(), Config.dbUser(), Config.dbPassword());
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            rs.next();
            return rs.getLong(1);
        }
    }

    @Test
    void an_apostrophe_breaks_a_concatenated_query() {
        String lastName = "O'Brien";
        String sql = "SELECT COUNT(*) FROM employees WHERE last_name = '" + lastName + "'";   // DON'T

        Throwable thrown = catchThrowable(() -> count(sql));

        assertThat(thrown).isInstanceOf(SQLException.class);
        assertThat(((SQLException) thrown).getSQLState()).isEqualTo("42601");   // syntax error
    }

    @Test
    void input_can_rewrite_a_concatenated_query() throws SQLException {
        String lastName = "x' OR '1'='1";
        String sql = "SELECT COUNT(*) FROM employees WHERE last_name = '" + lastName + "'";   // DON'T

        assertThat(count(sql)).isEqualTo(60);   // every row matched!
    }

    @Test
    void a_placeholder_treats_the_same_input_as_plain_text() throws SQLException {
        String sql = "SELECT COUNT(*) FROM employees WHERE last_name = ?";
        try (Connection con = DriverManager.getConnection(Config.jdbcUrl(), Config.dbUser(), Config.dbPassword());
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, "x' OR '1'='1");
            try (ResultSet rs = ps.executeQuery()) {
                rs.next();
                assertThat(rs.getLong(1)).isEqualTo(0);   // nobody is called that
            }
        }
    }
}`,
        },
        {
          title: "Connection settings the tests read (src/test/resources/config/local.properties)",
          lang: "properties",
          code: `
baseUrl=http://localhost:8080

jdbcUrl=jdbc:postgresql://localhost:5434/icehr
dbUser=qa_reader
dbPassword=qa_reader
dbWriterUser=qa_writer
dbWriterPassword=qa_writer

# Override without editing, e.g. (PowerShell: quote it)
#   mvn test "-DjdbcUrl=jdbc:postgresql://localhost:5435/icehr"`,
        },
      ],
      exercises: [
        "Copy <code>JdbcBasicsTest</code> into <code>starter/src/test/java/com/icehr/tests/</code> and run it. Then break it on purpose: change the expected salary of Liam to 142001 and read the failure message.",
        "Add a test that reads Ethan Nguyen (13) and asserts his <code>date_of_birth</code> as a <code>LocalDate</code> and his <code>created_at</code> as an <code>OffsetDateTime</code>. Hint: compare instants, as the next lesson shows.",
        "Write a test that counts the employees hired in 2025 with two placeholders (<code>hire_date BETWEEN ? AND ?</code>), binding <code>LocalDate</code> values with <code>setObject</code>.",
        "Run <code>SqlInjectionTest</code>. Then write down, in your own words, why the second test returns 60 and the third returns 0.",
        "Make a test fail with a connection problem: run it with <code>-DjdbcUrl=jdbc:postgresql://localhost:5499/icehr</code>. Copy the exception message and SQLSTATE and compare with lesson 1's table.",
      ],
      quiz: [
        {
          q: `Which line binds the first placeholder of <code>WHERE last_name = ? AND department_id = ?</code>?`,
          options: [`<code>ps.setString(1, "O'Brien")</code>`, `<code>ps.setString(0, "O'Brien")</code>`, `<code>ps.setString("last_name", "O'Brien")</code>`, `<code>ps.setString(1, "'O''Brien'")</code>`],
          answer: 0,
          explain: `Placeholders are numbered from 1, in the order they appear. You pass the plain value: no quotes and no doubling of apostrophes.`,
        },
        {
          q: `<code>rs.getInt("manager_id")</code> returns 0 for Margaret Chen. What does that mean?`,
          options: [`Her manager is employee 0`, `The query failed`, `The column is NULL, and <code>getInt</code> turns NULL into 0`, `The ResultSet is closed`],
          answer: 2,
          explain: `A Java <code>int</code> cannot be null, so <code>getInt</code> returns 0. Use <code>getObject("manager_id", Integer.class)</code> to get <code>null</code>, or check <code>rs.wasNull()</code>.`,
        },
        {
          q: `Why is <code>"… WHERE last_name = '" + input + "'"</code> dangerous?`,
          options: [`It is slower than a placeholder`, `PostgreSQL does not support quotes`, `It only works with qa_writer`, `The input becomes part of the SQL, so it can break the query or change what it does`],
          answer: 3,
          explain: `An apostrophe in the input ends the text early (a syntax error), and crafted input such as <code>x' OR '1'='1</code> rewrites the condition. That is SQL injection. Placeholders send the value separately.`,
        },
        {
          q: `What does try-with-resources do for a <code>Connection</code>?`,
          options: [`Retries the connection if it fails`, `Closes it at the end of the block, even when an assertion fails`, `Commits the transaction`, `Opens it as qa_reader`],
          answer: 1,
          explain: `Anything declared in <code>try ( … )</code> is closed automatically, in reverse order, however the block ends. That keeps your tests from leaking connections.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "db-helper",
      title: "A reusable DB helper: the starter's Db class",
      summary: "Use Db.reader() and Db.writer() with queryList, queryOne, scalar and update; know the Java type of every column; assert rows with AssertJ.",
      body: `
<p>The JDBC code in the last lesson works, but it is long. Ten lines of opening and closing for one value, repeated in every test, hides what the
test checks. The starter project wraps it in one small class: <code>com.icehr.db.Db</code> (<code>starter/src/test/java/com/icehr/db/Db.java</code>).
Open it: it is about 100 lines and uses exactly what you just learned.</p>

<h3>Two users, two factories</h3>
<ul>
<li><code>Db.reader()</code> connects as <code>qa_reader</code>. Use it for every check.</li>
<li><code>Db.writer()</code> connects as <code>qa_writer</code>. Use it only to set up or clean up data.</li>
</ul>
<p>Both read the URL and passwords from <code>Config</code>. Each method call opens its own connection, runs one statement and closes it again,
with auto-commit on. So every <code>update</code> through <code>Db.writer()</code> is committed at once and the app can see it.</p>

<h3>The four methods</h3>
<div class="table-wrap"><table>
<thead><tr><th>Method</th><th>Returns</th><th>Use it for</th></tr></thead>
<tbody>
<tr><td><code>queryList(sql, params...)</code></td><td><code>List&lt;Map&lt;String, Object&gt;&gt;</code>: one map per row</td><td>Several rows</td></tr>
<tr><td><code>queryOne(sql, params...)</code></td><td><code>Map&lt;String, Object&gt;</code></td><td>Exactly one row. Fails the test with <em>Expected exactly 1 row but got 0</em> (or 2…) otherwise.</td></tr>
<tr><td><code>scalar(Type.class, sql, params...)</code></td><td>One value of that type, or <code>null</code></td><td>A <code>COUNT(*)</code>, an id, one column of one row</td></tr>
<tr><td><code>update(sql, params...)</code></td><td><code>int</code>: rows changed</td><td><code>INSERT</code>, <code>UPDATE</code>, <code>DELETE</code> (with <code>Db.writer()</code>)</td></tr>
</tbody></table></div>
<p><code>params</code> fill the <code>?</code> placeholders in order: <code>db.queryOne("SELECT … WHERE id = ?", 13)</code>. Every method uses a
<code>PreparedStatement</code> inside, so apostrophes and injection are handled.</p>
<p>When something goes wrong, the helper throws an <code>IllegalStateException</code> whose message is <em>SQL failed: &lt;your sql&gt; -&gt; &lt;database
message&gt;</em>. The original <code>SQLException</code>, with its SQLSTATE, is the <em>cause</em> (<code>getCause()</code>). You used that in lesson 7.</p>

<h3>A row is a map</h3>
<p>Each row comes back as a <code>Map&lt;String, Object&gt;</code>: the key is the column name (or its alias from <code>AS</code>), the value is the column's
value. The map keeps the column order of your <code>SELECT</code>. Keys are the database names, so <code>first_name</code>, not <code>firstName</code>.
To use another key, write an alias: <code>SELECT first_name AS "firstName"</code> (double quotes keep the capital letter).</p>

<h3>Which Java type is each column?</h3>
<p>Your assertion must use the same type as the value, or <code>containsEntry</code> fails even when the number "looks" right.</p>
<div class="table-wrap"><table>
<thead><tr><th>Column or expression</th><th>PostgreSQL type</th><th>Java value in the map</th></tr></thead>
<tbody>
<tr><td><code>id</code>, <code>salary</code>, <code>days</code>, <code>manager_id</code></td><td><code>integer</code></td><td><code>Integer</code>: assert <code>80000</code></td></tr>
<tr><td><code>COUNT(*)</code>, <code>SUM(salary)</code>, <code>total_salary</code> in the view</td><td><code>bigint</code></td><td><code>Long</code>: assert <code>14L</code></td></tr>
<tr><td><code>AVG(salary)</code>, <code>ROUND(AVG(salary))</code></td><td><code>numeric</code></td><td><code>BigDecimal</code></td></tr>
<tr><td><code>headcount</code>, <code>average_salary</code> in <code>v_department_stats</code></td><td><code>integer</code> (cast with <code>::int</code> in the view)</td><td><code>Integer</code></td></tr>
<tr><td><code>first_name</code>, <code>email</code>, <code>status</code></td><td><code>varchar</code></td><td><code>String</code></td></tr>
<tr><td><code>hire_date</code>, <code>start_date</code>, <code>termination_date</code></td><td><code>date</code></td><td><code>LocalDate</code></td></tr>
<tr><td><code>created_at</code>, <code>updated_at</code>, <code>decided_at</code></td><td><code>timestamptz</code></td><td><code>OffsetDateTime</code>, always with offset UTC (<code>Z</code>)</td></tr>
<tr><td>any column that is NULL</td><td></td><td><code>null</code></td></tr>
</tbody></table></div>
<p>The same rule applies to <code>scalar</code>: <code>db.scalar(Long.class, "SELECT COUNT(*) …")</code> works.
<code>db.scalar(Integer.class, "SELECT COUNT(*) …")</code> fails with <em>conversion to class java.lang.Integer from int8 not supported</em>,
because <code>COUNT(*)</code> is a <code>bigint</code> (int8). If you want an <code>Integer</code>, cast in SQL: <code>SELECT COUNT(*)::int …</code>.
(The comment at the top of <code>Db.java</code> shows <code>scalar(Integer.class, …COUNT(*)…)</code>; use <code>Long.class</code> instead.)</p>
<p>Timestamps: the driver gives every <code>timestamptz</code> with offset UTC. Ethan's <code>created_at</code> is <code>2023-04-03T13:00Z</code>, the
same moment as 09:00 in Toronto. <code>isEqualTo(OffsetDateTime.parse("2023-04-03T09:00-04:00"))</code> fails, because the offsets differ.
<code>isAtSameInstantAs(…)</code> compares the moment and passes.</p>

<h3>AssertJ on rows</h3>
<ul>
<li><code>assertThat(row).containsEntry("salary", 80000)</code>: the key exists with that value. Chain several.</li>
<li><code>containsEntry("termination_date", null)</code>: the column is there and NULL.</li>
<li><code>containsKeys("phone", "email")</code>, <code>doesNotContainKey("password")</code>.</li>
<li>On a list of rows, <code>extracting("first_name")</code> pulls one column out of every map:
<code>assertThat(rows).extracting("first_name").containsExactly("Ethan", "Olivia", "Noah", "Fatima", "Jack")</code>.</li>
<li><code>extracting(r -&gt; r.get("salary"))</code> does the same with a lambda, when you need to convert the value.</li>
</ul>

<h3>Worked example: DbSmokeTest</h3>
<p>Read <code>starter/src/test/java/com/icehr/tests/DbSmokeTest.java</code>. It has the four shapes you will write most:</p>
<ol>
<li><code>scalar(Long.class, "SELECT COUNT(*) FROM employees WHERE id &lt; 1000")</code> → <code>60L</code>: count seed rows only, so your own test data
does not disturb it.</li>
<li><code>queryOne(…)</code> with <code>containsEntry</code> on Ethan: <code>salary 80000</code>, <code>hire_date LocalDate.of(2023, 4, 3)</code>,
<code>manager_id 9</code>.</li>
<li><code>queryList(…)</code> on <code>v_department_stats</code>: 9 rows, and the ninth is <code>LAB</code> with headcount 0.</li>
<li><code>assertThatThrownBy(() -&gt; db.update(…)).hasMessageContaining("permission denied")</code>: the reader cannot write.</li>
</ol>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li><code>containsEntry("count", 14)</code> on a <code>COUNT(*)</code>: the value is <code>14L</code>, a <code>Long</code>, and <code>14</code> is an
<code>Integer</code>. AssertJ reports <code>["count"=14L (expected: 14)]</code>: the same number, a different type.</li>
<li>Using the API's camelCase names (<code>hireDate</code>) as map keys. The map uses the database's names (<code>hire_date</code>).</li>
<li>Using <code>Db.writer()</code> for checks. A typo in a "check" can then change data.</li>
<li>Comparing a <code>BigDecimal</code> from <code>AVG</code> with <code>isEqualTo(new BigDecimal("83625"))</code>: <code>BigDecimal</code> equality also
compares the scale. Use <code>isEqualByComparingTo("83625")</code>, or cast in SQL.</li>
</ul></div>`,
      examples: [
        {
          title: "Rows, counts and lists with Db (DbHelperTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.db.Db;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("db")
class DbHelperTest {

    private final Db db = Db.reader();

    @Test
    void ethan_nguyen_as_a_map() {
        Map<String, Object> row = db.queryOne(
                "SELECT first_name, email, phone, salary, hire_date, manager_id, termination_date FROM employees WHERE id = ?", 13);

        assertThat(row)
                .containsEntry("first_name", "Ethan")
                .containsEntry("email", "ethan.nguyen@icehr.test")
                .containsEntry("phone", "416-555-0113")
                .containsEntry("salary", 80000)
                .containsEntry("hire_date", LocalDate.of(2023, 4, 3))
                .containsEntry("manager_id", 9)
                .containsEntry("termination_date", null);
    }

    @Test
    void counts_are_long() {
        Long engineers = db.scalar(Long.class, "SELECT COUNT(*) FROM employees WHERE department_id = ?", 2);
        Integer sameAsInt = db.scalar(Integer.class, "SELECT COUNT(*)::int FROM employees WHERE department_id = ?", 2);

        assertThat(engineers).isEqualTo(14L);
        assertThat(sameAsInt).isEqualTo(14);
    }

    @Test
    void aisha_rahman_leads_five_software_engineers() {
        List<Map<String, Object>> team = db.queryList(
                "SELECT id, first_name, job_id, salary FROM employees WHERE manager_id = ? ORDER BY id", 9);

        assertThat(team).hasSize(5);
        assertThat(team).extracting("first_name").containsExactly("Ethan", "Olivia", "Noah", "Fatima", "Jack");
        assertThat(team).extracting("job_id").containsOnly(4);
        assertThat(team).extracting(r -> (Integer) r.get("salary"))
                .allSatisfy(salary -> assertThat(salary).isBetween(80000, 115000));
    }

    @Test
    void scalar_needs_exactly_one_row() {
        // MAX over no matching rows still returns one row, with NULL in it
        Integer newestId = db.scalar(Integer.class, "SELECT MAX(id) FROM employees WHERE id > ?", 100000);
        assertThat(newestId).isNull();

        // No row at all (there is no employee 999): the helper fails the test for you
        assertThatThrownBy(() -> db.scalar(String.class, "SELECT email FROM employees WHERE id = ?", 999))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("Expected 1 row but got none");
    }
}`,
          note: "A NULL value and a missing row are different things: <code>scalar</code> returns <code>null</code> for the first and fails for the second. <code>queryOne</code> fails for both 0 and 2+ rows.",
        },
        {
          title: "Java types of real columns (ColumnTypesTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.db.Db;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("db")
class ColumnTypesTest {

    private final Db db = Db.reader();

    @Test
    void hannah_schmidt_column_by_column() {
        Map<String, Object> row = db.queryOne(
                "SELECT e.id, e.first_name, e.phone, e.hire_date, e.created_at, " +
                "       (SELECT COUNT(*) FROM leave_requests lr WHERE lr.employee_id = e.id) AS leave_count " +
                "  FROM employees e WHERE e.id = ?", 20);

        assertThat(row.get("id")).isInstanceOf(Integer.class);
        assertThat(row.get("first_name")).isInstanceOf(String.class);
        assertThat(row.get("phone")).isNull();                               // Hannah has no phone
        assertThat(row.get("hire_date")).isEqualTo(LocalDate.of(2022, 5, 16));
        assertThat(row.get("leave_count")).isEqualTo(0L);                    // COUNT -> Long

        OffsetDateTime createdAt = (OffsetDateTime) row.get("created_at");
        assertThat(createdAt).isAtSameInstantAs(OffsetDateTime.parse("2022-05-16T09:00-04:00"));   // 09:00 Toronto
        assertThat(createdAt.getOffset().getId()).isEqualTo("Z");                                   // driver uses UTC
    }

    @Test
    void the_stats_view_for_engineering() {
        Map<String, Object> stats = db.queryOne("SELECT * FROM v_department_stats WHERE department_id = ?", 2);

        assertThat(stats)
                .containsEntry("department_code", "ENG")
                .containsEntry("headcount", 14)               // ::int in the view -> Integer
                .containsEntry("average_salary", 112357)
                .containsEntry("max_salary", 172000)
                .containsEntry("total_salary", 1573000L);     // ::bigint -> Long
    }

    @Test
    void averages_are_big_decimals() {
        BigDecimal average = db.scalar(BigDecimal.class,
                "SELECT ROUND(AVG(salary)) FROM employees WHERE department_id = ? AND status = 'ACTIVE'", 3);

        assertThat(average).isEqualByComparingTo("83625");
    }
}`,
        },
      ],
      exercises: [
        "Run <code>DbSmokeTest</code> (<code>mvn test -Dtest=DbSmokeTest</code>), then copy <code>DbHelperTest</code> and <code>ColumnTypesTest</code> into the project and run them.",
        "Change <code>containsEntry(\"total_salary\", 1573000L)</code> to <code>1573000</code> (no L). Run it and copy the failure message. Explain it to a classmate.",
        "Write a test with <code>queryList</code> that reads the 8 PENDING leave requests ordered by <code>start_date</code> and asserts the list of <code>employee_id</code> values with <code>extracting(…).containsExactly(…)</code>.",
        "Write a test that reads Tanya Ivanova (58) and asserts <code>status</code> and <code>termination_date</code> (<code>LocalDate.of(2026, 6, 30)</code>).",
        "Write a test that asserts with <code>scalar</code> that Fatima Haddad (16) has used exactly 20 approved vacation days in 2026. Decide which Java type the <code>SUM</code> gives you before you run it.",
      ],
      quiz: [
        {
          q: `Which call returns the number of employees in department 2?`,
          options: [`<code>db.scalar(Integer.class, "SELECT COUNT(*) FROM employees WHERE department_id = ?", 2)</code>`, `<code>db.queryOne("SELECT COUNT(*) FROM employees WHERE department_id = 2")</code> compared with 14`, `<code>db.scalar(Long.class, "SELECT COUNT(*) FROM employees WHERE department_id = ?", 2)</code>`, `<code>db.update("SELECT COUNT(*) FROM employees WHERE department_id = ?", 2)</code>`],
          answer: 2,
          explain: `<code>COUNT(*)</code> is a <code>bigint</code>, which maps to <code>Long</code>. Asking for <code>Integer.class</code> fails with <em>conversion to class java.lang.Integer from int8 not supported</em>. <code>queryOne</code> returns a map, not a number, and <code>update</code> is for changes.`,
        },
        {
          q: `<code>assertThat(row).containsEntry("hireDate", LocalDate.of(2023, 4, 3))</code> fails for Ethan. Why?`,
          options: [`The date is stored as text`, `The map key is the column name <code>hire_date</code>, not the API's <code>hireDate</code>`, `Dates must be compared with <code>isAtSameInstantAs</code>`, `<code>queryOne</code> does not return dates`],
          answer: 1,
          explain: `Rows from <code>Db</code> use the database's column names (or your <code>AS</code> alias). The JSON field names of the API are different.`,
        },
        {
          q: `When should a test use <code>Db.writer()</code>?`,
          options: [`To set up or clean up data that the test needs`, `For every query, because it can do more`, `Never: it is only for the app`, `Only for <code>SELECT COUNT(*)</code>`],
          answer: 0,
          explain: `Checks use <code>Db.reader()</code>, so a mistake in a check can never change data. <code>Db.writer()</code> is for INSERT, UPDATE and DELETE during setup and cleanup.`,
        },
        {
          q: `Ethan's <code>created_at</code> comes back as <code>2023-04-03T13:00Z</code>. Which assertion passes?`,
          options: [`<code>isEqualTo(OffsetDateTime.parse("2023-04-03T09:00-04:00"))</code>`, `<code>isEqualTo(LocalDate.of(2023, 4, 3))</code>`, `<code>isEqualTo("2023-04-03 09:00")</code>`, `<code>isAtSameInstantAs(OffsetDateTime.parse("2023-04-03T09:00-04:00"))</code>`],
          answer: 3,
          explain: `13:00 UTC and 09:00 at −04:00 are the same moment, but <code>isEqualTo</code> on an <code>OffsetDateTime</code> also compares the offset. <code>isAtSameInstantAs</code> compares only the moment.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "api-to-db",
      title: "Checking API actions in the database",
      summary: "Call the API with REST Assured, then prove with SQL what it stored: hires, updates, terminations, deletes and leave days. Always clean up.",
      body: `
<p>This is the lesson the whole tutorial builds up to. The pattern is always the same:</p>
<ol>
<li><strong>Arrange:</strong> create the data the test needs (usually through the API) and remember its ids.</li>
<li><strong>Act:</strong> call the endpoint you are testing, with REST Assured.</li>
<li><strong>Assert in the response</strong> (status, a few fields), then <strong>assert in the database</strong> with <code>Db.reader()</code>.</li>
<li><strong>Clean up</strong> what you created, in <code>@AfterEach</code> or a <code>finally</code> block, whether the test passed or failed.</li>
</ol>
<p>Why look at the database when the response already shows the employee? Because the response is the app's own description of what it did. The
database check catches what the response hides or gets wrong: a column the API never returns, a change in <em>another</em> table, a change that
should have been rolled back, or a response built from the request instead of from the stored row.</p>

<h3>What to check after each action</h3>
<div class="table-wrap"><table>
<thead><tr><th>API action</th><th>Rule (README)</th><th>Database check</th></tr></thead>
<tbody>
<tr><td><code>POST /employees</code></td><td>E2: email stored in lower case; new employees are ACTIVE with no termination date</td><td><code>employees</code> row: <code>email</code> lower case, <code>status = 'ACTIVE'</code>, <code>termination_date</code> NULL, id &gt; 1000, <code>created_at = updated_at</code></td></tr>
<tr><td><code>PATCH /employees/{id}</code></td><td>Only the fields you send change</td><td>The new <code>salary</code>; <code>updated_at</code> later than before; <code>created_at</code> unchanged</td></tr>
<tr><td>A rejected PATCH (422)</td><td>Nothing changes on an error</td><td>The whole row, including <code>updated_at</code>, is exactly as before</td></tr>
<tr><td><code>POST /employees/{id}/terminate</code></td><td>Status, pending leave and managed department change in one transaction</td><td><code>employees.status</code>/<code>termination_date</code>; <code>leave_requests.status = 'CANCELLED'</code> with <code>decision_reason</code> "Employee terminated."; <code>departments.manager_id</code> NULL</td></tr>
<tr><td><code>DELETE /employees/{id}</code></td><td>Their leave requests are deleted too (ON DELETE CASCADE)</td><td>No row in <code>employees</code>, no rows in <code>leave_requests</code> for that id</td></tr>
<tr><td><code>POST /leave-requests</code></td><td>Days are Monday to Friday, both ends included</td><td><code>days</code> equals the weekdays between <code>start_date</code> and <code>end_date</code></td></tr>
</tbody></table></div>

<h3>Worked example: hire, then check the row</h3>
<p>The test sends <code>NewEmployee.valid().withEmail("Jane.DOE.&lt;number&gt;@IceHR.test")</code>. The API answers 201 with an id, say 1001. Then:</p>
<pre><code>SELECT email, status, termination_date, created_at, updated_at FROM employees WHERE id = 1001;
-- jane.doe.&lt;number&gt;@icehr.test | ACTIVE | NULL | 2026-11-05 17:10:29.143+00 | 2026-11-05 17:10:29.143+00</code></pre>
<p>The email is lower case in the table, which is what rule E2 promises. <code>created_at</code> and <code>updated_at</code> are identical because both
come from the same <code>now()</code>. After a <code>PATCH</code> of the salary one second later, <code>updated_at</code> moves to 17:10:30.240 and
<code>created_at</code> stays. The database keeps milliseconds; the API rounds to whole seconds, so compare these values in SQL or as
<code>OffsetDateTime</code>, not as API strings.</p>

<h3>Worked example: terminate</h3>
<p>Termination changes three tables. To see all three, the test builds its own situation: it hires an employee, creates a department managed by that
employee (<code>POST /departments</code> with <code>managerId</code>), and requests a vacation for that employee in two weeks (PENDING). Then it calls
<code>POST /employees/{id}/terminate</code> with today's date (<code>TestData.today()</code>, Toronto). Afterwards:</p>
<ul>
<li><code>employees</code>: <code>status = 'TERMINATED'</code>, <code>termination_date</code> = today.</li>
<li><code>leave_requests</code>: the vacation is <code>CANCELLED</code>, <code>decision_reason = 'Employee terminated.'</code>, and <code>approver_id</code> is still NULL
(nobody decided it).</li>
<li><code>departments</code>: <code>manager_id</code> is NULL.</li>
</ul>
<p>"In one transaction" means the three updates are committed together or not at all. You cannot pause the app in the middle, but you can test the
"not at all" half: terminating Aisha Rahman (9), who still manages 5 active people, gives 409 <code>EMPLOYEE_HAS_REPORTS</code>, and her row must still be
ACTIVE with no termination date.</p>

<h3>Worked example: leave days</h3>
<p>The app computes <code>days</code>; the database only checks it is above 0. So the database is a good place to check the calculation. A request from
Friday 2026-11-20 to Tuesday 2026-11-24 is stored with <code>days = 3</code> (Friday, Monday, Tuesday). In SQL you can count the weekdays yourself:
<code>generate_series(start_date, end_date, interval '1 day')</code> produces one row per calendar day, and <code>EXTRACT(ISODOW FROM day) &lt; 6</code> keeps
Monday (1) to Friday (5).</p>

<h3>Cleaning up</h3>
<ul>
<li>Keep the ids of everything you create in a field or list, and delete it in <code>@AfterEach</code>. JUnit runs <code>@AfterEach</code> even when the
test fails.</li>
<li>Delete in the right order: children before parents. A department can only be deleted when it has no employees; an employee only when nobody reports to them.</li>
<li>Deleting an employee through the API also deletes their leave (CASCADE), so you do not need to clean leave separately.</li>
<li>Never change seed rows in a test unless you put them back. Other tests (and your classmates' expectations) rely on them. Make your own data instead.</li>
<li>If a run crashed and left data behind, rows with id &gt; 1000 are yours. A reset removes them all.</li>
</ul>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Only asserting the response, then calling it a "database test".</li>
<li>Checking with a hard-coded id (<code>WHERE id = 1001</code>). Use the id the API returned.</li>
<li>Building leave dates as fixed strings. They go stale; use <code>TestData.futureMonday(…)</code> and <code>TestData.today()</code>.</li>
<li>Using <code>LocalDate.now()</code> for "today". Ice HR uses Toronto's date; your PC may already be on tomorrow. Use <code>TestData.today()</code>.</li>
<li>Forgetting cleanup when an assertion fails halfway: use <code>@AfterEach</code> or <code>try/finally</code>, not a delete at the end of the test.</li>
</ul></div>`,
      examples: [
        {
          title: "Hire and PATCH, then check the row (HireCheckDbTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.db.Db;
import com.icehr.model.NewEmployee;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/** Act through the API, check the row with SQL. Every employee a test hires is deleted again. */
@Tag("api")
@Tag("db")
class HireCheckDbTest {

    private final Db db = Db.reader();
    private final List<Integer> created = new ArrayList<>();

    @AfterEach
    void deleteWhatWeCreated() {
        for (Integer id : created) {
            given().spec(Specs.api()).delete("/employees/{id}", id).then().statusCode(204);
        }
    }

    private int hire(NewEmployee body) {
        int id = given().spec(Specs.api()).body(body)
                .when().post("/employees")
                .then().statusCode(201)
                .extract().path("id");
        created.add(id);
        return id;
    }

    @Test
    void a_new_hire_is_stored_active_with_a_lower_case_email() {
        NewEmployee body = NewEmployee.valid().withEmail("Jane.DOE." + System.nanoTime() + "@IceHR.test");

        int id = hire(body);

        Map<String, Object> row = db.queryOne(
                "SELECT email, status, termination_date, job_id, department_id, manager_id, salary, hire_date, " +
                "       created_at, updated_at FROM employees WHERE id = ?", id);
        assertThat(id).isGreaterThan(1000);
        assertThat(row)
                .containsEntry("email", body.email().toLowerCase())
                .containsEntry("status", "ACTIVE")
                .containsEntry("termination_date", null)
                .containsEntry("job_id", 4)
                .containsEntry("department_id", 2)
                .containsEntry("manager_id", 9)
                .containsEntry("salary", 95000)
                .containsEntry("hire_date", body.hireDate());
        assertThat(row.get("updated_at")).isEqualTo(row.get("created_at"));
    }

    @Test
    void a_salary_change_is_stored_and_moves_updated_at() {
        int id = hire(NewEmployee.valid());
        OffsetDateTime before = db.scalar(OffsetDateTime.class, "SELECT updated_at FROM employees WHERE id = ?", id);

        given().spec(Specs.api()).body(Map.of("salary", 99000))
        .when().patch("/employees/{id}", id)
        .then().spec(Specs.ok()).body("salary", equalTo(99000));

        Map<String, Object> row = db.queryOne("SELECT salary, created_at, updated_at FROM employees WHERE id = ?", id);
        assertThat(row)
                .containsEntry("salary", 99000)
                .containsEntry("created_at", before);          // created_at never moves
        assertThat((OffsetDateTime) row.get("updated_at")).isAfter(before);
    }

    @Test
    void a_rejected_change_leaves_the_row_untouched() {
        int id = hire(NewEmployee.valid());
        Map<String, Object> before = db.queryOne("SELECT salary, updated_at FROM employees WHERE id = ?", id);

        given().spec(Specs.api()).body(Map.of("salary", 200000))   // Software Engineer: 80000 to 115000
        .when().patch("/employees/{id}", id)
        .then().spec(Specs.problem(422, "SALARY_OUT_OF_RANGE"));

        assertThat(db.queryOne("SELECT salary, updated_at FROM employees WHERE id = ?", id)).isEqualTo(before);
    }
}`,
        },
        {
          title: "Terminate: three tables in one transaction (TerminateCheckDbTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.db.Db;
import com.icehr.model.NewEmployee;
import com.icehr.support.TestData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

@Tag("api")
@Tag("db")
class TerminateCheckDbTest {

    private static final String CODE = "TERM";   // our own department, so no seed row changes

    private final Db db = Db.reader();
    private Integer employeeId;
    private Integer departmentId;

    @BeforeEach
    void setUp() {
        Db.writer().update("DELETE FROM departments WHERE code = ?", CODE);   // leftovers from a crashed run

        employeeId = given().spec(Specs.api()).body(NewEmployee.valid())
                .when().post("/employees")
                .then().statusCode(201).extract().path("id");

        departmentId = given().spec(Specs.api())
                .body(Map.of("name", "Termination Test", "code", CODE, "location", "Toronto", "managerId", employeeId))
                .when().post("/departments")
                .then().statusCode(201).extract().path("id");
    }

    @AfterEach
    void cleanUp() {
        if (departmentId != null) {
            given().spec(Specs.api()).delete("/departments/{id}", departmentId).then().statusCode(204);
        }
        if (employeeId != null) {
            given().spec(Specs.api()).delete("/employees/{id}", employeeId).then().statusCode(204);
        }
    }

    @Test
    void terminating_updates_the_employee_their_leave_and_their_department() {
        LocalDate monday = TestData.futureMonday(2);
        int leaveId = given().spec(Specs.api())
                .body(Map.of("employeeId", employeeId, "type", "VACATION",
                        "startDate", monday.toString(), "endDate", monday.plusDays(4).toString()))
                .when().post("/leave-requests")
                .then().statusCode(201).body("status", equalTo("PENDING"))
                .extract().path("id");
        LocalDate today = TestData.today();

        given().spec(Specs.api()).body(Map.of("terminationDate", today.toString()))
        .when().post("/employees/{id}/terminate", employeeId)
        .then().spec(Specs.ok()).body("status", equalTo("TERMINATED"));

        assertThat(db.queryOne("SELECT status, termination_date FROM employees WHERE id = ?", employeeId))
                .containsEntry("status", "TERMINATED")
                .containsEntry("termination_date", today);
        assertThat(db.queryOne("SELECT status, decision_reason, approver_id FROM leave_requests WHERE id = ?", leaveId))
                .containsEntry("status", "CANCELLED")
                .containsEntry("decision_reason", "Employee terminated.")
                .containsEntry("approver_id", null);
        assertThat(db.queryOne("SELECT manager_id FROM departments WHERE id = ?", departmentId))
                .containsEntry("manager_id", null);
    }

    @Test
    void a_refused_termination_changes_nothing() {
        // Aisha Rahman (9) still manages 5 active people
        given().spec(Specs.api()).body(Map.of("terminationDate", TestData.today().toString()))
        .when().post("/employees/{id}/terminate", 9)
        .then().spec(Specs.problem(409, "EMPLOYEE_HAS_REPORTS"));

        assertThat(db.queryOne("SELECT status, termination_date FROM employees WHERE id = ?", 9))
                .containsEntry("status", "ACTIVE")
                .containsEntry("termination_date", null);
    }
}`,
          note: "The department is deleted before the employee in <code>cleanUp</code>. The employee works in Engineering, not in it, so the department is empty and can go.",
        },
        {
          title: "Delete cascades, and leave days are weekdays (DeleteAndLeaveDbTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.db.Db;
import com.icehr.model.NewEmployee;
import com.icehr.support.TestData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("api")
@Tag("db")
class DeleteAndLeaveDbTest {

    private final Db db = Db.reader();
    private int employeeId;

    @BeforeEach
    void hireSomeone() {
        employeeId = given().spec(Specs.api()).body(NewEmployee.valid())
                .when().post("/employees")
                .then().statusCode(201).extract().path("id");
    }

    @AfterEach
    void cleanUp() {
        // 204 if the employee still exists, 404 if the test deleted them already: both are fine here
        given().spec(Specs.api()).delete("/employees/{id}", employeeId);
    }

    private int requestVacation(LocalDate start, LocalDate end) {
        return given().spec(Specs.api())
                .body(Map.of("employeeId", employeeId, "type", "VACATION",
                        "startDate", start.toString(), "endDate", end.toString()))
                .when().post("/leave-requests")
                .then().statusCode(201)
                .extract().path("id");
    }

    @Test
    void deleting_an_employee_deletes_their_leave_requests() {
        LocalDate monday = TestData.futureMonday(2);
        int leaveId = requestVacation(monday, monday.plusDays(4));
        assertThat(db.scalar(Long.class, "SELECT COUNT(*) FROM leave_requests WHERE employee_id = ?", employeeId))
                .isEqualTo(1L);

        given().spec(Specs.api()).delete("/employees/{id}", employeeId).then().statusCode(204);

        assertThat(db.scalar(Long.class, "SELECT COUNT(*) FROM employees WHERE id = ?", employeeId)).isZero();
        assertThat(db.scalar(Long.class, "SELECT COUNT(*) FROM leave_requests WHERE id = ?", leaveId)).isZero();
    }

    @Test
    void friday_to_monday_is_stored_as_two_days() {
        LocalDate friday = TestData.futureMonday(3).plusDays(4);
        LocalDate monday = friday.plusDays(3);
        if (monday.getYear() != friday.getYear()) {   // leave may not cross into the next year
            friday = friday.plusWeeks(2);
            monday = monday.plusWeeks(2);
        }
        int leaveId = requestVacation(friday, monday);

        Map<String, Object> row = db.queryOne(
                "SELECT start_date, days, " +
                "       (SELECT COUNT(*) FROM generate_series(start_date, end_date, interval '1 day') AS g(day) " +
                "         WHERE EXTRACT(ISODOW FROM g.day) < 6) AS weekdays " +
                "  FROM leave_requests WHERE id = ?", leaveId);

        assertThat(row)
                .containsEntry("start_date", friday)
                .containsEntry("days", 2)
                .containsEntry("weekdays", 2L);
    }
}`,
        },
      ],
      exercises: [
        "Copy <code>HireCheckDbTest</code> into the project and run it. Then add a test that hires someone with <code>phone</code> left out (<code>new NewEmployee(…)</code> with <code>null</code>) and checks that <code>phone</code> is NULL in the table.",
        "Write a test that approves a leave request it created (approver 9, the manager of every <code>NewEmployee.valid()</code>) and checks <code>status</code>, <code>approver_id</code> and that <code>decided_at</code> is not NULL in <code>leave_requests</code>.",
        "Write a test that cancels a PENDING request it created and checks the row. Which columns change, and which stay NULL?",
        "Run <code>TerminateCheckDbTest</code>. Then extend the main test: also give the employee an APPROVED request that starts in the future, and check it is CANCELLED too.",
        "Write a test for <code>PUT /employees/{id}</code> without <code>phone</code> and <code>managerId</code> (README: they become NULL). Check both columns in the database.",
      ],
      quiz: [
        {
          q: `After <code>POST /employees</code> with <code>"email": "Jane.Doe@ICEHR.test"</code>, what must the <code>email</code> column contain?`,
          options: [`<code>Jane.Doe@ICEHR.test</code>, exactly as sent`, `<code>jane.doe@icehr.test</code>`, `NULL until the email is confirmed`, `<code>JANE.DOE@ICEHR.TEST</code>`],
          answer: 1,
          explain: `Rule E2: the email is stored in lower case. The <code>employees_email_lowercase</code> constraint would even refuse anything else.`,
        },
        {
          q: `A test terminates an employee who has a PENDING request and manages a department. Which check is NOT part of the documented result?`,
          options: [`<code>employees.status</code> is TERMINATED`, `The request is CANCELLED with "Employee terminated."`, `The department's <code>manager_id</code> is NULL`, `The employee's row is deleted`],
          answer: 3,
          explain: `Termination keeps the employee's row (status TERMINATED, with a termination date). Only <code>DELETE /employees/{id}</code> removes the row.`,
        },
        {
          q: `Where should a test delete the employee it hired?`,
          options: [`In <code>@AfterEach</code> (or a <code>finally</code> block), so it runs even when an assertion fails`, `At the last line of the test method`, `Nowhere: a reset will clean up one day`, `In <code>@BeforeEach</code> of the next test`],
          answer: 0,
          explain: `If an assertion fails, the rest of the test method is skipped, including a delete at the end. <code>@AfterEach</code> and <code>finally</code> always run.`,
        },
        {
          q: `A PATCH is rejected with 422. What should the database show?`,
          options: [`The new value, with status INVALID`, `<code>updated_at</code> moved, the rest unchanged`, `The row exactly as before, including <code>updated_at</code>`, `The row is locked until a reset`],
          answer: 2,
          explain: `A rejected request must leave no trace. Reading the row before and after and comparing the two maps checks every column at once.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "sql-setup-and-toolkit",
      title: "Setting up data with SQL, and a QA query toolkit",
      summary: "Insert test data as qa_writer and read it through the API, run consistency queries that find broken data, and compare an API answer with SQL in one test.",
      body: `
<p>So far you created test data through the API. Sometimes SQL is the better tool:</p>
<ul>
<li><strong>States the API cannot create.</strong> Leave in the past (rule L10 forbids it), a decision made last March, a timestamp from 2019.</li>
<li><strong>Speed.</strong> One <code>INSERT</code> is faster than five API calls when you need a lot of rows.</li>
<li><strong>Testing the API's reaction to unusual data.</strong> For example a stored salary outside the range (lesson 7).</li>
</ul>

<h3>How to insert setup data</h3>
<ol>
<li>Use <code>Db.writer()</code>. Each <code>update</code> or <code>scalar</code> call commits at once, so the app can see the row immediately.</li>
<li>Get the new id with <code>RETURNING id</code>: <code>writer.scalar(Integer.class, "INSERT … RETURNING id", …)</code>. Never guess it.</li>
<li>Make unique values unique: <code>TestData.uniqueEmail()</code> for emails, a code nobody else uses for departments.</li>
<li>Fill <em>every</em> column the app would fill. The app computes <code>days</code> and sets <code>decided_at</code>, <code>approver_id</code> and
<code>updated_at</code>; SQL does not. If you insert an APPROVED request, give it an approver, a <code>decided_at</code> and the right number of days.</li>
<li>Keep the data valid by README section 5, unless invalid data is the point of the test. Remember the database only enforces its own constraints.</li>
<li>Clean up in <code>finally</code>. Deleting the employee also deletes their leave (CASCADE).</li>
</ol>
<p>Worked example (<code>SqlSetupTest</code> below): insert a QA Analyst (job 6, department 3, manager 3, salary 70000) and an APPROVED vacation for
2 to 6 March 2026 (Monday to Friday, 5 days, approver 3). Then <code>GET /api/v1/employees/{id}/leave-balance?year=2026</code> answers VACATION
<code>used: 5</code>, <code>remaining: 15</code>. The API calculated the balance from rows it never created, which is exactly what you wanted to test.</p>

<h3>The QA query toolkit</h3>
<p>A <strong>consistency query</strong> looks for data that should not exist. On correct data it returns <strong>no rows</strong>; any row it returns is a
lead for a bug (in the app, a migration, or someone's SQL). Testers keep a file of them and run it after big test runs or before a release. Each query
below returns 0 rows on the seed, except where noted:</p>
<div class="table-wrap"><table>
<thead><tr><th>Question</th><th>Idea of the query</th></tr></thead>
<tbody>
<tr><td>Duplicate emails, ignoring case?</td><td><code>GROUP BY lower(email) HAVING COUNT(*) &gt; 1</code></td></tr>
<tr><td>Orphans: leave whose employee is gone? Employees whose manager is terminated?</td><td><code>LEFT JOIN … IS NULL</code>; join to the manager and check <code>status</code></td></tr>
<tr><td>TERMINATED without a termination date (or the reverse)?</td><td><code>(status = 'TERMINATED') &lt;&gt; (termination_date IS NOT NULL)</code>. The CHECK makes it impossible, and the query proves it.</td></tr>
<tr><td>Terminated employees with leave still PENDING?</td><td>Join and filter: termination should have cancelled it</td></tr>
<tr><td>Salaries outside their job's range?</td><td>Join <code>jobs</code>, <code>salary NOT BETWEEN min_salary AND max_salary</code>. Should be none: rule E16 lives only in the API, so this query is the only way to spot bad rows.</td></tr>
<tr><td>Leave balances over the allowance?</td><td>Sum APPROVED + PENDING days per employee, type and year; compare with 20 / 10 / 3</td></tr>
<tr><td>Stored <code>days</code> different from the weekdays?</td><td><code>generate_series</code> and <code>ISODOW</code>, as in lesson 10</td></tr>
<tr><td>PENDING leave whose start date has passed?</td><td><code>start_date &lt; </code> today in Toronto. <strong>Not 0:</strong> on 2026-11-05 it finds request 29 (Diego Torres, SICK, from 2026-11-02). That is allowed (sick leave can be requested afterwards), but a manager should decide it soon. The result depends on the date you run it.</td></tr>
</tbody></table></div>
<p>For "today" in SQL, do not use <code>CURRENT_DATE</code>: it uses your session's time zone (DBeaver and Java use your PC's; the Ice HR server uses UTC).
Write <code>(now() AT TIME ZONE 'America/Toronto')::date</code>, the same "today" as the app.</p>

<h3>Turning queries into tests</h3>
<p>Each consistency query becomes a one-line test: <code>assertThat(db.queryList(sql)).isEmpty()</code>. When it fails, AssertJ prints the rows it
found, so the failure message is the bug report. See <code>DataConsistencyTest</code> below.</p>

<h3>Comparing the API with SQL in one test</h3>
<p>The strongest check asks the same question twice, once to each layer, and compares. <code>ApiVsSqlTest</code> reads
<code>GET /api/v1/reports/department-stats</code> and runs your own <code>GROUP BY</code> from lesson 3, then compares them department by department.
One detail: the two sides give different Java types. JSON numbers arrive as <code>Integer</code>; <code>COUNT</code> and <code>SUM</code> arrive as
<code>Long</code> and <code>ROUND(AVG(…))</code> as <code>BigDecimal</code>. Convert both sides to <code>long</code> before comparing, or the test fails on
<code>14</code> against <code>14L</code>.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Inserting setup rows that break the business rules by accident, then reporting the API's reaction as a bug.</li>
<li>Forgetting columns the app normally fills (<code>days</code>, <code>approver_id</code>, <code>decided_at</code>), so the row is not realistic.</li>
<li>Cleaning up only at the end of the test method. Use <code>finally</code>.</li>
<li>A consistency test that compares with "today" using <code>CURRENT_DATE</code>. It changes with the time zone of the machine that runs it.</li>
<li>Comparing a whole JSON body with a whole SQL row. Pick the fields that matter and convert types on both sides.</li>
</ul></div>`,
      examples: [
        {
          title: "Set up history with SQL, check it through the API (SqlSetupTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.db.Db;
import com.icehr.support.TestData;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@Tag("api")
@Tag("db")
class SqlSetupTest {

    private final Db writer = Db.writer();

    private Integer insertQaAnalyst(String email) {
        return writer.scalar(Integer.class,
                "INSERT INTO employees (first_name, last_name, gender, email, date_of_birth, hire_date, " +
                "                       job_id, department_id, manager_id, salary, country_code) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
                "Sql", "Setup", "MALE", email, LocalDate.of(1990, 5, 1), LocalDate.of(2020, 1, 6), 6, 3, 3, 70000, "CA");
    }

    @Test
    void an_employee_inserted_with_sql_is_served_by_the_api() {
        String email = TestData.uniqueEmail();
        Integer id = insertQaAnalyst(email);
        try {
            given().spec(Specs.api())
            .when().get("/employees/{id}", id)
            .then().spec(Specs.ok())
                    .body("email", equalTo(email))
                    .body("status", equalTo("ACTIVE"))
                    .body("departmentId", equalTo(3))
                    .body("hireDate", equalTo("2020-01-06"));
        } finally {
            writer.update("DELETE FROM employees WHERE id = ?", id);
        }
    }

    @Test
    void past_leave_inserted_with_sql_counts_in_the_balance() {
        Integer id = insertQaAnalyst(TestData.uniqueEmail());
        try {
            // An approved vacation last March. The API cannot create leave in the past; SQL can.
            writer.update(
                    "INSERT INTO leave_requests (employee_id, type, start_date, end_date, days, status, approver_id, decided_at) " +
                    "VALUES (?, 'VACATION', ?, ?, 5, 'APPROVED', 3, now())",
                    id, LocalDate.of(2026, 3, 2), LocalDate.of(2026, 3, 6));

            given().spec(Specs.api())
                    .queryParam("year", 2026)
            .when().get("/employees/{id}/leave-balance", id)
            .then().spec(Specs.ok())
                    .body("balances.find { it.type == 'VACATION' }.used", equalTo(5))
                    .body("balances.find { it.type == 'VACATION' }.remaining", equalTo(15));
        } finally {
            writer.update("DELETE FROM employees WHERE id = ?", id);   // the leave goes too (ON DELETE CASCADE)
        }
    }
}`,
        },
        {
          title: "The QA toolkit: consistency queries (run as qa_reader)",
          lang: "sql",
          code: `
-- 1. Duplicate emails, ignoring case                                   (expect 0 rows)
SELECT lower(email) AS email, COUNT(*) FROM employees
 GROUP BY lower(email) HAVING COUNT(*) > 1;

-- 2. Orphans: leave whose employee is missing                          (expect 0 rows)
SELECT lr.id, lr.employee_id FROM leave_requests lr
  LEFT JOIN employees e ON e.id = lr.employee_id
 WHERE e.id IS NULL;

-- 3. Employees whose manager is terminated                             (expect 0 rows)
SELECT e.id, e.manager_id FROM employees e
  JOIN employees m ON m.id = e.manager_id
 WHERE m.status = 'TERMINATED';

-- 4. TERMINATED without a termination date, or the reverse             (expect 0 rows)
SELECT id, status, termination_date FROM employees
 WHERE (status = 'TERMINATED') <> (termination_date IS NOT NULL);

-- 5. Terminated employees with leave still pending                     (expect 0 rows)
SELECT lr.id, lr.employee_id FROM leave_requests lr
  JOIN employees e ON e.id = lr.employee_id
 WHERE e.status = 'TERMINATED' AND lr.status = 'PENDING';

-- 6. Salaries outside the job's range                                  (expect 0 rows)
SELECT e.id, e.salary, j.title, j.min_salary, j.max_salary FROM employees e
  JOIN jobs j ON j.id = e.job_id
 WHERE e.salary NOT BETWEEN j.min_salary AND j.max_salary;

-- 7. Leave booked (approved + pending) over the yearly allowance       (expect 0 rows)
SELECT employee_id, type, EXTRACT(YEAR FROM start_date) AS year, SUM(days) AS booked
  FROM leave_requests
 WHERE status IN ('APPROVED', 'PENDING')
 GROUP BY employee_id, type, EXTRACT(YEAR FROM start_date)
HAVING SUM(days) > CASE type WHEN 'VACATION' THEN 20 WHEN 'SICK' THEN 10 ELSE 3 END;

-- 8. Stored days different from the weekdays between the dates         (expect 0 rows)
SELECT lr.id, lr.days FROM leave_requests lr
 WHERE lr.days <> (SELECT COUNT(*) FROM generate_series(lr.start_date, lr.end_date, interval '1 day') AS g(day)
                    WHERE EXTRACT(ISODOW FROM g.day) < 6);

-- 9. Pending leave whose start date has passed (today in Toronto)      (on 2026-11-05: request 29)
SELECT id, employee_id, type, start_date FROM leave_requests
 WHERE status = 'PENDING'
   AND start_date < (now() AT TIME ZONE 'America/Toronto')::date;`,
        },
        {
          title: "The toolkit as tests (DataConsistencyTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.db.Db;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Each query looks for data that should not exist. On healthy data every list is empty. */
@Tag("db")
class DataConsistencyTest {

    private final Db db = Db.reader();

    @Test
    void no_two_employees_share_an_email() {
        assertThat(db.queryList(
                "SELECT lower(email) AS email, COUNT(*) AS n FROM employees GROUP BY lower(email) HAVING COUNT(*) > 1"))
                .isEmpty();
    }

    @Test
    void every_salary_is_inside_its_job_range() {
        assertThat(db.queryList(
                "SELECT e.id, e.salary, j.min_salary, j.max_salary FROM employees e JOIN jobs j ON j.id = e.job_id " +
                "WHERE e.salary NOT BETWEEN j.min_salary AND j.max_salary"))
                .isEmpty();
    }

    @Test
    void terminated_employees_have_no_pending_leave() {
        assertThat(db.queryList(
                "SELECT lr.id FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id " +
                "WHERE e.status = 'TERMINATED' AND lr.status = 'PENDING'"))
                .isEmpty();
    }

    @Test
    void nobody_has_booked_more_leave_than_the_allowance() {
        assertThat(db.queryList(
                "SELECT employee_id, type, EXTRACT(YEAR FROM start_date) AS year, SUM(days) AS booked " +
                "  FROM leave_requests WHERE status IN ('APPROVED', 'PENDING') " +
                " GROUP BY employee_id, type, EXTRACT(YEAR FROM start_date) " +
                "HAVING SUM(days) > CASE type WHEN 'VACATION' THEN 20 WHEN 'SICK' THEN 10 ELSE 3 END"))
                .isEmpty();
    }

    @Test
    void stored_leave_days_are_the_weekdays_between_the_dates() {
        assertThat(db.queryList(
                "SELECT lr.id, lr.days FROM leave_requests lr WHERE lr.days <> " +
                "(SELECT COUNT(*) FROM generate_series(lr.start_date, lr.end_date, interval '1 day') AS g(day) " +
                "  WHERE EXTRACT(ISODOW FROM g.day) < 6)"))
                .isEmpty();
    }
}`,
        },
        {
          title: "Same question, two layers (ApiVsSqlTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.db.Db;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("api")
@Tag("db")
class ApiVsSqlTest {

    /** JSON gives Integer, SQL gives Long or BigDecimal: compare everything as Long. */
    private static Long asLong(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    @Test
    void department_stats_match_a_group_by_written_by_hand() {
        List<Map<String, Object>> api = given().spec(Specs.api())
                .when().get("/reports/department-stats")
                .then().spec(Specs.ok())
                .extract().jsonPath().getList("$");

        List<Map<String, Object>> sql = Db.reader().queryList(
                "SELECT d.id, COUNT(e.id) AS headcount, ROUND(AVG(e.salary)) AS average_salary, " +
                "       COALESCE(SUM(e.salary), 0) AS total_salary " +
                "  FROM departments d " +
                "  LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'ACTIVE' " +
                " GROUP BY d.id ORDER BY d.id");

        assertThat(api).hasSameSizeAs(sql);
        for (int i = 0; i < sql.size(); i++) {
            Map<String, Object> fromApi = api.get(i);
            Map<String, Object> fromSql = sql.get(i);
            String department = "department " + fromSql.get("id");

            assertThat(asLong(fromApi.get("departmentId"))).as(department).isEqualTo(asLong(fromSql.get("id")));
            assertThat(asLong(fromApi.get("headcount"))).as(department).isEqualTo(asLong(fromSql.get("headcount")));
            assertThat(asLong(fromApi.get("averageSalary"))).as(department).isEqualTo(asLong(fromSql.get("average_salary")));
            assertThat(asLong(fromApi.get("totalSalary"))).as(department).isEqualTo(asLong(fromSql.get("total_salary")));
        }
    }

    @Test
    void engineering_headcount_is_the_same_in_the_api_and_in_sql() {
        int fromApi = given().spec(Specs.api())
                .queryParam("departmentId", 2)
                .queryParam("status", "ACTIVE")
                .when().get("/employees")
                .then().spec(Specs.ok())
                .extract().path("totalElements");

        Long fromSql = Db.reader().scalar(Long.class,
                "SELECT COUNT(*) FROM employees WHERE department_id = ? AND status = 'ACTIVE'", 2);

        assertThat((long) fromApi).isEqualTo(fromSql);
    }
}`,
          note: "Neither test hard-codes a number. They stay correct after you add departments or employees, because both sides read the same data.",
        },
      ],
      exercises: [
        "Run <code>SqlSetupTest</code>. Then add a test that inserts a REJECTED request with SQL (with <code>approver_id</code>, <code>decided_at</code> and a <code>decision_reason</code>) and checks that <code>GET /api/v1/leave-requests/{id}</code> returns all three fields.",
        "Run the toolkit script in DBeaver after a reset and write down which queries return rows. Then run your whole test suite (<code>mvn test</code>) and run the toolkit again. Did anything change?",
        "Add two queries to the toolkit: employees hired before their 18th birthday (rule E14), and APPROVED or REJECTED requests decided by someone who is neither the employee's manager nor the HR Manager (rule A7). Run both.",
        "In a transaction as <code>qa_writer</code>, insert a row that makes query 6 (salary range) return something. Run <code>DataConsistencyTest</code> while the transaction is open, then commit and run it again. Explain the difference, then delete the row.",
        "Write an API-against-SQL test of your own: compare <code>GET /api/v1/employees/{id}/leave-balance?year=2026</code> for Kevin Singh (23) with a <code>SUM(days)</code> query for each leave type.",
      ],
      quiz: [
        {
          q: `Why would you insert a leave request with SQL instead of through the API?`,
          options: [`SQL inserts are checked more strictly`, `The API cannot insert leave requests at all`, `It makes the test independent of the database`, `To create a state the API refuses, such as approved leave in the past`],
          answer: 3,
          explain: `Rule L10 stops the API from creating vacation that starts in the past. SQL can, which lets you test how the balance treats history.`,
        },
        {
          q: `A consistency query returns rows. What does that mean?`,
          options: [`The query is wrong, because consistency queries always return rows`, `It found data that should not exist: a lead for a bug to investigate`, `The database is down`, `Nothing; the result only matters on Fridays`],
          answer: 1,
          explain: `A consistency query is written to return nothing on healthy data. Each row it returns is evidence to investigate: how did this row get here?`,
        },
        {
          q: `Why does the toolkit use <code>(now() AT TIME ZONE 'America/Toronto')::date</code> instead of <code>CURRENT_DATE</code>?`,
          options: [`<code>CURRENT_DATE</code> depends on the session's time zone, which differs between DBeaver, Java and the server`, `<code>CURRENT_DATE</code> does not exist in PostgreSQL`, `<code>CURRENT_DATE</code> returns a timestamp`, `It is faster`],
          answer: 0,
          explain: `Ice HR's rules use the date in Toronto. Converting <code>now()</code> to Toronto time gives the same "today" as <code>GET /api/v1/health</code>, whatever machine runs the query.`,
        },
        {
          q: `Your API-against-SQL test fails with "expected: 14L but was: 14". What is the fix?`,
          options: [`Add <code>::text</code> to the SQL`, `Reset the database`, `Convert both values to the same type (for example <code>long</code>) before comparing`, `Use <code>Db.writer()</code>`],
          answer: 2,
          explain: `The JSON value is an <code>Integer</code> and <code>COUNT</code> gives a <code>Long</code>. They print the same but are not equal objects. Convert both, as <code>asLong</code> does in <code>ApiVsSqlTest</code>.`,
        },
      ],
    },
  ],
});
