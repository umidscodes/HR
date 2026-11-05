# Ice HR starter test project

API tests (REST Assured) and database tests (JDBC) for [Ice HR](../README.md), in one small Maven project.
It is where you write your own tests while you follow the tutorials (http://localhost:8080/tutorials/).

- Java 17 or newer, JUnit 5, REST Assured 5, Jackson, AssertJ, the PostgreSQL JDBC driver
- 23 example tests that pass against a freshly started Ice HR
- The normal run leaves your data as it found it: tests delete what they create, and never reset unless you ask

## 1. Prerequisites

| Tool | Version | Check |
| --- | --- | --- |
| JDK | 17 or 21 (Temurin, Microsoft or Oracle builds are all fine) | `java -version` |
| Maven | 3.9 or newer | `mvn -v` |
| Ice HR | running | open http://localhost:8080/api/v1/health and see `"status":"UP"` |

Start Ice HR from the repository root with `npm run dev` (see the main README). The tests use its API on port 8080 and its database on port 5434.

**IntelliJ IDEA** (Community is enough):
1. *File, Open*, pick the `starter` folder (the one with `pom.xml`), and choose *Open as Project*. IntelliJ imports it as a Maven project.
2. *File, Project Structure, Project*: set the SDK to your JDK 17 or 21.
3. Run a test with the green arrow next to the class or method.
4. The Maven tool window (right edge) has *Lifecycle, test* if you prefer clicking to typing.

## 2. Run the tests

All commands run in the `starter` folder.

```bash
mvn test                                   # every test except @Tag("destructive")
mvn test -Dgroups=api                      # only API tests (or: db)
mvn test -Dtest=EmployeesApiTest           # one class
mvn test -Dtest="EmployeesApiTest#salary*" # matching methods of one class
mvn test -DbaseUrl=http://localhost:8081   # Ice HR on another port
mvn test -Dgroups=destructive -DexcludedGroups=   # only the reset test (resets ALL data)
```

**Windows PowerShell** splits `-Dname=value` unless you quote it. Quote every `-D` flag:

```powershell
mvn test "-Dgroups=api"
mvn test "-Dgroups=destructive" "-DexcludedGroups="
```

Command Prompt (cmd.exe) and Git Bash do not need the quotes.

**Tags:**

| Tag | Meaning |
| --- | --- |
| `api` | Talks to the REST API |
| `db` | Reads (or writes) the database over JDBC |
| `destructive` | Resets all data. Skipped unless you run it on purpose. |

Results: the console, and `target/surefire-reports` (one text and one XML file per test class).

## 3. Project map

```
starter/
  pom.xml                                  dependencies and the test runner
  src/test/java/com/icehr/
    config/Config.java                     reads config/local.properties (-Dkey=value overrides any key)
    api/Specs.java                         shared request/response specifications: Specs.api(), Specs.ok(), Specs.problem(422, "CODE")
    model/                                 Java records for the JSON: Employee, NewEmployee, Department, LeaveRequest, Problem, Page<T>
    db/Db.java                             JDBC helper: Db.reader() (qa_reader) and Db.writer() (qa_writer)
    support/TestData.java                  unique emails, today in Toronto, future Mondays for leave
    support/Json.java                      the Jackson setup (dates as "2026-11-05")
    tests/
      HealthApiTest.java                   start here: the smallest possible tests
      JobsApiTest.java                     status, JSON paths, arrays, a 404 problem
      EmployeesApiTest.java                read into records, paging, POST + cleanup, validation, boundary values, 409
      LeaveRequestFlowTest.java            a chained flow: hire, request leave, approve, check the balance
      DbSmokeTest.java                     first SQL checks over JDBC
      ApiAndDbTest.java                    act through the API, check in the database (and the other way round)
      ResetTest.java                       tagged destructive
  src/test/resources/
    config/local.properties                base URL and database settings
    schemas/employee.json                  JSON schema used by EmployeesApiTest
    junit-platform.properties              readable test names
```

## 4. Settings

`src/test/resources/config/local.properties`:

| Key | Default | Meaning |
| --- | --- | --- |
| `baseUrl` | `http://localhost:8080` | Ice HR. The API is under `/api/v1`. |
| `jdbcUrl` | `jdbc:postgresql://localhost:5434/icehr` | The database |
| `dbUser` / `dbPassword` | `qa_reader` / `qa_reader` | Read-only user, for checks |
| `dbWriterUser` / `dbWriterPassword` | `qa_writer` / `qa_writer` | Read-write user, for test setup and cleanup |

Override any key for one run with `-Dkey=value`, for example `mvn test -DbaseUrl=http://localhost:8081`.

## 5. Writing good tests here

- **One behaviour per test**, named as a sentence: `salary_below_the_range_is_rejected`.
- **Assert on `code`** in error responses (`SALARY_OUT_OF_RANGE`), not on the `detail` text.
- **Create your own data** and delete it in `@AfterEach` or `finally`. Use `TestData.uniqueEmail()` so two runs never clash.
- **Build dates from today**: `TestData.futureMonday(2)` instead of `"2026-12-07"`. Fixed future dates become past dates.
- **Read-only checks use `Db.reader()`**; only setup and cleanup use `Db.writer()`.
- **Know the expected result before you run the test.** It comes from the README's business rules, not from what the app happens to return.

## 6. Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `Connection refused` on port 8080 | Ice HR is not running. Run `npm run dev` in the repository root. |
| `Connection refused` on port 5434 / `PSQLException` | Same: the database starts with Ice HR. |
| `expected 201 but was 409 EMAIL_TAKEN` | The email is already used. Use `TestData.uniqueEmail()`. |
| `422 START_DATE_IN_PAST` in a leave test | A fixed date is now in the past. Use `TestData.futureMonday(...)`. |
| `415 Unsupported Media Type` | The request has a body but no `Content-Type: application/json`. Use `Specs.api()` or `.contentType(ContentType.JSON)`. |
| Counts are off (e.g. 61 employees) | A test (or you, in Swagger) left data behind. Reset: `POST /api/v1/reset` or `npm run reset`. |
| `Cannot deserialize value of type LocalDate` | You used `new ObjectMapper()` yourself. Use `Json.MAPPER`, or let `Specs.api()` do it. |
| IntelliJ shows red imports | Maven tool window, *Reload All Maven Projects*. |
