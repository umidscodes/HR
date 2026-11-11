/* Tutorial 2: API testing with REST Assured. Every Java example compiles in the starter project (package com.icehr.tests)
   and passes against a freshly reset Ice HR; numbers, ids, messages and codes match the README seed and src/api. */
(window.ICEHR = window.ICEHR || { tutorials: [] }).tutorials.push({
  id: "rest-assured",
  number: 2,
  title: "API testing with REST Assured",
  summary: "Write, run and understand Java API tests for Ice HR with REST Assured and JUnit 5, from your first GET to a full leave-request flow.",
  intro: `
<p>This tutorial is your main material for the first two weeks. You will write real API tests in Java against <strong>Ice HR</strong>, a small HR system built
only as a practice target. It has no login, no tokens and no keys, so you can focus on the testing itself.</p>
<p>By the end you will be able to:</p>
<ul>
<li>send GET, POST, PUT, PATCH and DELETE requests with REST Assured and check the status, the headers and the JSON body;</li>
<li>test error responses (400, 404, 405, 409, 415, 422) by their stable <code>code</code>, not by their wording;</li>
<li>use the README's business rules to design boundary-value and equivalence tests, with JUnit 5 parameterized tests;</li>
<li>read JSON into Java records, validate it against a JSON schema, and chain requests into an end-to-end flow;</li>
<li>keep your tests independent and repeatable, so they pass today, tomorrow and on a teammate's PC.</li>
</ul>
<p><strong>What you need running:</strong> Ice HR at <a href="http://localhost:8080" target="_blank" rel="noopener">http://localhost:8080</a> (<code>npm run dev</code> in the
Ice HR folder) and the <strong>starter project</strong> in the <code>starter/</code> folder, opened in IntelliJ IDEA. The starter already has REST Assured 5.5.7,
JUnit 5, Jackson, AssertJ and the JSON schema validator, plus helper classes (<code>Specs</code>, <code>TestData</code>, <code>NewEmployee</code>, <code>Employee</code>,
<code>Page</code>, <code>Problem</code>…). Every lesson builds on those classes, and every example is a complete test class you can paste into
<code>starter/src/test/java/com/icehr/tests/</code> and run.</p>
<div class="callout rule"><p><strong>Keep two things open in another tab:</strong> <a href="http://localhost:8080/swagger" target="_blank" rel="noopener">Swagger</a>
(every endpoint, every body, an example of every error) and the Ice HR <strong>README, section 5</strong> (the business rules). Section 5 is your <em>test oracle</em>: it tells
you the correct answer before you send the request.</p></div>
<p>Commands are shown for Windows. In <strong>PowerShell</strong>, put quotes around every <code>-D</code> flag, for example <code>mvn test "-Dtest=HealthApiTest"</code>.
In Command Prompt or Git Bash the quotes are not needed. For <code>curl</code> in PowerShell, type <code>curl.exe</code>.</p>`,
  lessons: [
    // ------------------------------------------------------------------------------------------
    {
      id: "first-test",
      title: "Your first API test",
      summary: "What REST Assured is, how to open and run the starter project, and how to read a given / when / then test and its failures.",
      links: [
        { label: "Health check in the browser", href: "http://localhost:8080/api/v1/health" },
        { label: "REST Assured usage guide", href: "https://github.com/rest-assured/rest-assured/wiki/Usage" },
      ],
      body: `
<p>An <strong>API test</strong> sends an HTTP request straight to the server and checks the response. There is no browser and no clicking. That makes API tests
fast (milliseconds, not seconds) and stable (no waiting for pages to load). When you clicked <em>Save</em> in a web page with Selenium, the page itself sent such a request.
Now your test sends it.</p>
<p><strong>REST Assured</strong> is a Java library for exactly this. It lets you write a request and its checks as one readable chain of method calls. It does not run tests by
itself: <strong>JUnit 5</strong> runs them (the <code>@Test</code> methods you know from Selenium), and REST Assured does the HTTP work inside each test. The checks
use <strong>Hamcrest matchers</strong> such as <code>equalTo(…)</code>, which come with REST Assured.</p>

<h3>Before you start</h3>
<ol>
<li><strong>Ice HR is running.</strong> In the Ice HR folder run <code>npm run dev</code> and leave that window open. Open
<a href="http://localhost:8080/api/v1/health" target="_blank" rel="noopener">http://localhost:8080/api/v1/health</a> in the browser: you should see
<code>{"status":"UP","database":"UP","today":"…"}</code>.</li>
<li><strong>Java and Maven.</strong> In a terminal, <code>java -version</code> must show 17 or newer and <code>mvn -v</code> must work. (IntelliJ can also run Maven for you.)</li>
<li><strong>Open the starter in IntelliJ.</strong> <em>File → Open</em>, select the <code>starter</code> folder (the one with <code>pom.xml</code> in it), then <em>Trust Project</em>.
IntelliJ reads <code>pom.xml</code> and downloads the libraries; watch the progress bar at the bottom. If imports stay red, open the <em>Maven</em> tool window (right edge)
and click <em>Reload All Maven Projects</em>. Check <em>File → Project Structure → SDK</em> is a JDK 17 or 21.</li>
</ol>

<h3>What is in the starter</h3>
<div class="table-wrap"><table>
<thead><tr><th>Folder (under <code>src/test/java/com/icehr</code>)</th><th>What it holds</th></tr></thead>
<tbody>
<tr><td><code>api/Specs.java</code></td><td>Shared settings for every request (base URL, <code>/api/v1</code>, JSON headers, logging) and common response checks. Lesson 9.</td></tr>
<tr><td><code>config/Config.java</code></td><td>Reads <code>src/test/resources/config/local.properties</code> (<code>baseUrl=http://localhost:8080</code>, database settings).</td></tr>
<tr><td><code>model/</code></td><td>Java records for JSON bodies: <code>Employee</code>, <code>NewEmployee</code>, <code>Department</code>, <code>LeaveRequest</code>, <code>Page</code>, <code>Problem</code>. Lesson 10.</td></tr>
<tr><td><code>support/</code></td><td><code>TestData</code> (unique emails, dates from today in Toronto) and <code>Json</code> (the Jackson setup).</td></tr>
<tr><td><code>db/Db.java</code></td><td>A small JDBC helper for the database tutorial.</td></tr>
<tr><td><code>tests/</code></td><td>Example tests. <strong>Your own test classes go here too.</strong></td></tr>
</tbody></table></div>

<h3>Running tests</h3>
<p>Open a terminal <em>in the starter folder</em> (IntelliJ: <em>View → Tool Windows → Terminal</em>) and run <code>mvn test</code>. Maven compiles the tests, then the
<em>Surefire</em> plugin finds every class whose name ends in <code>Test</code> and runs it with JUnit. At the end you see a summary like
<code>Tests run: 23, Failures: 0, Errors: 0, Skipped: 0</code> and <code>BUILD SUCCESS</code>. The <code>ResetTest</code> class is not run: it is tagged
<code>destructive</code> because it resets all data (lesson 13).</p>
<p>To run less: <code>mvn test -Dtest=HealthApiTest</code> runs one class and <code>mvn test -Dtest=HealthApiTest#ice_hr_is_up</code> runs one method.
In IntelliJ, click the green triangle next to a class or a method name. That is the fastest loop while you write a test.</p>

<h3>Anatomy: given / when / then</h3>
<p>Open <code>tests/HealthApiTest.java</code>. Its first test reads like a sentence:</p>
<ul>
<li><code>given()</code> starts the <strong>request</strong>: everything you set up before sending. Here only <code>.baseUri("http://localhost:8080")</code>. Later: headers,
query parameters, a body.</li>
<li><code>.when().get("/api/v1/health")</code> is the <strong>action</strong>. The request is sent at this moment: <code>GET http://localhost:8080/api/v1/health</code>.</li>
<li><code>.then()</code> switches to the <strong>response</strong>. Each following line is a check. <code>.statusCode(200)</code> checks the status code.
<code>.body("status", equalTo("UP"))</code> reads the field <code>status</code> from the JSON body and checks it with the matcher <code>equalTo("UP")</code>.</li>
</ul>
<p><code>given()</code>, <code>when()</code> and <code>then()</code> are only there to make the test easy to read; the line breaks and indentation are a convention. The second
test does the same with <code>.spec(Specs.api())</code>, which adds the base URL from the config file, the <code>/api/v1</code> base path and JSON headers in one call.
From now on every example uses <code>Specs.api()</code>, so the paths are short (<code>"/jobs/4"</code>) and <code>mvn test -DbaseUrl=http://localhost:8081</code>
points all of them at another port. The first health test keeps its hard-coded URL on purpose, as the smallest possible example.</p>

<h3>Worked example: job 4</h3>
<p>Ice HR has 15 jobs. Job 4 is the Software Engineer. In the browser, <a href="http://localhost:8080/api/v1/jobs/4" target="_blank" rel="noopener">/api/v1/jobs/4</a> returns:</p>
<pre><code>{"id":4,"title":"Software Engineer","minSalary":80000,"maxSalary":115000}</code></pre>
<p>A test for it needs three decisions: the request (<code>GET /jobs/4</code>), the expected status (<code>200</code>) and the facts that matter
(<code>title</code> is <code>"Software Engineer"</code>). See <code>MyFirstApiTest</code> in the examples. Create it in <code>src/test/java/com/icehr/tests</code>,
run it, and watch it pass. Then make it fail on purpose.</p>

<h3>Reading a failure</h3>
<p>JUnit reports two kinds of red:</p>
<ul>
<li>A <strong>failure</strong> means a check did not hold. REST Assured tells you which one: <code>JSON path title doesn't match. Expected: Software Tester Actual: Software Engineer</code>.
Either the app has a bug or your expectation is wrong. Check the README before you decide.</li>
<li>An <strong>error</strong> means the test crashed before it could check anything. The most common one is <code>Connection refused</code>: Ice HR is not running, or it runs
on another port.</li>
</ul>
<p>Read a failure from the top: the test name and line number (<code>MyFirstApiTest.job_4_is_software_engineer:22</code>), then the <em>Expected</em> and
<em>Actual</em> lines. Because <code>Specs.api()</code> turns on "log if validation fails", the console also shows the whole request and response just above the error.
That printout is usually enough to see what went wrong.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Running <code>mvn test</code> in the wrong folder. Maven says <em>"there is no POM in this directory"</em>. Change into <code>starter</code> first.</li>
<li>Naming a class <code>FirstChecks</code>. Surefire only runs classes whose names end in <code>Test</code>, <code>Tests</code> or <code>TestCase</code> (or start with <code>Test</code>).
The class compiles and is silently ignored.</li>
<li>Missing static imports. <code>given</code> comes from <code>io.restassured.RestAssured</code> and <code>equalTo</code> from <code>org.hamcrest.Matchers</code>.
In IntelliJ, put the cursor on the red word and press <em>Alt+Enter</em>.</li>
<li>Forgetting that Ice HR must be running. Every API test needs it.</li>
<li>Editing the expected value until the test turns green. A red test is information: first find out whether the app or the test is wrong.</li>
</ul></div>`,
      examples: [
        {
          title: "Run the tests from a terminal (in the starter folder)",
          lang: "powershell",
          code: `
# everything except @Tag("destructive")
mvn test

# one class, then one method (PowerShell: keep the quotes)
mvn test "-Dtest=HealthApiTest"
mvn test "-Dtest=HealthApiTest#ice_hr_is_up"

# only tests tagged "api"
mvn test "-Dgroups=api"

# Ice HR on another port
mvn test "-DbaseUrl=http://localhost:8081"`,
        },
        {
          title: "starter/src/test/java/com/icehr/tests/HealthApiTest.java (already in the starter)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.matchesPattern;

/** The smallest possible API tests. Start reading here. */
@Tag("api")
class HealthApiTest {

    @Test
    void ice_hr_is_up() {
        // given: what we send  /  when: the call  /  then: what we expect back.
        // The URL is written out here to show every part; real tests use Specs.api() (next test),
        // so -DbaseUrl=... can point them somewhere else.
        given()
                .baseUri("http://localhost:8080")
        .when()
                .get("/api/v1/health")
        .then()
                .statusCode(200)
                .body("status", equalTo("UP"))
                .body("database", equalTo("UP"));
    }

    @Test
    void health_reports_today_as_a_date() {
        // The same check with the shared specification: no base URL or path in the test.
        given()
                .spec(Specs.api())
        .when()
                .get("/health")
        .then()
                .spec(Specs.ok())
                .body("today", matchesPattern("\\\\d{4}-\\\\d{2}-\\\\d{2}"));
    }
}`,
        },
        {
          title: "Your first test class: src/test/java/com/icehr/tests/MyFirstApiTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/** My first API tests: one GET each, written as given / when / then. */
@Tag("api")
class MyFirstApiTest {

    @Test
    void job_4_is_software_engineer() {
        given()
                .spec(Specs.api())          // base URL, /api/v1 and JSON headers
        .when()
                .get("/jobs/4")             // the call: GET http://localhost:8080/api/v1/jobs/4
        .then()
                .statusCode(200)            // what we expect back
                .body("title", equalTo("Software Engineer"));
    }

    @Test
    void employee_13_is_ethan_nguyen() {
        given().spec(Specs.api())
        .when().get("/employees/13")
        .then().statusCode(200)
                .body("firstName", equalTo("Ethan"))
                .body("lastName", equalTo("Nguyen"))
                .body("email", equalTo("ethan.nguyen@icehr.test"));
    }
}`,
        },
        {
          title: "What a failure looks like (title changed to \"Software Tester\" on purpose)",
          lang: "text",
          code: `
[ERROR] Tests run: 2, Failures: 1, Errors: 0, Skipped: 0 <<< FAILURE! -- in com.icehr.tests.MyFirstApiTest
[ERROR] com.icehr.tests.MyFirstApiTest.job_4_is_software_engineer <<< FAILURE!
java.lang.AssertionError:
1 expectation failed.
JSON path title doesn't match.
Expected: Software Tester
  Actual: Software Engineer

... and when Ice HR is not running, an ERROR instead of a FAILURE:
[ERROR]   MyFirstApiTest.job_4_is_software_engineer:19 » Connect Connection refused`,
          note: `Above the failure, the console also prints the full request and response, because <code>Specs.api()</code> logs them when a check fails.`,
        },
      ],
      exercises: [
        `Start Ice HR, open <code>http://localhost:8080/api/v1/health</code> in the browser and write down the value of <code>today</code>. Explain in one sentence why Ice HR reports a date at all (hint: README section 5).`,
        `Open the starter in IntelliJ and run <code>mvn test</code> in its folder. Write down how many tests ran, how many were skipped, and which test class did not run at all and why.`,
        `Run only <code>HealthApiTest</code>, first with the green triangle in IntelliJ, then from the terminal with <code>-Dtest</code>. Then run only the method <code>health_reports_today_as_a_date</code>.`,
        `Create <code>MyFirstApiTest</code> from the example and add a third test: job 8 is <em>HR Manager</em> with <code>minSalary</code> 90000 and <code>maxSalary</code> 130000.`,
        `Break one check on purpose and run the test. Copy the <em>Expected</em> and <em>Actual</em> lines into your notes. Then stop Ice HR (Ctrl+C), run again, and note how an <em>error</em> looks different from a <em>failure</em>. Start Ice HR again.`,
      ],
      quiz: [
        {
          q: `In <code>given().spec(Specs.api()).when().get("/jobs/4").then().statusCode(200)</code>, when is the HTTP request sent?`,
          options: [`When <code>given()</code> is called`, `When <code>get("/jobs/4")</code> is called`, `When <code>then()</code> is called`, `When <code>statusCode(200)</code> is checked`],
          answer: 1,
          explain: `Everything before <code>get(…)</code> only prepares the request. <code>get</code> sends it and returns the response; <code>then()</code> starts the checks on that response.`,
        },
        {
          q: `The summary says <code>Tests run: 2, Failures: 0, Errors: 1</code>. What is the most likely cause?`,
          options: [`A check found a wrong value in the response`, `JUnit skipped one test`, `One test passed with a warning`, `A test threw an exception before checking anything, for example <code>Connection refused</code> because Ice HR is not running`],
          answer: 3,
          explain: `A <em>failure</em> is a check that did not hold. An <em>error</em> is an exception: no response to check at all. <code>Connection refused</code> means nothing listens on that port.`,
        },
        {
          q: `You run Ice HR on port 8081 and start <code>mvn test -DbaseUrl=http://localhost:8081</code>. Which test in <code>HealthApiTest</code> still calls port 8080?`,
          options: [`<code>ice_hr_is_up</code>, because it sets <code>baseUri("http://localhost:8080")</code> itself`, `<code>health_reports_today_as_a_date</code>`, `Both`, `Neither: <code>-DbaseUrl</code> changes every request`],
          answer: 0,
          explain: `<code>-DbaseUrl</code> is read by <code>Config</code>, which <code>Specs.api()</code> uses. A test that hard-codes its own <code>baseUri</code> ignores it. That is why your tests should use <code>Specs.api()</code>.`,
        },
        {
          q: `You add <code>FirstChecks.java</code> with two <code>@Test</code> methods to the tests folder. <code>mvn test</code> does not run them. Why?`,
          options: [`The class has no <code>@Tag("api")</code>`, `The class is not <code>public</code>`, `Surefire only picks up classes whose names end in <code>Test</code>, <code>Tests</code> or <code>TestCase</code> (or start with <code>Test</code>): rename it to <code>FirstChecksTest</code>`, `Test methods must be <code>static</code>`],
          answer: 2,
          explain: `Tags only matter when you filter with <code>-Dgroups</code>, and JUnit 5 does not need public classes or methods. The file name pattern is what Maven Surefire looks for.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "status-headers",
      title: "Status codes and headers",
      summary: "Check the status code and the important headers: Content-Type, Location on 201, Allow on 405 and X-Request-Id on every response.",
      body: `
<p>Every HTTP response has three parts: a <strong>status line</strong> (<code>HTTP/1.1 201 Created</code>), <strong>headers</strong> (name: value lines with extra
information) and an optional <strong>body</strong> (the JSON). A good API test checks all three, starting with the status code, because it is the server's one-word
summary of what happened.</p>

<h3>Status codes in Ice HR</h3>
<p>The first digit gives the family: <strong>2xx</strong> worked, <strong>4xx</strong> the client (your test) sent something the server refuses, <strong>5xx</strong>
the server broke. Ice HR uses exactly these (README section 4):</p>
<div class="table-wrap"><table>
<thead><tr><th>Code</th><th>Meaning in Ice HR</th><th>Example request</th></tr></thead>
<tbody>
<tr><td><code>200</code> OK</td><td>Read, update, approve, reject, cancel, terminate, reset worked</td><td><code>GET /employees/13</code></td></tr>
<tr><td><code>201</code> Created</td><td>A POST created a record; <code>Location</code> header points to it</td><td><code>POST /departments</code></td></tr>
<tr><td><code>204</code> No Content</td><td>Deleted; there is no body at all</td><td><code>DELETE /departments/1001</code></td></tr>
<tr><td><code>400</code> Bad Request</td><td>The request itself is wrong: invalid field, bad id in the URL, bad query parameter, malformed JSON, no body</td><td><code>GET /employees/abc</code></td></tr>
<tr><td><code>404</code> Not Found</td><td>No record with that id, or no such endpoint</td><td><code>GET /employees/999</code></td></tr>
<tr><td><code>405</code> Method Not Allowed</td><td>The path exists, but not with this method; <code>Allow</code> lists the right ones</td><td><code>DELETE /jobs/4</code></td></tr>
<tr><td><code>409</code> Conflict</td><td>Clashes with existing data: duplicate, wrong state, still referenced</td><td><code>DELETE /employees/9</code> (Aisha has 5 reports)</td></tr>
<tr><td><code>415</code> Unsupported Media Type</td><td>A body was sent without <code>Content-Type: application/json</code></td><td>lesson 7</td></tr>
<tr><td><code>422</code> Unprocessable Entity</td><td>Well-formed, but breaks a business rule</td><td>salary 30000 for a Software Engineer</td></tr>
<tr><td><code>500</code></td><td>A bug. Should never happen; report it with the <code>X-Request-Id</code></td><td>none, we hope</td></tr>
</tbody></table></div>

<h3>Checking status and headers in REST Assured</h3>
<ul>
<li><code>.statusCode(201)</code> checks the number. <code>.statusLine(containsString("Created"))</code> checks the whole line, but the number is enough.</li>
<li><code>.contentType(ContentType.JSON)</code> checks the <code>Content-Type</code> header. Ice HR sends exactly <code>application/json</code>, but the check would also accept <code>application/json; charset=utf-8</code>, as many other APIs send (the charset part is ignored).
It also accepts <code>application/problem+json</code>, because that is JSON too. To be sure you got an <em>error body</em>, use
<code>.contentType("application/problem+json")</code> or check the <code>code</code> field.</li>
<li><code>.header("Allow", equalTo("GET, HEAD"))</code> checks any header. Header <em>names</em> are not case-sensitive (<code>allow</code> works too); the <em>values</em> are.</li>
<li>To use a header value in Java: <code>Response r = …post(…);</code> then <code>r.header("Location")</code>.</li>
</ul>

<h3>Headers worth knowing in Ice HR</h3>
<ul>
<li><strong><code>Location</code></strong> on every 201: the path of the new record, for example <code>/api/v1/departments/1001</code>. It is a path, not a full URL.</li>
<li><strong><code>Allow</code></strong> on every 405: the methods this path supports, for example <code>GET, POST, HEAD</code> for <code>/employees</code>.</li>
<li><strong><code>X-Request-Id</code></strong> on <em>every</em> response: a unique id for that call. If you send your own (letters, digits, <code>.</code>, <code>_</code>, <code>-</code>,
up to 100 characters), Ice HR echoes it back. A tester quotes this id in a bug report so a developer can find the call in the logs.</li>
<li><strong><code>Cache-Control: no-store</code></strong> on API responses: browsers must not cache them.</li>
</ul>

<h3>Worked example: create, then delete</h3>
<ol>
<li><code>POST /api/v1/departments</code> with <code>{"name":"Lesson 2 3f9a1c2b","code":"QWERT","location":"Toronto"}</code>.</li>
<li>Response: <code>201 Created</code>, <code>Location: /api/v1/departments/1001</code> (1001 right after a reset; higher later), and the new department in the body with
<code>"id": 1001</code>. The Location and the id must agree: that is a check worth writing.</li>
<li><code>DELETE /api/v1/departments/1001</code> returns <code>204</code> and an empty body. Asserting anything about a JSON body here fails, because there is none.</li>
<li><code>GET</code> or <code>DELETE</code> the same id again: <code>404</code> with code <code>NOT_FOUND</code>.</li>
</ol>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Checking only the status code. A <code>200</code> with the wrong employee in the body still passes. Always check at least one fact from the body too.</li>
<li>Expecting <code>200</code> from a POST that creates something. Ice HR answers <code>201</code>.</li>
<li>Comparing <code>Location</code> to a full URL with <code>http://localhost:8080</code>. Ice HR sends only the path.</li>
<li>Treating <code>409</code> and <code>422</code> as the same. Lesson 8 shows the difference, and your bug reports should name the exact code.</li>
<li>Calling a <code>500</code> "expected". It is never correct. Write the bug report with the request, the response and the <code>X-Request-Id</code>.</li>
</ul></div>`,
      examples: [
        {
          title: "StatusAndHeadersTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Random;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.emptyString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.not;

@Tag("api")
class StatusAndHeadersTest {

    @Test
    void a_get_returns_200_json_and_a_request_id() {
        given().spec(Specs.api())
        .when().get("/departments/3")
        .then()
                .statusCode(200)
                .contentType(ContentType.JSON)
                .header("X-Request-Id", not(emptyOrNullString()))
                .header("Cache-Control", equalTo("no-store"));
    }

    @Test
    void your_own_request_id_is_echoed_back() {
        given().spec(Specs.api())
                .header("X-Request-Id", "lesson-2-test-001")
        .when().get("/jobs/1")
        .then()
                .statusCode(200)
                .header("X-Request-Id", equalTo("lesson-2-test-001"));
    }

    @Test
    void an_unknown_employee_is_404_with_problem_json() {
        given().spec(Specs.api())
        .when().get("/employees/999")
        .then()
                .statusCode(404)
                .contentType("application/problem+json")
                .body("code", equalTo("NOT_FOUND"));
    }

    @Test
    void delete_on_a_job_is_405_and_allow_lists_the_right_methods() {
        given().spec(Specs.api())
        .when().delete("/jobs/4")
        .then()
                .statusCode(405)
                .header("Allow", equalTo("GET, HEAD"));
    }

    @Test
    void create_gives_201_with_a_location_and_delete_gives_204() {
        Response response = given().spec(Specs.api())
                .body(Map.of(
                        "name", "Lesson 2 " + UUID.randomUUID().toString().substring(0, 8),
                        "code", randomCode(),
                        "location", "Toronto"))
        .when().post("/departments");

        response.then()
                .statusCode(201)
                .header("Location", matchesPattern("/api/v1/departments/\\\\d+"));
        int id = response.path("id");
        assertThat(response.header("Location")).isEqualTo("/api/v1/departments/" + id);

        given().spec(Specs.api())
        .when().delete("/departments/{id}", id)
        .then()
                .statusCode(204)
                .body(emptyString());
    }

    /** 5 random letters A to Z: a valid, almost certainly unused department code. */
    private static String randomCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            code.append((char) ('A' + random.nextInt(26)));
        }
        return code.toString();
    }
}`,
        },
        {
          title: "The same 405 seen with curl -i (Git Bash; curl.exe in PowerShell)",
          lang: "http",
          code: `
$ curl -i -X DELETE http://localhost:8080/api/v1/jobs/4

HTTP/1.1 405 Method Not Allowed
X-Request-Id: 22099077-db02-41a4-8fa6-263225e75d45
Cache-Control: no-store
Allow: GET, HEAD
Content-Type: application/problem+json

{"type":"https://icehr.test/problems/method-not-allowed","title":"Method Not Allowed","status":405,
 "detail":"DELETE is not supported here. Allowed: GET, HEAD.","instance":"/api/v1/jobs/4","code":"METHOD_NOT_ALLOWED"}`,
        },
        {
          title: "Reading headers into Java variables",
          lang: "java",
          code: `
Response response = given().spec(Specs.api())
        .header("X-Request-Id", "my-run-007")
        .when().get("/departments/9");

String requestId = response.header("X-Request-Id");      // "my-run-007"
String contentType = response.contentType();             // "application/json"
int status = response.statusCode();                      // 200
System.out.println(response.headers());                  // every header, one per line`,
          note: `A fragment to paste inside a test method; it needs <code>import io.restassured.response.Response;</code>.`,
        },
      ],
      exercises: [
        `Write a test for <code>GET /api/v1/departments</code>: status 200, JSON content type, a non-empty <code>X-Request-Id</code> and <code>Cache-Control: no-store</code>.`,
        `For every status code in the table except 500, find one Ice HR request that produces it. Try each in Swagger or with curl, write the request and the status in your notes, then turn three of them into tests.`,
        `Send <code>PATCH /api/v1/jobs/4</code> with any JSON body. Check the status and the exact <code>Allow</code> header.`,
        `Send an <code>X-Request-Id</code> that breaks the rules (a space in it, or 101 characters). Find out what Ice HR sends back in the <code>X-Request-Id</code> header and write a test for what you observe.`,
        `Create a department, assert that <code>Location</code> ends with the <code>id</code> from the body, delete it (204), then show that a second DELETE gives 404.`,
      ],
      quiz: [
        {
          q: `Your test creates a department with <code>POST /api/v1/departments</code>. What should it expect?`,
          options: [`200 and a <code>Location</code> header`, `204 and no body`, `201, a <code>Location</code> header like <code>/api/v1/departments/1001</code>, and the new department in the body`, `201 and no headers`],
          answer: 2,
          explain: `README section 4: a POST that creates something returns 201 with a <code>Location</code> header and the new record in the body.`,
        },
        {
          q: `What does <code>DELETE /api/v1/jobs/4</code> return?`,
          options: [`405 with <code>Allow: GET, HEAD</code>, because jobs can only be read`, `404, because jobs cannot be found by DELETE`, `204`, `409, because employees use job 4`],
          answer: 0,
          explain: `The path exists but not with this method, so it is 405. The <code>Allow</code> header tells you which methods are supported.`,
        },
        {
          q: `You send <code>X-Request-Id: run-42</code> with a GET. What comes back in the response's <code>X-Request-Id</code>?`,
          options: [`A new random UUID`, `Nothing: the header is only for errors`, `A 400, because the id must be a UUID`, `<code>run-42</code>`],
          answer: 3,
          explain: `A valid id you send is echoed back, so you can find your test's calls. If you send none, Ice HR makes one up.`,
        },
        {
          q: `A test for <code>GET /employees/13</code> checks only <code>statusCode(200)</code>. What is the risk?`,
          options: [`None: 200 means the data is right`, `It still passes if the body holds the wrong employee or a wrong salary`, `It fails, because REST Assured requires a body check`, `It fails when Ice HR returns 201`],
          answer: 1,
          explain: `The status code says the call worked, not that the data is correct. Add checks on the facts that matter, such as <code>firstName</code> and <code>salary</code>.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "json-responses",
      title: "Reading JSON responses",
      summary: "Pick values out of JSON with paths, check them with Hamcrest matchers, and extract them into Java variables.",
      links: [
        { label: "REST Assured: JSON paths (GPath)", href: "https://github.com/rest-assured/rest-assured/wiki/Usage#example-1---json" },
      ],
      body: `
<p>Most of what you check lives in the JSON body. JSON has only a few building blocks: an <strong>object</strong> <code>{ "name": value, … }</code>, an <strong>array</strong>
<code>[ value, … ]</code>, a <strong>string</strong> in double quotes, a <strong>number</strong>, <code>true</code>/<code>false</code> and <code>null</code>.
Ice HR answers with one object (one employee), a plain array (all jobs, all departments) or a <em>page</em> (an object with a <code>content</code> array, lesson 4).</p>

<h3>Paths</h3>
<p>In <code>.body("title", equalTo("Software Engineer"))</code>, the first argument is a <strong>path</strong>: where to look in the JSON. REST Assured uses
<strong>GPath</strong>, a path language from Groovy. The rules you need:</p>
<div class="table-wrap"><table>
<thead><tr><th>Path</th><th>Request</th><th>Result</th></tr></thead>
<tbody>
<tr><td><code>firstName</code></td><td><code>GET /employees/13</code></td><td><code>"Ethan"</code></td></tr>
<tr><td><code>$</code> (or an empty string)</td><td><code>GET /jobs</code></td><td>the whole body: the array of 15 jobs</td></tr>
<tr><td><code>[0].title</code></td><td><code>GET /jobs</code></td><td><code>"Chief Executive Officer"</code> (index starts at 0)</td></tr>
<tr><td><code>title</code></td><td><code>GET /jobs</code></td><td>a <em>list</em> of all 15 titles: a field name on an array collects it from every item</td></tr>
<tr><td><code>size()</code></td><td><code>GET /jobs</code></td><td><code>15</code></td></tr>
<tr><td><code>balances[0].remaining</code></td><td><code>GET /employees/23/leave-balance?year=2026</code></td><td><code>5</code></td></tr>
<tr><td><code>balances.type</code></td><td>same</td><td><code>["VACATION", "SICK", "PERSONAL"]</code></td></tr>
<tr><td><code>find { it.code == 'QA' }.location</code></td><td><code>GET /departments</code></td><td><code>"Montreal"</code>: the <em>first</em> item that matches</td></tr>
<tr><td><code>findAll { it.employeeCount == 0 }.name</code></td><td><code>GET /departments</code></td><td><code>["Research Lab"]</code>: <em>every</em> item that matches, as a list</td></tr>
<tr><td><code>collect { it.code.toLowerCase() }</code></td><td><code>GET /departments</code></td><td><code>["exec", "eng", …]</code>: a new list built from each item</td></tr>
</tbody></table></div>
<p>Inside <code>{ … }</code>, <code>it</code> means "the current item", and strings use single quotes so they do not clash with the Java double quotes around the path.</p>

<h3>Matchers</h3>
<p>The second argument is a Hamcrest <strong>matcher</strong>: a small object that says whether a value is acceptable. Import them from <code>org.hamcrest.Matchers</code>.</p>
<div class="table-wrap"><table>
<thead><tr><th>Matcher</th><th>Passes when the value…</th></tr></thead>
<tbody>
<tr><td><code>equalTo(80000)</code></td><td>is exactly this (same type too: <code>80000</code> is not <code>"80000"</code>)</td></tr>
<tr><td><code>nullValue()</code>, <code>notNullValue()</code></td><td>is (not) <code>null</code></td></tr>
<tr><td><code>greaterThan(0)</code>, <code>lessThanOrEqualTo(115000)</code></td><td>compares as a number</td></tr>
<tr><td><code>hasSize(15)</code>, <code>empty()</code></td><td>is a list with that many items / no items</td></tr>
<tr><td><code>hasItem("QA Analyst")</code>, <code>hasItems(…)</code></td><td>is a list that contains these (other items allowed)</td></tr>
<tr><td><code>contains(13, 14, 15)</code></td><td>is a list with exactly these items in this order, and nothing else</td></tr>
<tr><td><code>everyItem(greaterThan(0))</code></td><td>is a list whose every item matches</td></tr>
<tr><td><code>matchesPattern("\\d{3}-\\d{3}-\\d{4}")</code>, <code>startsWith(…)</code></td><td>is a string of that shape (in Java source, write each backslash twice)</td></tr>
<tr><td><code>hasKey("terminationDate")</code></td><td>is an object that has this field</td></tr>
</tbody></table></div>
<p>JSON whole numbers arrive as Java <code>Integer</code>, so write <code>equalTo(80000)</code>, not <code>equalTo(80000L)</code>. (Numbers with a decimal point would arrive as
<code>Float</code>; Ice HR does not send any.)</p>

<h3>Worked example: Kevin's leave balance</h3>
<p>Kevin Singh (employee 23) has used 15 of his 20 vacation days in 2026. <code>GET /api/v1/employees/23/leave-balance?year=2026</code> returns:</p>
<pre><code>{"employeeId":23,"year":2026,"balances":[
  {"type":"VACATION","allowance":20,"used":15,"pending":0,"remaining":5},
  {"type":"SICK","allowance":10,"used":0,"pending":0,"remaining":10},
  {"type":"PERSONAL","allowance":3,"used":0,"pending":0,"remaining":3}]}</code></pre>
<ul>
<li><code>"balances[0].remaining"</code> is <code>5</code>. It relies on VACATION being first, which Ice HR guarantees today.</li>
<li><code>"balances.find { it.type == 'VACATION' }.remaining"</code> is also <code>5</code>, and it still works if the order ever changes. Prefer it.</li>
<li><code>"balances.remaining"</code> is the list <code>[5, 10, 3]</code>; check it with <code>contains(5, 10, 3)</code>.</li>
</ul>

<h3>Taking values out: extract()</h3>
<p>Sometimes you need a value in Java, to use it in the next request or to check it with AssertJ. After <code>then()</code>, call <code>.extract()</code>:</p>
<ul>
<li><code>.extract().path("email")</code> returns one value. Its type is whatever you assign it to: <code>String email = …</code>, <code>int id = …</code>.</li>
<li><code>.extract().jsonPath()</code> returns a <code>JsonPath</code> object; read many values from it with <code>getString</code>, <code>getInt</code> and
<code>getList("id", Integer.class)</code>.</li>
<li><code>.extract().response()</code> gives the whole response (status, headers and body).</li>
</ul>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li><code>.body("title", equalTo("QA Analyst"))</code> on <code>/jobs</code>. On an array, <code>title</code> is the list of all titles; use <code>hasItem</code>.</li>
<li>Using <code>contains</code> when you mean <code>hasItems</code>. <code>contains</code> wants the <em>whole</em> list, in order.</li>
<li>A typo in a path (<code>"termination_date"</code>) quietly gives <code>null</code>, so <code>nullValue()</code> passes for a field that does not exist. Use
<code>hasKey</code> when "the field is there and is null" matters.</li>
<li>Comparing a number with a string: <code>equalTo("80000")</code> fails against <code>80000</code>.</li>
<li>Using double quotes inside a GPath expression in Java. Write <code>find { it.code == 'QA' }</code>.</li>
</ul></div>`,
      examples: [
        {
          title: "JsonPathTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import io.restassured.path.json.JsonPath;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.List;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;

@Tag("api")
class JsonPathTest {

    @Test
    void simple_fields_of_one_object() {
        given().spec(Specs.api())
        .when().get("/employees/13")
        .then().statusCode(200)
                .body("id", equalTo(13))
                .body("salary", equalTo(80000))
                .body("salary", greaterThan(50000))
                .body("phone", equalTo("416-555-0113"))
                .body("terminationDate", nullValue())
                .body("$", hasKey("terminationDate"))   // the field is really there, with the value null
                .body("managerId", equalTo(9));
    }

    @Test
    void a_root_array() {
        given().spec(Specs.api())
        .when().get("/jobs")
        .then().statusCode(200)
                .body("$", hasSize(15))                              // the whole body is the array
                .body("[0].title", equalTo("Chief Executive Officer"))
                .body("title", hasItems("QA Analyst", "HR Manager"))  // every title in the array
                .body("minSalary", everyItem(greaterThan(0)))
                .body("find { it.id == 4 }.maxSalary", equalTo(115000))
                .body("findAll { it.minSalary >= 100000 }.title", hasSize(5));
    }

    @Test
    void nested_values_in_a_leave_balance() {
        given().spec(Specs.api())
                .queryParam("year", 2026)
        .when().get("/employees/23/leave-balance")
        .then().statusCode(200)
                .body("employeeId", equalTo(23))
                .body("balances", hasSize(3))
                .body("balances[0].type", equalTo("VACATION"))
                .body("balances[0].used", equalTo(15))
                .body("balances[0].remaining", equalTo(5))
                .body("balances.type", contains("VACATION", "SICK", "PERSONAL"))
                .body("balances.find { it.type == 'PERSONAL' }.allowance", equalTo(3));
    }

    @Test
    void find_findAll_and_collect_on_departments() {
        given().spec(Specs.api())
        .when().get("/departments")
        .then().statusCode(200)
                .body("find { it.code == 'QA' }.location", equalTo("Montreal"))
                .body("findAll { it.employeeCount == 0 }.name", hasItem("Research Lab"))
                .body("findAll { it.location == 'Toronto' }.code", hasItems("EXEC", "ENG", "PROD", "FIN"))
                .body("collect { it.code.toLowerCase() }", hasItem("lab"));
    }

    @Test
    void extract_values_to_use_them_in_java() {
        // One value
        String email = given().spec(Specs.api())
                .when().get("/employees/13")
                .then().statusCode(200)
                .extract().path("email");
        assertThat(email).isEqualTo("ethan.nguyen@icehr.test");

        // Several values from the same response
        JsonPath json = given().spec(Specs.api())
                .when().get("/employees/9/reports")
                .then().statusCode(200)
                .extract().jsonPath();
        List<Integer> ids = json.getList("id", Integer.class);
        assertThat(ids).containsExactly(13, 14, 15, 16, 17);
        assertThat(json.getString("[0].firstName")).isEqualTo("Ethan");
        assertThat(json.getInt("size()")).isEqualTo(5);
    }
}`,
        },
        {
          title: "Quick reference: one response, many paths (GET /api/v1/departments)",
          lang: "text",
          code: `
"size()"                                     -> 9 (more if you created departments)
"[8].code"                                   -> "LAB"
"code"                                       -> ["EXEC", "ENG", "QA", "PROD", "HR", "FIN", "SALES", "SUP", "LAB"]
"find { it.name == 'Sales' }.location"       -> "Vancouver"
"findAll { it.location == 'Toronto' }.code"  -> ["EXEC", "ENG", "PROD", "FIN"]
"max { it.employeeCount }.name"              -> "Engineering" (14 active employees)
"findAll { it.managerId == null }.code"      -> ["LAB"]`,
        },
      ],
      exercises: [
        `For Ethan Nguyen (13), check <code>jobId</code>, <code>departmentId</code>, <code>status</code>, that <code>terminationDate</code> exists and is null, and that <code>phone</code> matches the pattern <code>\\d{3}-\\d{3}-\\d{4}</code>.`,
        `On <code>GET /jobs</code>, use <code>find</code> to check the HR Manager's <code>minSalary</code>, and <code>findAll</code> plus <code>hasSize</code> to check how many jobs pay a maximum of more than 100000.`,
        `On <code>GET /departments</code>, check that every <code>code</code> matches <code>^[A-Z]{2,5}$</code> with <code>everyItem(matchesPattern(…))</code>, and that Sales is in Vancouver.`,
        `Fatima Haddad (16) has used all her vacation in 2026. Check her 2026 balance twice: once with an index path (<code>balances[0]…</code>) and once with <code>find</code>.`,
        `Extract the last names of Aisha's direct reports (<code>GET /employees/9/reports</code>) into a <code>List&lt;String&gt;</code> with <code>extract().jsonPath()</code>, print it, and check it with AssertJ.`,
      ],
      quiz: [
        {
          q: `On <code>GET /api/v1/jobs</code>, <code>.body("title", equalTo("QA Analyst"))</code> fails. Why?`,
          options: [`The field is called <code>name</code>, not <code>title</code>`, `Paths must start with <code>$.</code>`, `QA Analyst does not exist`, `On an array, <code>title</code> is the list of all 15 titles; check it with <code>hasItem("QA Analyst")</code>`],
          answer: 3,
          explain: `A field name applied to an array collects that field from every item. A list is never equal to one string.`,
        },
        {
          q: `Which path gives Kevin's remaining vacation days from <code>/employees/23/leave-balance</code>, whatever the order of the balances?`,
          options: [`<code>remaining</code>`, `<code>balances.find { it.type == 'VACATION' }.remaining</code>`, `<code>balances.VACATION.remaining</code>`, `<code>balances[type=VACATION].remaining</code>`],
          answer: 1,
          explain: `<code>find</code> picks the first item whose closure is true. <code>balances[0].remaining</code> also gives 5 today, but only because VACATION happens to come first.`,
        },
        {
          q: `Employee 13 has no field called <code>nickname</code>. What does <code>.body("nickname", nullValue())</code> do?`,
          options: [`It passes: a missing field reads as <code>null</code>`, `It fails with "no such path"`, `It throws an exception`, `It passes only after a reset`],
          answer: 0,
          explain: `That is why a typo in a path can make a null check pass. Use <code>.body("$", hasKey("terminationDate"))</code> to prove a field really exists.`,
        },
        {
          q: `<code>GET /employees</code> returns the first 20 employees. What happens with <code>.body("content.id", contains(1, 2, 3))</code>?`,
          options: [`It passes, because ids 1, 2 and 3 are in the list`, `It passes only if the list is sorted`, `It fails: <code>contains</code> wants exactly these items and nothing else, and the list has 20`, `It fails, because <code>contains</code> only works on strings`],
          answer: 2,
          explain: `Use <code>hasItems(1, 2, 3)</code> for "at least these". <code>contains</code> means "exactly this list, in this order".`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "params",
      title: "Path and query parameters",
      summary: "Say which record you want with path parameters, and filter, sort and page lists with query parameters.",
      body: `
<p>A URL like <code>/api/v1/employees?departmentId=8&amp;status=ACTIVE&amp;size=5</code> carries two kinds of parameters:</p>
<div class="table-wrap"><table>
<thead><tr><th></th><th>Path parameter</th><th>Query parameter</th></tr></thead>
<tbody>
<tr><td>Answers</td><td><em>Which</em> record?</td><td><em>How</em> do you want the list? (filter, sort, page)</td></tr>
<tr><td>Ice HR example</td><td><code>/employees/<strong>13</strong></code>, <code>/departments/<strong>9</strong>/employees</code></td><td><code>?status=ACTIVE&amp;sort=salary,desc</code></td></tr>
<tr><td>Wrong value gives</td><td>400 for <code>/employees/abc</code>, 404 for <code>/employees/999</code></td><td>400 <code>VALIDATION_FAILED</code> with the parameter name in <code>field</code></td></tr>
<tr><td>REST Assured</td><td><code>.pathParam("id", 13)</code> or <code>.get("/employees/{id}", 13)</code></td><td><code>.queryParam("status", "ACTIVE")</code></td></tr>
</tbody></table></div>

<h3>Path parameters</h3>
<p>Write a placeholder in curly braces in the path and give its value separately. With a name: <code>.pathParam("id", 5)</code> plus
<code>.get("/employees/{id}")</code>. Without a name: <code>.get("/departments/{id}/employees", 9)</code>, where the values fill the placeholders in order.
Do not glue ids into strings yourself (<code>"/employees/" + id</code>): it works for numbers but reads worse, and REST Assured logs the placeholder values for you.</p>

<h3>Paging</h3>
<p><code>GET /employees</code> and <code>GET /leave-requests</code> are <strong>paged</strong>: you get one page of results at a time.</p>
<ul>
<li><code>page</code> is the page number, starting at <strong>0</strong>. <code>size</code> is the page size, 1 to 100, default 20.</li>
<li><code>sort</code> is <code>field</code> or <code>field,asc</code> / <code>field,desc</code>. Default <code>id,asc</code>. Employees sort by <code>id</code>, <code>firstName</code>,
<code>lastName</code>, <code>email</code>, <code>hireDate</code>, <code>dateOfBirth</code>, <code>salary</code>; leave requests by <code>id</code>, <code>startDate</code>, <code>days</code>,
<code>createdAt</code>. Field names are case-sensitive: <code>lastname</code> is a 400.</li>
<li>The answer is <code>{ "content": [...], "page": 0, "size": 20, "totalElements": 60, "totalPages": 3 }</code>.
<code>totalPages</code> is <code>totalElements / size</code>, rounded up.</li>
</ul>
<p><strong>Worked example.</strong> The seed has 60 employees. With <code>size=5</code>: <code>totalPages</code> is 12, page 0 holds ids 1 to 5, page 11 (the last one) holds
ids 56 to 60, and page 12 is past the end: status 200 with <code>"content": []</code>, not an error. With <code>sort=salary,desc&amp;size=3</code> you get
1 Margaret Chen (310000), 2 Daniel Okafor and 9 Aisha Rahman.</p>

<h3>Filters</h3>
<p>Filters combine with AND. On <code>/employees</code>: <code>departmentId</code>, <code>jobId</code>, <code>managerId</code>, <code>status</code>, <code>search</code> (first name,
last name or email, ignoring case), <code>hiredFrom</code>, <code>hiredTo</code>, <code>minSalary</code>, <code>maxSalary</code>. On <code>/leave-requests</code>:
<code>employeeId</code>, <code>status</code>, <code>type</code>, <code>from</code>, <code>to</code> (keeps requests with at least one day in the range). Some seeded results:</p>
<div class="table-wrap"><table>
<thead><tr><th>Request</th><th>totalElements</th><th>ids</th></tr></thead>
<tbody>
<tr><td><code>/employees?departmentId=8</code></td><td>10</td><td>8, 52 to 60 (58 is TERMINATED: still listed)</td></tr>
<tr><td><code>/employees?departmentId=8&amp;status=ACTIVE</code></td><td>9</td><td>58 is gone</td></tr>
<tr><td><code>/employees?managerId=3</code></td><td>7</td><td>22 to 28 (Sofia's team)</td></tr>
<tr><td><code>/employees?search=tremblay</code></td><td>1</td><td>5 (Chloé)</td></tr>
<tr><td><code>/leave-requests?status=PENDING</code></td><td>8</td><td>25 to 32</td></tr>
<tr><td><code>/leave-requests?status=PENDING&amp;from=2026-12-01&amp;to=2026-12-31</code></td><td>4</td><td>25, 27, 28, 31</td></tr>
</tbody></table></div>

<h3>URL encoding</h3>
<p>Some characters cannot travel raw in a URL: a space, <code>'</code>, <code>é</code>, <code>&amp;</code>, <code>#</code>, <code>+</code>. They are
<strong>percent-encoded</strong>: a space becomes <code>%20</code>, <code>'</code> becomes <code>%27</code>, <code>é</code> becomes <code>%C3%A9</code>.
<code>queryParam</code> and <code>pathParam</code> do this for you: <code>.queryParam("search", "liam o'")</code> is sent as <code>?search=liam%20o%27</code> and finds
Liam O'Brien (10). Add <code>.log().uri()</code> after <code>given()</code> to see the exact URL. If you encode a value yourself (<code>"liam%20o"</code>), REST Assured
encodes the <code>%</code> again (<code>liam%2520o</code>) and the search finds nothing.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Starting at <code>page=1</code>. The first page is <code>page=0</code>.</li>
<li>A typo in a query parameter name (<code>?department=2</code>). Ice HR <em>ignores</em> unknown parameters, so you silently get all 60 employees. Check a field of the
results (<code>everyItem</code>), not only the status.</li>
<li>Asserting <code>totalElements</code> equals 60 while other tests (or yesterday's leftovers) have added employees. Prefer facts that only seeded data can change,
or filters that exclude new records (lesson 13).</li>
<li>Encoding values yourself, or building <code>"?search=" + text</code> by hand.</li>
<li>In Git Bash, forgetting the quotes around a URL with <code>&amp;</code>: <code>curl "http://localhost:8080/api/v1/employees?size=5&amp;page=1"</code>.</li>
</ul></div>`,
      examples: [
        {
          title: "PathAndQueryParamsTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;

@Tag("api")
class PathAndQueryParamsTest {

    @Test
    void path_parameters_by_name_and_by_position() {
        given().spec(Specs.api())
                .pathParam("id", 5)
        .when().get("/employees/{id}")
        .then().statusCode(200)
                .body("firstName", equalTo("Chloé"));

        given().spec(Specs.api())
        .when().get("/departments/{id}/employees", 9)    // 9 fills the first {placeholder}
        .then().statusCode(200)
                .body("$", empty());
    }

    @Test
    void the_first_page_of_5() {
        given().spec(Specs.api())
                .queryParam("page", 0)
                .queryParam("size", 5)
        .when().get("/employees")
        .then().statusCode(200)
                .body("page", equalTo(0))
                .body("size", equalTo(5))
                .body("content", hasSize(5))
                .body("content.id", contains(1, 2, 3, 4, 5));
    }

    @Test
    void a_page_past_the_end_is_empty_not_an_error() {
        given().spec(Specs.api())
                .queryParams(Map.of("page", 50, "size", 20))
        .when().get("/employees")
        .then().statusCode(200)
                .body("page", equalTo(50))
                .body("content", empty());
    }

    @Test
    void sort_by_salary_highest_first() {
        given().spec(Specs.api())
                .queryParam("sort", "salary,desc")
                .queryParam("size", 3)
        .when().get("/employees")
        .then().statusCode(200)
                .body("content.id", contains(1, 2, 9))
                .body("content[0].salary", equalTo(310000));
    }

    @Test
    void filters_combine_with_and() {
        given().spec(Specs.api())
                .queryParam("departmentId", 8)
                .queryParam("status", "TERMINATED")
        .when().get("/employees")
        .then().statusCode(200)
                .body("totalElements", equalTo(1))
                .body("content[0].id", equalTo(58))
                .body("content[0].lastName", equalTo("Ivanova"));

        given().spec(Specs.api())
                .queryParam("status", "PENDING")
                .queryParam("type", "VACATION")
        .when().get("/leave-requests")
        .then().statusCode(200)
                .body("content.status", everyItem(equalTo("PENDING")))
                .body("content.type", everyItem(equalTo("VACATION")));
    }

    @Test
    void query_values_are_url_encoded_for_you() {
        given().spec(Specs.api())
                .queryParam("search", "liam o'")     // sent as ?search=liam%20o%27
        .when().get("/employees")
        .then().statusCode(200)
                .body("content.id", contains(10));

        given().spec(Specs.api())
                .queryParam("search", "Chloé")       // sent as ?search=Chlo%C3%A9
        .when().get("/employees")
        .then().statusCode(200)
                .body("content[0].email", equalTo("chloe.tremblay@icehr.test"));
    }

    @Test
    void a_bad_query_parameter_is_a_400() {
        given().spec(Specs.api())
                .queryParam("size", 101)
        .when().get("/employees")
        .then().statusCode(400)
                .body("code", equalTo("VALIDATION_FAILED"))
                .body("errors[0].field", equalTo("size"))
                .body("errors[0].message", equalTo("must be a whole number from 1 to 100"));
    }
}`,
        },
        {
          title: "A 400 for bad query parameters (GET /api/v1/employees?size=0&sort=salary,up&page=-1)",
          lang: "json",
          code: `
{
  "type": "https://icehr.test/problems/validation-failed",
  "title": "Bad Request",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/employees",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "page", "message": "must be a whole number, 0 or more" },
    { "field": "size", "message": "must be a whole number from 1 to 100" },
    { "field": "sort", "message": "direction must be asc or desc" }
  ]
}`,
        },
      ],
      exercises: [
        `Page through all employees with <code>size=7</code>. Before you run anything, write down the expected <code>totalPages</code> and the ids on the last page. Then write a test that checks both.`,
        `Write a test for <code>GET /employees?managerId=3</code> that checks the ids with <code>contains</code>, and a second one that checks <code>everyItem</code> of <code>content.managerId</code> is 3.`,
        `Find every employee hired in 2026 (<code>hiredFrom</code> / <code>hiredTo</code>), sorted by <code>hireDate,desc</code>. Check that Ella Robinson (60) comes first.`,
        `Write a test that sends <code>status=FIRED</code> to <code>/employees</code> and one that sends <code>sort=lastname</code>. Check the <code>field</code> and <code>message</code> of each error.`,
        `Search for <code>O'Brien</code> and for <code>chloé</code> with <code>queryParam</code>, with <code>.log().uri()</code> turned on. Copy the encoded URLs into your notes.`,
      ],
      quiz: [
        {
          q: `There are 60 employees. What does <code>GET /employees?size=5&amp;page=12</code> return?`,
          options: [`200 with <code>"content": []</code>: page 12 is past the last page (0 to 11)`, `404, because the page does not exist`, `400, because page is too large`, `200 with ids 56 to 60`],
          answer: 0,
          explain: `Pages start at 0, so 12 pages are numbered 0 to 11. A page past the end is an empty list, not an error (README section 4).`,
        },
        {
          q: `Which call asks for employee 13 correctly with a named path parameter?`,
          options: [`<code>.queryParam("id", 13).get("/employees")</code>`, `<code>.pathParam("id", 13).get("/employees/id")</code>`, `<code>.pathParam("id", 13).get("/employees/{id}")</code>`, `<code>.get("/employees/{13}")</code>`],
          answer: 2,
          explain: `The placeholder <code>{id}</code> in the path is filled from <code>pathParam("id", …)</code>. A query parameter called <code>id</code> is not a filter Ice HR knows, so it would be ignored.`,
        },
        {
          q: `<code>GET /employees?department=2</code> returns 200 and 60 employees. Why?`,
          options: [`Engineering has 60 employees`, `The real filter is <code>departmentId</code>; Ice HR ignores unknown query parameters`, `Filters only work with <code>size=100</code>`, `Query parameters are case-insensitive`],
          answer: 1,
          explain: `An unknown parameter is not an error in Ice HR. That is why a filter test should also check the filtered field in every result.`,
        },
        {
          q: `You write <code>.queryParam("search", "liam%20o")</code>. What is sent?`,
          options: [`<code>?search=liam%20o</code>`, `<code>?search=liam o</code>`, `<code>?search=liam+o</code>`, `<code>?search=liam%2520o</code>: REST Assured encodes the <code>%</code> again`],
          answer: 3,
          explain: `REST Assured encodes values for you. Give it the plain text <code>"liam o"</code>.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "post",
      title: "Sending data: POST",
      summary: "Create records with a JSON body written as a String, a Map or a Java record, check the 201 and the Location, and clean up afterwards.",
      body: `
<p>A <strong>POST</strong> sends data to the server to create something: a department, an employee, a leave request. The data travels in the <strong>request body</strong>
as JSON, and the header <code>Content-Type: application/json</code> tells the server how to read it. <code>Specs.api()</code> already sets that header, so you only add
<code>.body(…)</code>.</p>

<h3>Three ways to write the body</h3>
<div class="table-wrap"><table>
<thead><tr><th>Body as</th><th>Looks like</th><th>Good for</th></tr></thead>
<tbody>
<tr><td><strong>String</strong></td><td><code>.body("{\\"name\\": \\"Data Science\\", \\"code\\": \\"DS\\", \\"location\\": \\"Toronto\\"}")</code>, or a Java text block <code>"""…"""</code></td>
<td>Sending exactly these characters: broken JSON, wrong types (<code>"salary": "lots"</code>), a field twice. Negative tests.</td></tr>
<tr><td><strong>Map</strong></td><td><code>.body(Map.of("name", "Data Science", "code", "DS", "location", "Toronto"))</code></td>
<td>Small bodies, quick tests, sending <code>null</code> on purpose (lesson 6).</td></tr>
<tr><td><strong>Record (object)</strong></td><td><code>.body(NewEmployee.valid())</code></td>
<td>Real bodies with many fields. Type-safe, reusable, and the compiler catches typos in field names.</td></tr>
</tbody></table></div>
<p>For a Map or a record, REST Assured turns the Java object into JSON with <strong>Jackson</strong> (this is called <em>serializing</em>). The starter configures Jackson in
<code>Json.MAPPER</code> so that a <code>LocalDate</code> becomes <code>"1995-06-15"</code>. Lesson 10 explains more.</p>

<h3>NewEmployee: a valid body you can change</h3>
<p><code>NewEmployee.valid()</code> returns a Software Engineer (job 4) in Engineering (department 2), reporting to Aisha (9), born 1995-06-15, hired 2024-03-04,
salary 95000, phone 416-555-0199 and a <strong>unique email</strong> from <code>TestData.uniqueEmail()</code> (like <code>test.3f9a1c2b@icehr.test</code>). It passes every
rule. To test one rule, change one thing: <code>.withSalary(79999)</code>, <code>.withEmail(…)</code>, <code>.withDates(birth, hire)</code>, <code>.withJob(…)</code>,
<code>.withManager(…)</code>. Records cannot be changed, so each <code>with…</code> returns a new copy.</p>

<h3>Worked example: hiring someone</h3>
<ol>
<li>The test sends <code>POST /api/v1/employees</code> with <code>NewEmployee.valid().withSalary(99000)</code>.</li>
<li>Ice HR checks the fields (400 if any is wrong), then the business rules (lesson 8), then saves the row.</li>
<li>It answers <code>201 Created</code>, <code>Location: /api/v1/employees/1001</code> (the first new record after a reset) and the saved employee. Notice what the
server added: <code>id</code>, <code>status: "ACTIVE"</code>, <code>terminationDate: null</code>, <code>createdAt</code> and <code>updatedAt</code>. If you sent an email with capitals,
it comes back in lower case.</li>
<li>To prove the record was really stored, <strong>read it back</strong> with <code>GET /employees/{id}</code> and compare. A response body can look right even when
nothing was saved.</li>
</ol>

<h3>Clean up what you create</h3>
<p>Every POST leaves a row in the database. If your tests never delete what they create, the data grows on each run, list counts drift, and sooner or later a test that
expected "5 reports" finds 9. The rule: <strong>a test deletes what it created</strong>. With JUnit 5:</p>
<ul>
<li>Keep a list of what the test created (ids, or the <code>Location</code> headers).</li>
<li>Add to the list <em>right after the POST, before any check</em>. If a check fails, the test stops at that line, and anything not yet in the list would be left behind.</li>
<li>In an <code>@AfterEach</code> method, delete everything in the list. JUnit runs <code>@AfterEach</code> after every test, passed or failed.</li>
</ul>
<p>The starter's <code>EmployeesApiTest</code> does exactly this with its <code>hire(…)</code> helper and <code>created</code> list. The example below does the same with
<code>Location</code> headers. Deleting an employee also deletes their leave requests, so one DELETE cleans up a whole leave test (lesson 12).</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li><code>Map.of(…)</code> with more than 10 pairs does not compile, and it does not allow <code>null</code>. Use a <code>LinkedHashMap</code> (it also keeps the field order you
wrote).</li>
<li>Hard-coding an email like <code>jane.doe@icehr.test</code>. The second run gets <code>409 EMAIL_TAKEN</code>. Use <code>TestData.uniqueEmail()</code>.</li>
<li>Hard-coding the new id (<code>1001</code>). It is 1001 only right after a reset. Read the id from the response.</li>
<li>Calling <code>.get(location)</code> with <code>Specs.api()</code>. <code>Location</code> already contains <code>/api/v1</code>, and the spec adds it again:
<code>/api/v1/api/v1/employees/1001</code>, a 404. Use the id, or clear the base path with <code>.basePath("")</code>.</li>
<li>Escaping quotes by hand in long JSON strings. Use a text block, a Map or a record.</li>
</ul></div>`,
      examples: [
        {
          title: "CreateWithPostTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.NewEmployee;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;

@Tag("api")
class CreateWithPostTest {

    /** Location headers of everything this test created, e.g. "/api/v1/departments/1004". */
    private final List<String> created = new ArrayList<>();

    @AfterEach
    void deleteWhatWeCreated() {
        for (String location : created) {
            // Location already starts with /api/v1, so clear the base path for this call
            given().spec(Specs.api()).basePath("").delete(location);
        }
    }

    /** Call this right after the POST, before any check, so cleanup happens even when a check fails. */
    private void remember(Response response) {
        if (response.statusCode() == 201) {
            created.add(response.header("Location"));
        }
    }

    @Test
    void body_as_a_string() {
        String code = randomCode();
        String json = """
                {
                  "name": "Text Block %s",
                  "code": "%s",
                  "location": "Halifax"
                }
                """.formatted(code, code);

        Response response = given().spec(Specs.api()).body(json).when().post("/departments");
        remember(response);

        response.then().statusCode(201)
                .body("name", equalTo("Text Block " + code))
                .body("employeeCount", equalTo(0))
                .body("managerId", nullValue());
    }

    @Test
    void body_as_a_map() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("name", "Map " + randomCode());
        body.put("code", randomCode());
        body.put("location", "Waterloo");
        body.put("managerId", 3);

        Response response = given().spec(Specs.api()).body(body).when().post("/departments");
        remember(response);

        response.then().statusCode(201)
                .header("Location", startsWith("/api/v1/departments/"))
                .body("id", greaterThan(1000))
                .body("managerId", equalTo(3));
    }

    @Test
    void body_as_a_record_then_read_it_back() {
        NewEmployee newHire = NewEmployee.valid().withSalary(99000);

        Response response = given().spec(Specs.api()).body(newHire).when().post("/employees");
        remember(response);

        response.then().statusCode(201)
                .body("email", equalTo(newHire.email()))
                .body("salary", equalTo(99000))
                .body("status", equalTo("ACTIVE"))
                .body("terminationDate", nullValue());

        int id = response.path("id");
        given().spec(Specs.api())
        .when().get("/employees/{id}", id)
        .then().statusCode(200)
                .body("id", equalTo(id))
                .body("hireDate", equalTo("2024-03-04"))
                .body("managerId", equalTo(9));
    }

    private static String randomCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            code.append((char) ('A' + random.nextInt(26)));
        }
        return code.toString();
    }
}`,
        },
        {
          title: "What actually goes over the wire for NewEmployee.valid()",
          lang: "http",
          code: `
POST /api/v1/employees HTTP/1.1
Content-Type: application/json
Accept: application/json, application/javascript, text/javascript, text/json

{"firstName":"Test","lastName":"Engineer","gender":"FEMALE","email":"test.3f9a1c2b@icehr.test","phone":"416-555-0199",
 "dateOfBirth":"1995-06-15","hireDate":"2024-03-04","jobId":4,"departmentId":2,"managerId":9,"salary":95000,"countryCode":"CA"}

HTTP/1.1 201 Created
Location: /api/v1/employees/1001
Content-Type: application/json

{"id":1001,"firstName":"Test","lastName":"Engineer","gender":"FEMALE","email":"test.3f9a1c2b@icehr.test","phone":"416-555-0199",
 "dateOfBirth":"1995-06-15","hireDate":"2024-03-04","jobId":4,"departmentId":2,"managerId":9,"countryCode":"CA","regionId":1,
 "salary":95000,"status":"ACTIVE","terminationDate":null,"createdAt":"2026-11-05T10:15:00-05:00","updatedAt":"2026-11-05T10:15:00-05:00"}`,
          note: `Add <code>.log().body()</code> after <code>given()</code> to print the JSON your test sends.`,
        },
      ],
      exercises: [
        `Create a department with a text-block body, check 201, <code>Location</code>, <code>employeeCount</code> 0 and <code>managerId</code> null, and delete it in <code>@AfterEach</code>.`,
        `Hire an employee with <code>NewEmployee.valid().withEmail("Mixed.CASE." + System.nanoTime() + "@IceHR.test")</code> and check the email comes back in lower case. Then read the employee back with GET and compare three fields.`,
        `Hire an employee with a <code>LinkedHashMap</code> body that leaves out <code>phone</code> and <code>managerId</code>. Check both are <code>null</code> in the response.`,
        `Run your POST test class three times in a row. Then check with <code>GET /employees?search=test.</code> (or in the web UI) that nothing was left behind.`,
        `Hire someone with <code>"id": 5</code> and <code>"status": "TERMINATED"</code> in the body (use a Map). Check what Ice HR does with those fields, compare with the README's rule on unknown fields, and delete the employee afterwards.`,
      ],
      quiz: [
        {
          q: `Your test hires <code>jane.doe@icehr.test</code>. It passes once, then fails on every run after. Why?`,
          options: [`Ice HR limits hires per day`, `The email is now taken, so later runs get 409 <code>EMAIL_TAKEN</code>: use <code>TestData.uniqueEmail()</code> and delete what you create`, `REST Assured caches POST responses`, `The id 1001 is used up`],
          answer: 1,
          explain: `Emails must be unique (rule E17). A test that creates data must make it unique and remove it afterwards.`,
        },
        {
          q: `Where should <code>created.add(id)</code> go so that cleanup works even when a check fails?`,
          options: [`At the end of the test`, `In <code>@BeforeEach</code>`, `Nowhere: JUnit deletes test data`, `Right after the POST, before the first check`],
          answer: 3,
          explain: `A failed check stops the test method at that line. Anything you planned to remember later is never remembered, so <code>@AfterEach</code> cannot delete it.`,
        },
        {
          q: `Which body type is the right choice for sending <code>"salary": "lots"</code> to test a 400?`,
          options: [`A <code>NewEmployee</code> record`, `A <code>Department</code> record`, `A String (or a Map), because the record's <code>salary</code> is an <code>Integer</code> and cannot hold text`, `None: REST Assured refuses wrong types`],
          answer: 2,
          explain: `Records protect you from wrong types, which is exactly what a negative test wants to send. A String sends any characters you like.`,
        },
        {
          q: `The response has <code>Location: /api/v1/employees/1004</code>. With <code>given().spec(Specs.api())</code>, what does <code>.get(location)</code> request?`,
          options: [`<code>/api/v1/api/v1/employees/1004</code>, a 404: the spec's base path is added in front`, `<code>/api/v1/employees/1004</code>`, `<code>http://localhost:8080/employees/1004</code>`, `Nothing: it throws an exception`],
          answer: 0,
          explain: `The base path <code>/api/v1</code> is always put in front of the path you give. Use <code>.get("/employees/{id}", id)</code>, or <code>.basePath("")</code> before <code>get(location)</code>.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "put-patch-delete",
      title: "Updating and deleting: PUT, PATCH, DELETE",
      summary: "Replace a whole record with PUT, change a few fields with PATCH, clear a field with null, and delete with 204 then 404.",
      body: `
<p>Three methods change data that already exists:</p>
<div class="table-wrap"><table>
<thead><tr><th>Method</th><th>Means</th><th>Fields you leave out</th><th>Success</th></tr></thead>
<tbody>
<tr><td><strong>PUT</strong></td><td>Replace the whole record with this one</td><td>Optional fields (<code>phone</code>, <code>managerId</code>) become <code>null</code>; a missing required field is a 400</td><td>200 + the record</td></tr>
<tr><td><strong>PATCH</strong></td><td>Change only these fields</td><td>Stay as they were. At least one field is required, or 400.</td><td>200 + the record</td></tr>
<tr><td><strong>DELETE</strong></td><td>Remove the record</td><td>No body</td><td>204, no body</td></tr>
</tbody></table></div>
<p>Ice HR supports all three on <code>/employees/{id}</code> and <code>/departments/{id}</code>. Jobs are read-only (405).</p>

<h3>PATCH and null</h3>
<p>With PATCH, a field you <em>leave out</em> and a field you <em>send as null</em> mean different things. Leaving <code>phone</code> out keeps the phone.
Sending <code>"phone": null</code> clears it. Only the optional fields can be cleared: <code>phone</code> and <code>managerId</code> for employees, <code>managerId</code> for
departments. To send <code>null</code> from Java:</p>
<ul>
<li><code>Map.of("phone", null)</code> throws a <code>NullPointerException</code> before anything is sent. Use a <code>HashMap</code> and <code>put("phone", null)</code>.</li>
<li><code>NewEmployee</code> is marked <code>@JsonInclude(NON_NULL)</code>: its null fields are <em>left out</em> of the JSON. That is right for PUT and POST (a missing phone
means no phone), but it cannot send an explicit <code>null</code> in a PATCH.</li>
<li>Or simply send the string <code>"{\\"phone\\": null}"</code>.</li>
</ul>

<h3>PATCH still checks the rules</h3>
<p>After a PATCH, the <em>whole</em> record must still pass every rule. Example: Ethan (13) earns 80000 as a Software Engineer (job 4, 80000 to 115000). Patching only
<code>"jobId": 3</code> (Senior Software Engineer, 110000 to 150000) gives <code>422 SALARY_OUT_OF_RANGE</code>, because his old salary does not fit the new job.
Terminated employees cannot be changed at all: PATCH on Tanya (58) gives <code>409 EMPLOYEE_TERMINATED</code>.</p>

<h3>DELETE</h3>
<p>A successful DELETE returns <strong>204</strong> with an empty body. After that, GET and DELETE on the same id return <strong>404</strong>. Some deletes are refused with 409:
an employee who is anyone's manager (<code>EMPLOYEE_HAS_REPORTS</code>, try Aisha, 9) and a department that still has employees, terminated ones included
(<code>DEPARTMENT_HAS_EMPLOYEES</code>, try 2).</p>

<h3>Worked example: a department's whole life</h3>
<p>Department 9 (Research Lab, Waterloo, no manager) is the one seeded department that is empty, so it is the only one you <em>could</em> delete. Do not: other people and
other tests expect it to exist. Create your own instead and take it through every step (see <code>DepartmentLifecycleTest</code> below):</p>
<ol>
<li><strong>POST</strong> <code>{"name":"Lifecycle QWERT","code":"QWERT","location":"Toronto","managerId":2}</code>: 201, <code>managerId</code> 2.</li>
<li><strong>GET</strong> it: 200, same values. Proves it was saved.</li>
<li><strong>PUT</strong> <code>{"name":"Lifecycle QWERT Renamed","code":"QWERT","location":"Montreal"}</code>: 200. No <code>managerId</code> in the body, so it is now
<code>null</code>. That is the PUT rule in action.</li>
<li><strong>PATCH</strong> <code>{"location":"Halifax"}</code>: 200. Name and code are unchanged.</li>
<li><strong>DELETE</strong>: 204. Then <strong>GET</strong>: 404 <code>NOT_FOUND</code>.</li>
</ol>
<p>The test keeps the id in a field and deletes it again in <code>@AfterEach</code> if it still exists (a 404 there is harmless). So even if step 3 fails, the department
does not stay behind.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Using PUT to change one field. Every field you forget is reset or rejected. Use PATCH for small changes.</li>
<li>Expecting PATCH <code>{}</code> to do nothing. It is a 400: "must contain at least one…".</li>
<li>Testing DELETE on seeded records (Ethan, department 9). The test passes once and breaks the data for everyone. Create your own record first.</li>
<li>Checking the body of a 204. There is none.</li>
<li>Thinking a second DELETE should give 204 again. In Ice HR it is 404: the record no longer exists.</li>
</ul></div>`,
      examples: [
        {
          title: "DepartmentLifecycleTest.java: a full CRUD test on a department the test owns",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Random;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

/** Create, read, replace, patch and delete one department that this test owns. */
@Tag("api")
class DepartmentLifecycleTest {

    private Integer id;   // the department this test created (null until then)

    @AfterEach
    void deleteIfStillThere() {
        if (id != null) {
            given().spec(Specs.api()).delete("/departments/{id}", id);   // 204, or 404 if the test already deleted it
        }
    }

    @Test
    void create_read_replace_patch_delete() {
        String code = randomCode();
        String name = "Lifecycle " + code;

        // CREATE
        id = given().spec(Specs.api())
                .body(Map.of("name", name, "code", code, "location", "Toronto", "managerId", 2))
        .when().post("/departments")
        .then().statusCode(201)
                .body("managerId", equalTo(2))
                .extract().path("id");

        // READ
        given().spec(Specs.api())
        .when().get("/departments/{id}", id)
        .then().statusCode(200)
                .body("name", equalTo(name))
                .body("location", equalTo("Toronto"));

        // PUT replaces everything. managerId is left out, so it becomes null.
        given().spec(Specs.api())
                .body(Map.of("name", name + " Renamed", "code", code, "location", "Montreal"))
        .when().put("/departments/{id}", id)
        .then().statusCode(200)
                .body("name", equalTo(name + " Renamed"))
                .body("location", equalTo("Montreal"))
                .body("managerId", nullValue());

        // PATCH changes only what you send
        given().spec(Specs.api())
                .body(Map.of("location", "Halifax"))
        .when().patch("/departments/{id}", id)
        .then().statusCode(200)
                .body("location", equalTo("Halifax"))
                .body("name", equalTo(name + " Renamed"))
                .body("code", equalTo(code));

        // DELETE, then it is gone
        given().spec(Specs.api())
        .when().delete("/departments/{id}", id)
        .then().statusCode(204);

        given().spec(Specs.api())
        .when().get("/departments/{id}", id)
        .then().statusCode(404)
                .body("code", equalTo("NOT_FOUND"));
    }

    private static String randomCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            code.append((char) ('A' + random.nextInt(26)));
        }
        return code.toString();
    }
}`,
        },
        {
          title: "EmployeeUpdateTest.java: PATCH, clearing with null, PUT and DELETE",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.NewEmployee;
import com.icehr.support.TestData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;

@Tag("api")
class EmployeeUpdateTest {

    private int employeeId;

    @BeforeEach
    void hireSomeone() {
        employeeId = given().spec(Specs.api())
                .body(NewEmployee.valid())          // phone 416-555-0199, salary 95000, manager 9
        .when().post("/employees")
        .then().statusCode(201)
                .extract().path("id");
    }

    @AfterEach
    void deleteThem() {
        given().spec(Specs.api()).delete("/employees/{id}", employeeId);
    }

    @Test
    void patch_changes_only_what_you_send() {
        given().spec(Specs.api())
                .body(Map.of("salary", 105000))
        .when().patch("/employees/{id}", employeeId)
        .then().statusCode(200)
                .body("salary", equalTo(105000))
                .body("phone", equalTo("416-555-0199"))   // untouched
                .body("managerId", equalTo(9));            // untouched
    }

    @Test
    void patch_with_null_clears_a_field() {
        Map<String, Object> body = new HashMap<>();
        body.put("phone", null);          // Map.of("phone", null) would throw a NullPointerException

        given().spec(Specs.api())
                .body(body)               // sent as {"phone":null}
        .when().patch("/employees/{id}", employeeId)
        .then().statusCode(200)
                .body("phone", nullValue())
                .body("salary", equalTo(95000));
    }

    @Test
    void put_replaces_everything_so_a_missing_phone_becomes_null() {
        NewEmployee replacement = new NewEmployee("Test", "Replaced", "FEMALE", TestData.uniqueEmail(), null,
                LocalDate.of(1995, 6, 15), LocalDate.of(2024, 3, 4), 4, 2, 9, 95000, "CA");

        given().spec(Specs.api())
                .body(replacement)        // phone is null, so NewEmployee leaves it out of the JSON
        .when().put("/employees/{id}", employeeId)
        .then().statusCode(200)
                .body("lastName", equalTo("Replaced"))
                .body("phone", nullValue());
    }

    @Test
    void delete_gives_204_then_get_and_delete_give_404() {
        given().spec(Specs.api()).when().delete("/employees/{id}", employeeId).then().statusCode(204);
        given().spec(Specs.api()).when().get("/employees/{id}", employeeId).then().statusCode(404);
        given().spec(Specs.api()).when().delete("/employees/{id}", employeeId).then().statusCode(404);
    }
}`,
        },
      ],
      exercises: [
        `Hire an employee, then PATCH only <code>"jobId": 3</code>. Check the status and the <code>code</code>. Then PATCH <code>jobId</code> 3 and <code>salary</code> 120000 together and check it works.`,
        `Hire an employee, then PATCH <code>"managerId": null</code>. Check the response and read the employee back with GET.`,
        `Send a PUT for your new employee that leaves out <code>lastName</code>. Check the status, and which <code>field</code> the error names.`,
        `Try PATCH <code>{"phone": "416-555-0100"}</code> on Tanya Ivanova (58) and DELETE on Aisha Rahman (9). Write down both codes and explain each from README section 5. (Both are refused, so nothing changes.)`,
        `Write a test that creates a department, PATCHes its <code>code</code> to <code>ENG</code>, and checks the 409 code. Clean up afterwards.`,
      ],
      quiz: [
        {
          q: `An employee has phone <code>416-555-0199</code>. You send <code>PATCH {"salary": 105000}</code>. What is the phone afterwards?`,
          options: [`<code>null</code>, because it was not sent`, `The request is a 400 because phone is missing`, `<code>416-555-0199</code>: PATCH keeps every field you do not send`, `An empty string`],
          answer: 2,
          explain: `That is the difference with PUT. With PUT, a missing <code>phone</code> becomes <code>null</code>.`,
        },
        {
          q: `How do you clear an employee's phone with a PATCH from Java?`,
          options: [`Send a body with <code>"phone": null</code>, for example a <code>HashMap</code> with <code>put("phone", null)</code>`, `<code>.body(Map.of("phone", null))</code>`, `Send <code>NewEmployee</code> with a null phone`, `Send <code>PATCH {}</code>`],
          answer: 0,
          explain: `<code>Map.of</code> refuses nulls, and <code>NewEmployee</code> leaves null fields out of the JSON (which means "keep it" in a PATCH).`,
        },
        {
          q: `You DELETE your own department and get 204. What does a second DELETE of the same id return?`,
          options: [`204 again`, `404 <code>NOT_FOUND</code>`, `409 <code>DEPARTMENT_HAS_EMPLOYEES</code>`, `405`],
          answer: 1,
          explain: `The record no longer exists, so Ice HR answers 404. A cleanup method can ignore that.`,
        },
        {
          q: `Why should a CRUD test create its own department instead of deleting department 9?`,
          options: [`Department 9 cannot be deleted`, `DELETE only works on ids above 1000`, `Department 9 has a manager`, `Deleting seeded data changes it for every other test and person until a reset; your own record leaves nothing behind`],
          answer: 3,
          explain: `Department 9 <em>can</em> be deleted (it is empty). That is exactly the problem: the next test that expects it fails.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "negative-tests",
      title: "Negative tests and error responses",
      summary: "Test what happens when the request is wrong: RFC 7807 problem bodies, 400 with every invalid field, 404, 405, 415 and malformed JSON.",
      links: [
        { label: "Swagger: every error has an example", href: "http://localhost:8080/swagger" },
      ],
      body: `
<p>A <strong>positive test</strong> checks that a correct request works. A <strong>negative test</strong> sends something wrong on purpose and checks that the server refuses
it in the right way. Most real bugs hide in the negative cases: a missing check, the wrong status code, an error that leaks a stack trace. Expect to write more negative
tests than positive ones.</p>

<h3>The shape of every error: RFC 7807</h3>
<p>Ice HR answers every error in the same format, called <strong>problem details</strong> (RFC 7807 is the standard that defines it). The header is
<code>Content-Type: application/problem+json</code> and the body is:</p>
<pre><code>{
  "type": "https://icehr.test/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Employee 999 was not found.",
  "instance": "/api/v1/employees/999",
  "code": "NOT_FOUND"
}</code></pre>
<ul>
<li><code>status</code> repeats the HTTP status. <code>title</code> is its standard name.</li>
<li><code>code</code> is Ice HR's stable, machine-readable name for the problem. <strong>Assert on <code>code</code>.</strong></li>
<li><code>detail</code> is a sentence for humans. It may be reworded at any time, so do not build tests on it (reading it while debugging is fine).</li>
<li><code>instance</code> is the path you called.</li>
</ul>
<p>The starter's <code>Specs.problem(422, "SALARY_OUT_OF_RANGE")</code> checks the status, the <code>problem+json</code> content type and the <code>status</code> and
<code>code</code> fields in one line. To work with the error in Java, read it into the <code>Problem</code> record: <code>.extract().as(Problem.class)</code>.</p>

<h3>400 VALIDATION_FAILED: every field at once</h3>
<p>When fields are wrong, Ice HR does not stop at the first one. <code>errors</code> lists <em>every</em> invalid field, in the order the fields are defined, each with a
<code>field</code> and a <code>message</code>. That lets one request test many rules, and it is a rule you can test too.</p>
<p><strong>Worked example.</strong> Send this to <code>POST /api/v1/employees</code>:</p>
<pre><code>{"firstName":"Jane","lastName":"","gender":"FEMALE","email":"jane.doe-at-icehr.test","phone":"4165550199",
 "dateOfBirth":"1995-02-30","hireDate":"2026-11-02","jobId":4,"departmentId":2,"countryCode":"CA","salary":95000.5}</code></pre>
<p>Ice HR answers 400 with five errors: <code>lastName</code> "must not be blank", <code>email</code> "must be a valid email address", <code>phone</code> "must be in the format
416-555-0100", <code>dateOfBirth</code> "must be a real date in the format YYYY-MM-DD" (there is no 30 February) and <code>salary</code> "must be a whole number".
<code>managerId</code> is missing, but it is optional, so it is not an error. Check the list with <code>.body("errors.field", hasItems(…))</code>, or extract a
<code>Problem</code> and use AssertJ on <code>problem.errors()</code>.</p>

<h3>The other errors to know</h3>
<div class="table-wrap"><table>
<thead><tr><th>Status and code</th><th>How to trigger it</th><th>Check</th></tr></thead>
<tbody>
<tr><td>400 <code>VALIDATION_FAILED</code>, field <code>id</code></td><td><code>GET /employees/abc</code> (also <code>0</code> or <code>1.5</code>)</td><td>message "must be a positive whole number"</td></tr>
<tr><td>404 <code>NOT_FOUND</code></td><td><code>GET /employees/999</code>; a path that does not exist, like <code>/api/v1/employes</code></td><td><code>code</code>, <code>instance</code></td></tr>
<tr><td>405 <code>METHOD_NOT_ALLOWED</code></td><td><code>PUT /employees</code> (without an id)</td><td><code>Allow: GET, POST, HEAD</code></td></tr>
<tr><td>415 <code>UNSUPPORTED_MEDIA_TYPE</code></td><td>A body without <code>Content-Type: application/json</code></td><td><code>code</code></td></tr>
<tr><td>400 <code>MALFORMED_JSON</code></td><td>Broken JSON (<code>{"name": "Oops",}</code>), or JSON that is not an object (<code>[1]</code>)</td><td><code>code</code></td></tr>
<tr><td>400 <code>BODY_REQUIRED</code></td><td>A POST with no body at all</td><td><code>code</code></td></tr>
</tbody></table></div>
<p><strong>415 in REST Assured.</strong> When you call <code>.body("…")</code> without a content type, REST Assured sends <code>Content-Type: text/plain; charset=ISO-8859-1</code>.
<code>Specs.api()</code> always sets JSON, so to see a 415 build the request without it (example below), or override it with <code>.contentType(ContentType.TEXT)</code>.</p>
<p><strong>Order of checks.</strong> A wrong id in the URL is a 400 even if the body is fine; a well-formed id that does not exist is a 404 only after the body passed its
field checks. So <code>PATCH /employees/999</code> with an empty body is a 400, not a 404 (README section 5, "Order of checks").</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Asserting on <code>detail</code>. The day someone fixes a typo in the message, your test breaks although nothing is wrong.</li>
<li>Checking <code>errors[0].field</code> when the order is not the point of the test. Use <code>hasItem</code> or AssertJ <code>contains</code>.</li>
<li>Checking only <code>statusCode(400)</code>. A 400 for the <em>wrong</em> reason passes too. Check the <code>code</code>, and for validation errors the <code>field</code>.</li>
<li>Expecting <code>/employees/abc</code> to be a 404. It is a 400: the id itself is invalid.</li>
<li>Forgetting that <code>Specs.api()</code> sets the JSON content type, then wondering why the 415 test gets a 400.</li>
</ul></div>`,
      examples: [
        {
          title: "ErrorResponsesTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.config.Config;
import com.icehr.model.Problem;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;

@Tag("api")
class ErrorResponsesTest {

    @Test
    void not_found_has_a_problem_body() {
        given().spec(Specs.api())
        .when().get("/employees/{id}", 999)
        .then().statusCode(404)
                .contentType("application/problem+json")
                .body("status", equalTo(404))
                .body("title", equalTo("Not Found"))
                .body("code", equalTo("NOT_FOUND"))
                .body("instance", equalTo("/api/v1/employees/999"));
    }

    @Test
    void a_word_instead_of_an_id_is_400_not_404() {
        given().spec(Specs.api())
        .when().get("/employees/abc")
        .then().spec(Specs.problem(400, "VALIDATION_FAILED"))
                .body("errors[0].field", equalTo("id"))
                .body("errors[0].message", equalTo("must be a positive whole number"));
    }

    @Test
    void every_invalid_field_is_listed_at_once() {
        String body = """
                {
                  "firstName": "Jane",
                  "lastName": "",
                  "gender": "FEMALE",
                  "email": "jane.doe-at-icehr.test",
                  "phone": "4165550199",
                  "dateOfBirth": "1995-02-30",
                  "hireDate": "2026-11-02",
                  "jobId": 4,
                  "departmentId": 2,
                  "countryCode": "CA",
                  "salary": 95000.5
                }
                """;

        given().spec(Specs.api())
                .body(body)
        .when().post("/employees")
        .then().spec(Specs.problem(400, "VALIDATION_FAILED"))
                .body("errors", hasSize(5))
                .body("errors.field", hasItems("lastName", "email", "phone", "dateOfBirth", "salary"))
                .body("errors.find { it.field == 'salary' }.message", equalTo("must be a whole number"));
    }

    @Test
    void read_the_error_into_the_problem_record() {
        Problem problem = given().spec(Specs.api())
                .body(Map.of("name", "", "code", "eng", "location", "Toronto"))
        .when().post("/departments")
        .then().statusCode(400)
                .extract().as(Problem.class);

        assertThat(problem.code()).isEqualTo("VALIDATION_FAILED");
        assertThat(problem.errors())
                .extracting(Problem.FieldError::field)
                .containsExactly("name", "code");
        assertThat(problem.errors())
                .contains(new Problem.FieldError("code", "must be 2 to 5 uppercase letters, like ENG"));
    }

    @Test
    void wrong_method_is_405_with_an_allow_header() {
        given().spec(Specs.api())
        .when().put("/employees")
        .then().spec(Specs.problem(405, "METHOD_NOT_ALLOWED"))
                .header("Allow", equalTo("GET, POST, HEAD"));
    }

    @Test
    void a_body_without_content_type_json_is_415() {
        given()
                .baseUri(Config.baseUrl())
                .basePath("/api/v1")
                .body("{\\"name\\": \\"No Header\\", \\"code\\": \\"NOHDR\\", \\"location\\": \\"Toronto\\"}")
                // no .contentType(ContentType.JSON), so REST Assured sends text/plain
        .when().post("/departments")
        .then().statusCode(415)
                .body("code", equalTo("UNSUPPORTED_MEDIA_TYPE"));
    }

    @Test
    void broken_json_is_malformed_json() {
        given().spec(Specs.api())
                .body("{\\"name\\": \\"Oops\\",}")           // the comma before } breaks the JSON
        .when().post("/departments")
        .then().spec(Specs.problem(400, "MALFORMED_JSON"));
    }

    @Test
    void no_body_at_all_is_body_required() {
        given().spec(Specs.api())
        .when().post("/departments")
        .then().spec(Specs.problem(400, "BODY_REQUIRED"));
    }
}`,
        },
        {
          title: "The Problem record from the starter (model/Problem.java)",
          lang: "java",
          code: `
package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** An RFC 7807 error body. errors is only filled for 400 VALIDATION_FAILED. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Problem(
        String type,
        String title,
        Integer status,
        String detail,
        String instance,
        String code,
        List<FieldError> errors) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FieldError(String field, String message) {
    }
}`,
        },
        {
          title: "Everything missing: POST /api/v1/employees with {}",
          lang: "json",
          code: `
{
  "type": "https://icehr.test/problems/validation-failed",
  "title": "Bad Request",
  "status": 400,
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/employees",
  "code": "VALIDATION_FAILED",
  "errors": [
    { "field": "firstName", "message": "is required" },
    { "field": "lastName", "message": "is required" },
    { "field": "gender", "message": "is required" },
    { "field": "email", "message": "is required" },
    { "field": "dateOfBirth", "message": "is required" },
    { "field": "hireDate", "message": "is required" },
    { "field": "jobId", "message": "is required" },
    { "field": "departmentId", "message": "is required" },
    { "field": "countryCode", "message": "is required" },
    { "field": "salary", "message": "is required" }
  ]
}`,
          note: `<code>phone</code> and <code>managerId</code> are not in the list: they are optional.`,
        },
      ],
      exercises: [
        `Send <code>{}</code> to <code>POST /employees</code> and check, with AssertJ on the <code>Problem</code> record, that exactly the 8 required fields are reported and <code>phone</code> is not.`,
        `Write one test that sends a department with a blank name, the code <code>eng</code> and a blank location, and checks all three fields in <code>errors</code>.`,
        `Write tests for <code>GET /employees/0</code>, <code>GET /employees/1.5</code> and <code>GET /employees/2147483648</code>. Write down the <code>message</code> for each.`,
        `Send <code>[1]</code> and then the text <code>hello</code> (with JSON content type) to <code>POST /departments</code>. Check the code of each.`,
        `Send <code>POST /leave-requests/25/approve</code> without a body. Before you run it, predict the status and code from the README; then check your prediction with a test. (Nothing is approved.)`,
      ],
      quiz: [
        {
          q: `Which field of an Ice HR error should your test assert on?`,
          options: [`<code>detail</code>, because it explains the problem`, `<code>title</code>`, `<code>type</code>`, `<code>code</code>: it is stable, while <code>detail</code> is free text that may change`],
          answer: 3,
          explain: `README section 4: assert on <code>code</code>. <code>detail</code> is for humans.`,
        },
        {
          q: `A POST to <code>/employees</code> has an invalid email and a salary of <code>"lots"</code>. What comes back?`,
          options: [`400 with only the email error, because it comes first`, `400 <code>VALIDATION_FAILED</code> with both errors in <code>errors</code>`, `422 <code>SALARY_OUT_OF_RANGE</code>`, `Two separate responses`],
          answer: 1,
          explain: `All field errors are reported together. The salary message is "must be a number", because <code>"lots"</code> is not a number at all.`,
        },
        {
          q: `Your test uses <code>given().spec(Specs.api()).body("{…}")</code> to get a 415, but it gets 201. Why?`,
          options: [`Ice HR does not support 415`, `The body was too short`, `<code>Specs.api()</code> sets <code>Content-Type: application/json</code>; to test 415 send the body without it or with <code>ContentType.TEXT</code>`, `415 only happens on PUT`],
          answer: 2,
          explain: `415 means "a body without a JSON content type". The spec adds exactly the header the test wants to leave out.`,
        },
        {
          q: `What does <code>GET /api/v1/employees/abc</code> return?`,
          options: [`400 <code>VALIDATION_FAILED</code> with field <code>id</code>`, `404 <code>NOT_FOUND</code>`, `405`, `200 with an empty body`],
          answer: 0,
          explain: `An id that is not a positive whole number is a bad request. 404 is for a well-formed id that does not exist, like 999.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "business-rules",
      title: "Business rules and boundary values",
      summary: "Use README section 5 as the test oracle: 409 versus 422, equivalence partitions, boundary values and the order of checks, with parameterized tests.",
      links: [
        { label: "JUnit 5: parameterized tests", href: "https://docs.junit.org/current/user-guide/#writing-tests-parameterized-tests" },
      ],
      body: `
<p>A <strong>test oracle</strong> is whatever tells you the correct result. For Ice HR it is README section 5: every rule with its number (E1 to E17, D1 to D8,
L1 to L13, A1 to A7, T1 to T5), its limits and the exact code you get when it is broken. Before you write a test, find the rule and write the expected answer down. Then
the test only confirms it.</p>

<h3>409 or 422?</h3>
<ul>
<li><strong>409 Conflict</strong>: the request clashes with data that already exists. A duplicate (<code>EMAIL_TAKEN</code>, <code>DEPARTMENT_NAME_TAKEN</code>), a record in the
wrong state (<code>LEAVE_NOT_PENDING</code>, <code>EMPLOYEE_TERMINATED</code>), or something still in use (<code>EMPLOYEE_HAS_REPORTS</code>). The same request might work
if the <em>other</em> data were different.</li>
<li><strong>422 Unprocessable Entity</strong>: the request is well-formed but breaks a rule about its own values. Salary out of range, too young, hire date in the future,
not enough leave left, approver not allowed.</li>
</ul>

<h3>Equivalence partitions and boundary values</h3>
<p>You cannot test every salary. Instead, split the possible inputs into <strong>equivalence partitions</strong>: groups where the system should behave the same, so one
value from each group is enough. Then test the <strong>boundaries</strong>, the values right at the edges of each group, because that is where off-by-one bugs live
(<code>&lt;</code> written instead of <code>&lt;=</code>).</p>
<p><strong>Worked example: salary for job 4 (Software Engineer, 80000 to 115000, both ends allowed, rule E16).</strong></p>
<div class="table-wrap"><table>
<thead><tr><th>Partition</th><th>Values to test</th><th>Expected</th></tr></thead>
<tbody>
<tr><td>Not a valid salary (rule E7)</td><td>0, -1, 95000.5, "95000"</td><td>400 <code>VALIDATION_FAILED</code></td></tr>
<tr><td>Too low</td><td>1 (inside), <strong>79999</strong> (boundary)</td><td>422 <code>SALARY_OUT_OF_RANGE</code></td></tr>
<tr><td>In range</td><td><strong>80000</strong>, 97500, <strong>115000</strong></td><td>201</td></tr>
<tr><td>Too high</td><td><strong>115001</strong> (boundary), 200000</td><td>422 <code>SALARY_OUT_OF_RANGE</code></td></tr>
</tbody></table></div>
<p>Ethan (13) earns exactly 80000, the minimum, so the seed itself shows the lower boundary is allowed.</p>
<p>More boundaries from section 5:</p>
<ul>
<li><strong>Age 18 on the hire date (E14).</strong> Hired on 2024-03-04: born 2006-03-04 (the 18th birthday) is fine, born 2006-03-05 is one day too young:
422 <code>EMPLOYEE_UNDERAGE</code>. These are fixed dates in the past, which is safe: the past does not move.</li>
<li><strong>Hire date not after today (E15).</strong> Today is fine, tomorrow is 422 <code>HIRE_DATE_IN_FUTURE</code>. "Today" means today in Toronto, so build it with
<code>TestData.today()</code>, never with a fixed string.</li>
<li><strong>Leave balance (L13).</strong> PERSONAL leave is 3 days a year. For a new employee, Monday to Wednesday (3 days) is 201 and Monday to Thursday (4 days) is
422 <code>LEAVE_BALANCE_EXCEEDED</code>. Seeded examples: Kevin (23) has exactly 5 vacation days left in 2026, so 5 days is allowed and 6 is not; Fatima (16) has 0.</li>
</ul>

<h3>Parameterized tests</h3>
<p>Writing the same test seven times with different numbers is noise. JUnit 5 runs one method many times with <code>@ParameterizedTest</code> and a source of values:</p>
<ul>
<li><code>@ValueSource(strings = {"E", "eng", "ENGINE"})</code>: one argument per run.</li>
<li><code>@CsvSource({"79999, 422", "80000, 201"})</code>: several arguments per run, comma-separated. JUnit converts each value to the parameter type, including
<code>LocalDate</code> from <code>"2006-03-04"</code>. An empty value becomes <code>null</code>.</li>
<li><code>name = "salary {0} gives {1}"</code> makes each run readable in the report.</li>
</ul>

<h3>Order of checks</h3>
<p>When a request breaks several rules, only the <strong>first</strong> one found is reported. Section 5 gives the order: 400 field checks first (all field errors together),
then 404, then the 409/422 rules in the order of each table. So:</p>
<ul>
<li>Salary 30000 <em>and</em> hire date tomorrow: <code>HIRE_DATE_IN_FUTURE</code> (E15 comes before E16).</li>
<li>Email already taken <em>and</em> salary 30000: <code>SALARY_OUT_OF_RANGE</code>. The 422 rule E16 comes before the 409 rule E17.</li>
<li>Invalid email <em>and</em> job 99: 400 <code>VALIDATION_FAILED</code>. Field checks come before <code>JOB_NOT_FOUND</code>.</li>
</ul>
<p>These are good tests: they catch a developer who reorders the checks.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Testing only the middle of a range (95000) and calling the rule "covered". The bugs are at 79999, 80000, 115000 and 115001.</li>
<li>Combining two broken things in one "negative" test by accident (an invalid email plus a wrong salary) and then believing the salary check was tested.</li>
<li>Writing <code>"2026-12-14"</code> as a "future" date. It will be in the past one day (lesson 13).</li>
<li>Using Kevin's or Fatima's leave for tests that create requests and never cancel them. Their balances are shared by everyone; use your own employee.</li>
<li>Guessing the expected code. Look it up in section 5 first.</li>
</ul></div>`,
      examples: [
        {
          title: "BusinessRulesTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.NewEmployee;
import com.icehr.support.TestData;
import io.restassured.response.Response;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;

@Tag("api")
class BusinessRulesTest {

    private final List<Integer> hired = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        for (Integer id : hired) {
            given().spec(Specs.api()).delete("/employees/{id}", id);   // their leave requests go too
        }
    }

    private Response hire(NewEmployee body) {
        Response response = given().spec(Specs.api()).body(body).when().post("/employees");
        if (response.statusCode() == 201) {
            hired.add(response.path("id"));
        }
        return response;
    }

    /** Job 4 (Software Engineer) pays 80000 to 115000, both ends included. */
    @ParameterizedTest(name = "salary {0} gives {1} {2}")
    @CsvSource({
            "0,      400, VALIDATION_FAILED",     // not a valid salary at all (E7)
            "1,      422, SALARY_OUT_OF_RANGE",   // partition: too low
            "79999,  422, SALARY_OUT_OF_RANGE",   // just below the minimum
            "80000,  201, ",                      // the minimum itself
            "97500,  201, ",                      // partition: inside the range
            "115000, 201, ",                      // the maximum itself
            "115001, 422, SALARY_OUT_OF_RANGE",   // just above the maximum
    })
    void salary_partitions_and_boundaries(int salary, int status, String code) {
        Response response = hire(NewEmployee.valid().withSalary(salary));

        response.then().statusCode(status);
        if (code != null) {
            response.then().body("code", equalTo(code));
        }
    }

    /** NewEmployee.valid() is hired on 2024-03-04, so the 18th birthday must be on or before that day. */
    @ParameterizedTest(name = "born {0} gives {1}")
    @CsvSource({
            "2006-03-03, 201",   // 18 years and 1 day old
            "2006-03-04, 201",   // the 18th birthday itself is fine
            "2006-03-05, 422",   // one day too young
    })
    void at_least_18_on_the_hire_date(LocalDate dateOfBirth, int status) {
        hire(NewEmployee.valid().withDates(dateOfBirth, LocalDate.of(2024, 3, 4)))
                .then().statusCode(status);
    }

    @Test
    void hire_date_today_is_fine_but_tomorrow_is_not() {
        LocalDate today = TestData.today();   // today in Toronto, the date Ice HR uses

        hire(NewEmployee.valid().withDates(LocalDate.of(1995, 6, 15), today))
                .then().statusCode(201)
                .body("hireDate", equalTo(today.toString()));

        hire(NewEmployee.valid().withDates(LocalDate.of(1995, 6, 15), today.plusDays(1)))
                .then().spec(Specs.problem(422, "HIRE_DATE_IN_FUTURE"));
    }

    @Test
    void the_first_broken_rule_wins() {
        LocalDate tomorrow = TestData.today().plusDays(1);

        // Future hire date AND salary too low: E15 is checked before E16
        hire(NewEmployee.valid().withSalary(30000).withDates(LocalDate.of(1995, 6, 15), tomorrow))
                .then().spec(Specs.problem(422, "HIRE_DATE_IN_FUTURE"));

        // Email taken AND salary too low: the 422 rule E16 comes before the 409 rule E17
        hire(NewEmployee.valid().withEmail("ethan.nguyen@icehr.test").withSalary(30000))
                .then().spec(Specs.problem(422, "SALARY_OUT_OF_RANGE"));

        // An invalid field (400) beats every business rule, even a job that does not exist
        hire(NewEmployee.valid().withEmail("not-an-email").withJob(99))
                .then().spec(Specs.problem(400, "VALIDATION_FAILED"));
    }

    @ParameterizedTest(name = "code \\"{0}\\" is rejected")
    @ValueSource(strings = {"E", "eng", "ENGINE", "EN1", "EN G"})
    void department_code_must_be_2_to_5_uppercase_letters(String code) {
        given().spec(Specs.api())
                .body(Map.of("name", "Bad Code " + code, "code", code, "location", "Toronto"))
        .when().post("/departments")
        .then().spec(Specs.problem(400, "VALIDATION_FAILED"))
                .body("errors.field", contains("code"));
    }

    /** PERSONAL allows 3 days a year. A new employee has used none. */
    @ParameterizedTest(name = "{0} PERSONAL days gives {1}")
    @CsvSource({"3, 201", "4, 422"})
    void personal_leave_is_3_days_a_year(int days, int status) {
        int employeeId = hire(NewEmployee.valid()).then().statusCode(201).extract().path("id");
        LocalDate monday = TestData.futureMonday(2);

        given().spec(Specs.api())
                .body(Map.of(
                        "employeeId", employeeId,
                        "type", "PERSONAL",
                        "startDate", monday.toString(),
                        "endDate", monday.plusDays(days - 1).toString()))   // Monday + 2 = Wednesday: 3 weekdays
        .when().post("/leave-requests")
        .then().statusCode(status);
    }
}`,
        },
        {
          title: "A boundary-value table to fill in before you code",
          lang: "text",
          code: `
Rule  Input                       Partition / boundary      Expected (from README section 5)
E16   salary 79999, job 4         just below min            422 SALARY_OUT_OF_RANGE
E16   salary 80000, job 4         min (allowed)             201
E16   salary 115000, job 4        max (allowed)             201
E16   salary 115001, job 4        just above max            422 SALARY_OUT_OF_RANGE
E14   born 2006-03-04, hired 2024-03-04   18th birthday     201
E14   born 2006-03-05, hired 2024-03-04   one day short     422 EMPLOYEE_UNDERAGE
E15   hireDate = today (Toronto)          boundary          201
E15   hireDate = today + 1                just after        422 HIRE_DATE_IN_FUTURE
L13   PERSONAL Mon-Wed (3 days), new employee   all of it   201
L13   PERSONAL Mon-Thu (4 days), new employee   one too many  422 LEAVE_BALANCE_EXCEEDED`,
        },
      ],
      exercises: [
        `Build a partition and boundary table for job 15 (Support Agent, 40000 to 60000), then turn it into one <code>@ParameterizedTest</code> with <code>@CsvSource</code>. Use <code>NewEmployee.valid().withJob(15)</code> and remember the salary must change too.`,
        `Test the 29 February rule (E14): someone born on 2008-02-29 is 18 on 2026-02-28. Write the two or three boundary cases with fixed past dates.`,
        `Kevin Singh (23) has 5 vacation days left in 2026. Write a test that requests 6 days for him in a week of 2026 that is still in the future and expects <code>LEAVE_BALANCE_EXCEEDED</code>. Explain in a comment why this test only works while that week is in 2026 and in the future.`,
        `Write three "order of checks" tests for <code>POST /leave-requests</code>: for each, break two rules at once and predict which code wins from the L-table before running it.`,
        `Write a <code>@ValueSource</code> test with five invalid phone numbers. Include at least one that looks almost right.`,
      ],
      quiz: [
        {
          q: `You hire someone with an email that is already used <em>and</em> a salary below the job's minimum. What does Ice HR answer?`,
          options: [`422 <code>SALARY_OUT_OF_RANGE</code>: rule E16 is checked before E17`, `409 <code>EMAIL_TAKEN</code>`, `400 <code>VALIDATION_FAILED</code> with both`, `Both errors in one response`],
          answer: 0,
          explain: `Only the first broken rule is reported, and the employee table lists the salary range (E16) before the unique email (E17).`,
        },
        {
          q: `Job 4 allows 80000 to 115000, both ends included. Which set of salaries tests the upper boundary best?`,
          options: [`100000 and 200000`, `115000 only`, `114000 and 116000`, `115000 (expect 201) and 115001 (expect 422)`],
          answer: 3,
          explain: `Test the edge itself and the first value past it. 114000 and 116000 would miss a bug where 115000 is wrongly rejected.`,
        },
        {
          q: `Which situation is a 409 rather than a 422 in Ice HR?`,
          options: [`A 17-year-old is hired`, `Approving a leave request that is already APPROVED (<code>LEAVE_NOT_PENDING</code>)`, `Salary 30000 for a Software Engineer`, `A hire date tomorrow`],
          answer: 1,
          explain: `409 is a conflict with the current state of existing data. The others break a rule about the values you sent: 422.`,
        },
        {
          q: `In a <code>@CsvSource</code> row <code>"80000, 201, "</code>, what does the empty third value become for a <code>String</code> parameter?`,
          options: [`An empty string <code>""</code>`, `The text <code>null</code>`, `<code>null</code>`, `The test fails to start`],
          answer: 2,
          explain: `An empty, unquoted value is converted to <code>null</code>. Write <code>''</code> if you really want an empty string.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "specs-logging",
      title: "Reusable specifications and logging",
      summary: "Put shared request settings and common checks in RequestSpecification and ResponseSpecification objects, and log exactly what you need.",
      body: `
<p>After a few lessons your tests repeat the same lines: base URL, base path, JSON headers, "status 200 and JSON". REST Assured lets you put such lines into
<strong>specifications</strong> and reuse them.</p>
<ul>
<li>A <strong>RequestSpecification</strong> is a ready-made <code>given()</code> part: base URI, base path, headers, content type, config. Use it with
<code>given().spec(…)</code>.</li>
<li>A <strong>ResponseSpecification</strong> is a ready-made set of checks: status, headers, body fields. Use it with <code>then().spec(…)</code>.</li>
</ul>
<p>You build them with <code>RequestSpecBuilder</code> and <code>ResponseSpecBuilder</code>, then call <code>.build()</code>.</p>

<h3>The starter's Specs class</h3>
<div class="table-wrap"><table>
<thead><tr><th>Method</th><th>What it contains</th></tr></thead>
<tbody>
<tr><td><code>Specs.api()</code></td><td>Base URI from <code>Config.baseUrl()</code> (so <code>-DbaseUrl</code> works), base path <code>/api/v1</code>, <code>Content-Type</code> and <code>Accept</code> JSON,
Jackson from <code>Json.MAPPER</code>, and logging when a check fails</td></tr>
<tr><td><code>Specs.ok()</code></td><td>Status 200, JSON content type, a non-empty <code>X-Request-Id</code> header</td></tr>
<tr><td><code>Specs.problem(status, code)</code></td><td>That status, <code>Content-Type</code> starting with <code>application/problem+json</code>, and the body's <code>status</code> and <code>code</code></td></tr>
</tbody></table></div>
<p>A spec does not stop you from adding more: <code>given().spec(Specs.api()).queryParam("size", 5)</code> and
<code>then().spec(Specs.ok()).body("totalElements", equalTo(60))</code> both work. Settings you add after the spec win over the spec's own, which is how the 415 test in
lesson 7 overrides the content type.</p>

<h3>Building your own</h3>
<p>Good candidates are checks you write again and again:</p>
<ul>
<li><code>created("departments")</code>: 201, JSON, a <code>Location</code> matching <code>/api/v1/departments/\\d+</code>, an id above 1000.</li>
<li><code>PAGE</code>: everything in <code>Specs.ok()</code> plus the paging fields. <code>addResponseSpecification(Specs.ok())</code> copies the starter's checks into yours.</li>
<li><code>apiWithRequestId("…")</code>: <code>Specs.api()</code> plus your own <code>X-Request-Id</code>, built with <code>addRequestSpecification(Specs.api())</code>.</li>
</ul>
<p>Start them as private methods in a test class (as in the example). When a second class needs one, move it into <code>Specs</code>.</p>

<h3>Logging</h3>
<p>When a test fails you want to see what was sent and what came back. REST Assured can print both:</p>
<div class="table-wrap"><table>
<thead><tr><th>Where</th><th>Call</th><th>Prints</th></tr></thead>
<tbody>
<tr><td>after <code>given()</code></td><td><code>.log().all()</code></td><td>the whole request: method, URI, headers, body</td></tr>
<tr><td>after <code>given()</code></td><td><code>.log().uri()</code>, <code>.log().body()</code>, <code>.log().headers()</code></td><td>only that part of the request</td></tr>
<tr><td>after <code>then()</code></td><td><code>.log().all()</code>, <code>.log().body()</code></td><td>the response, every time</td></tr>
<tr><td>after <code>then()</code></td><td><code>.log().ifValidationFails()</code></td><td>the response, only if a later check fails</td></tr>
<tr><td>after <code>then()</code></td><td><code>.log().ifError()</code></td><td>the response, only if the status is 400 or more</td></tr>
</tbody></table></div>
<p>You rarely need these in Ice HR tests, because <code>Specs.api()</code> already sets a <code>LogConfig</code> with
<code>enableLoggingOfRequestAndResponseIfValidationFails()</code> and pretty printing. When any check fails, the console shows the request and the response, nicely
indented, right above the error. Green tests stay quiet. Add <code>.log().all()</code> only while you are writing or debugging a test, then remove it.</p>

<h3>Worked example: one failing check, fully explained</h3>
<p>Suppose you expect Aisha's last name to be "Rahmann" (a typo). The test fails and the console shows: the request (<code>GET http://localhost:8080/api/v1/employees/9</code>,
with the <code>Accept</code> and <code>Content-Type</code> headers from the spec), the response (<code>HTTP/1.1 200 OK</code>, its headers including <code>X-Request-Id</code>,
and the pretty-printed JSON with <code>"lastName": "Rahman"</code>), and then <code>JSON path lastName doesn't match. Expected: Rahmann Actual: Rahman</code>. You see at once
that the server is right and the test is wrong. Without that log you would have to rerun the request by hand.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Leaving <code>.log().all()</code> in every test. The output becomes so long that nobody reads it, and the one useful log is lost.</li>
<li>Putting test-specific checks into a shared spec ("salary is 80000" in <code>Specs.ok()</code>). Specs hold what is true for <em>every</em> call of that kind.</li>
<li>Copying the settings of <code>Specs.api()</code> into each test class. When the base path or a header changes, you edit forty files instead of one.</li>
<li>Calling <code>RestAssured.baseURI = …</code> in a test. That changes a global setting for every test that runs after it. Use a spec instead.</li>
</ul></div>`,
      examples: [
        {
          title: "The starter's api/Specs.java",
          lang: "java",
          code: `
package com.icehr.api;

import com.icehr.config.Config;
import com.icehr.support.Json;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.config.LogConfig;
import io.restassured.config.ObjectMapperConfig;
import io.restassured.config.RestAssuredConfig;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;

/**
 * Shared request and response specifications, so tests do not repeat the base URL, headers and logging.
 *
 * <pre>
 * given().spec(Specs.api())
 * .when().get("/employees/13")
 * .then().spec(Specs.ok());
 * </pre>
 */
public final class Specs {

    private Specs() {
    }

    /**
     * Jackson with java.time support for bodies (see Json), and: when a check fails, print the whole
     * request and response to the console so you can see what went wrong.
     */
    private static final RestAssuredConfig CONFIG = RestAssuredConfig.config()
            .objectMapperConfig(ObjectMapperConfig.objectMapperConfig().jackson2ObjectMapperFactory((type, charset) -> Json.MAPPER))
            .logConfig(LogConfig.logConfig().enableLoggingOfRequestAndResponseIfValidationFails().enablePrettyPrinting(true));

    /** Base URL + /api/v1, JSON in and out, our Jackson setup and logging when a check fails. */
    public static RequestSpecification api() {
        return new RequestSpecBuilder()
                .setBaseUri(Config.baseUrl())
                .setBasePath("/api/v1")
                .setContentType(ContentType.JSON)
                .setAccept(ContentType.JSON)
                .setConfig(CONFIG)
                .build();
    }

    /** 200 with a JSON body. */
    public static ResponseSpecification ok() {
        return new ResponseSpecBuilder()
                .expectStatusCode(200)
                .expectContentType(ContentType.JSON)
                .expectHeader("X-Request-Id", not(emptyOrNullString()))
                .build();
    }

    /** An RFC 7807 error with this status and code, e.g. problem(422, "SALARY_OUT_OF_RANGE"). */
    public static ResponseSpecification problem(int status, String code) {
        return new ResponseSpecBuilder()
                .expectStatusCode(status)
                .expectHeader("Content-Type", startsWith("application/problem+json"))
                .expectBody("status", equalTo(status))
                .expectBody("code", equalTo(code))
                .build();
    }
}`,
        },
        {
          title: "ReusableSpecsTest.java: using the starter specs, building your own, and logging",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Random;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.notNullValue;

@Tag("api")
class ReusableSpecsTest {

    /** Specs.api() plus your own X-Request-Id, so you can find this test's calls in the Ice HR terminal. */
    private static RequestSpecification apiWithRequestId(String requestId) {
        return new RequestSpecBuilder()
                .addRequestSpecification(Specs.api())
                .addHeader("X-Request-Id", requestId)
                .build();
    }

    /** 201 Created, JSON, a Location that points to the new record, and a new id (1001 or more). */
    private static ResponseSpecification created(String collection) {
        return new ResponseSpecBuilder()
                .expectStatusCode(201)
                .expectContentType(ContentType.JSON)
                .expectHeader("Location", matchesPattern("/api/v1/" + collection + "/\\\\d+"))
                .expectBody("id", greaterThan(1000))
                .build();
    }

    /** A paged list: everything Specs.ok() checks, plus the paging fields. */
    private static final ResponseSpecification PAGE = new ResponseSpecBuilder()
            .addResponseSpecification(Specs.ok())
            .expectBody("content", notNullValue())
            .expectBody("page", greaterThanOrEqualTo(0))
            .expectBody("totalElements", greaterThanOrEqualTo(0))
            .build();

    @Test
    void the_starter_specs() {
        given().spec(Specs.api())
        .when().get("/employees/9")
        .then().spec(Specs.ok())
                .body("lastName", equalTo("Rahman"));

        given().spec(Specs.api())
        .when().get("/employees/9999")
        .then().spec(Specs.problem(404, "NOT_FOUND"));
    }

    @Test
    void my_own_specs() {
        given().spec(apiWithRequestId("specs-lesson-paging"))
                .queryParam("size", 10)
        .when().get("/leave-requests")
        .then().spec(PAGE)
                .header("X-Request-Id", equalTo("specs-lesson-paging"))
                .body("size", equalTo(10));

        String code = randomCode();
        Response response = given().spec(Specs.api())
                .body(Map.of("name", "Specs " + code, "code", code, "location", "Ottawa"))
        .when().post("/departments");
        try {
            response.then().spec(created("departments"))
                    .body("location", equalTo("Ottawa"));
        } finally {
            if (response.statusCode() == 201) {
                int id = response.path("id");
                given().spec(Specs.api()).delete("/departments/{id}", id);
            }
        }
    }

    @Test
    void logging_requests_and_responses() {
        given().spec(Specs.api())
                .log().all()                    // print the whole request before sending it
        .when().get("/jobs/8")
        .then()
                .log().ifValidationFails()      // print the response only if a check below fails
                .statusCode(200)
                .body("title", equalTo("HR Manager"));

        given().spec(Specs.api())
                .log().uri()                    // just the URL, handy for checking query parameters
                .queryParam("search", "rahman")
        .when().get("/employees")
        .then()
                .log().body()                   // just the response body
                .statusCode(200);
    }

    private static String randomCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            code.append((char) ('A' + random.nextInt(26)));
        }
        return code.toString();
    }
}`,
        },
      ],
      exercises: [
        `Write a <code>created(String collection)</code> response spec and use it in two tests: one creating a department, one hiring an employee. Clean up both.`,
        `Write a <code>PAGE</code> response spec and use it on <code>/employees</code> and <code>/leave-requests</code>. Add a check that <code>size</code> equals the size you asked for.`,
        `Make a check fail on purpose in a test that uses <code>Specs.api()</code>, and copy the logged request and response into your notes. Mark the <code>X-Request-Id</code> you would put into a bug report.`,
        `Add <code>.log().uri()</code> to a request with three query parameters, one of them containing a space. Note the exact URL.`,
        `Move one of your helper specs into the starter's <code>Specs</code> class as a <code>public static</code> method and use it from two different test classes.`,
      ],
      quiz: [
        {
          q: `What does <code>then().spec(Specs.ok())</code> check?`,
          options: [`Only that the status is 200`, `Status 200, a JSON body and a matching salary`, `Status 200, JSON content type and a non-empty <code>X-Request-Id</code> header`, `That the response came in under one second`],
          answer: 2,
          explain: `Look at <code>Specs.ok()</code>: <code>expectStatusCode(200)</code>, <code>expectContentType(ContentType.JSON)</code> and <code>expectHeader("X-Request-Id", not(emptyOrNullString()))</code>.`,
        },
        {
          q: `You use <code>given().spec(Specs.api())</code> and no logging of your own. A check fails. What do you see in the console?`,
          options: [`Only the assertion message`, `The request and the response, pretty-printed, then the assertion message`, `Nothing until you add <code>.log().all()</code>`, `Only the response body`],
          answer: 1,
          explain: `<code>Specs.api()</code> sets a <code>LogConfig</code> with <code>enableLoggingOfRequestAndResponseIfValidationFails()</code>. Green tests stay quiet.`,
        },
        {
          q: `Which call adds the starter's request settings to your own <code>RequestSpecBuilder</code>?`,
          options: [`<code>.setBaseUri(Specs.api())</code>`, `<code>.addFilter(Specs.api())</code>`, `<code>.spec(Specs.api())</code>`, `<code>.addRequestSpecification(Specs.api())</code>`],
          answer: 3,
          explain: `<code>addRequestSpecification</code> merges another spec into the one you are building. <code>ResponseSpecBuilder</code> has <code>addResponseSpecification</code> for checks.`,
        },
        {
          q: `Where does <code>.log().ifValidationFails()</code> belong, and what does it print?`,
          options: [`After <code>then()</code>; it prints the response only if one of the following checks fails`, `After <code>given()</code>; it prints every request`, `After <code>when()</code>; it prints the URL`, `Anywhere; it prints only failing status codes`],
          answer: 0,
          explain: `On the response side it waits for the checks. If they all pass, nothing is printed.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "java-objects",
      title: "Java objects instead of JSON paths",
      summary: "Turn JSON into Java records with Jackson (and back), read pages and lists with TypeRef, and check whole objects with AssertJ.",
      links: [
        { label: "AssertJ: assertions on collections", href: "https://assertj.github.io/doc/#assertj-core-group-assertions" },
      ],
      body: `
<p>JSON paths are quick for one or two fields. When a test cares about many fields, or passes data from one call to the next, it is easier to work with a
<strong>Java object</strong>: the compiler knows the field names and types, your IDE completes them, and AssertJ can compare whole objects.</p>

<h3>Records and Jackson</h3>
<p>The starter's <code>model</code> package holds <strong>records</strong>: short classes with final fields where Java writes the constructor, the accessors
(<code>employee.salary()</code>), <code>equals</code> and <code>toString</code> for you. <code>Employee</code> has the same field names as the JSON:
<code>id</code>, <code>firstName</code>, …, <code>hireDate</code>, <code>createdAt</code>.</p>
<p><strong>Jackson</strong> is the library that converts between JSON and Java objects. JSON to object is <em>deserializing</em>; object to JSON is <em>serializing</em>. REST
Assured calls Jackson for you:</p>
<ul>
<li><code>.extract().as(Employee.class)</code> reads the body into an <code>Employee</code>.</li>
<li><code>.body(NewEmployee.valid())</code> writes a record as the request body.</li>
</ul>

<h3>Dates: why the Json mapper matters</h3>
<p>Ice HR sends dates as <code>"2016-09-12"</code> and date-times as <code>"2016-09-12T09:00:00-04:00"</code>. The records use <code>LocalDate</code> and
<code>OffsetDateTime</code> for them, so you can compare and calculate with real dates. Plain Jackson does not know these types. The starter's <code>Json.MAPPER</code>
registers the <code>JavaTimeModule</code>, writes dates as <code>"YYYY-MM-DD"</code> strings, and keeps the <code>-04:00</code> / <code>-05:00</code> offset Ice HR sent.
<code>Specs.api()</code> tells REST Assured to use that mapper. If you build a request <em>without</em> <code>Specs.api()</code> and send a <code>NewEmployee</code>, the
dates are not written as <code>"YYYY-MM-DD"</code> strings and Ice HR answers 400: <code>dateOfBirth</code> and <code>hireDate</code> "must be a date in the format YYYY-MM-DD".</p>

<h3>Why ignoreUnknown = true</h3>
<p>Every response record has <code>@JsonIgnoreProperties(ignoreUnknown = true)</code>. Without it, Jackson fails when the JSON has a field the record does not have. If the
API adds a field next month, hundreds of tests would break for no reason. With it, unknown fields are skipped. It also lets you write tiny records with only the fields one
test needs, such as <code>record JobTitle(int id, String title)</code> in the example.</p>

<h3>Generic types: TypeRef</h3>
<p><code>Page&lt;Employee&gt;</code> and <code>List&lt;Department&gt;</code> are <em>generic</em> types. Java forgets the part in angle brackets at run time, so
<code>.as(Page.class)</code> would give pages of plain maps. Wrap the type in a <code>TypeRef</code> (an anonymous subclass, note the <code>{ }</code>):</p>
<pre><code>Page&lt;Employee&gt; page = …extract().as(new TypeRef&lt;Page&lt;Employee&gt;&gt;() { });
List&lt;Department&gt; all = …extract().as(new TypeRef&lt;List&lt;Department&gt;&gt;() { });</code></pre>

<h3>AssertJ on objects</h3>
<p>Once the data is in objects, AssertJ (<code>assertThat</code> from <code>org.assertj.core.api.Assertions</code>) gives readable checks with clear failure messages:</p>
<ul>
<li><code>assertThat(page.content()).extracting(Employee::id).contains(13, 14, 15, 16, 17)</code>: pull one field out of every item, then check the list.</li>
<li><code>.extracting(Employee::managerId).containsOnly(9)</code>: every value is 9 (duplicates are fine).</li>
<li><code>.extracting(Employee::lastName, Employee::salary).contains(tuple("Nguyen", 80000))</code>: several fields at once.</li>
<li><code>.filteredOn(d -&gt; d.id() &lt; 1000)</code>: keep only seeded records before checking.</li>
<li><code>.singleElement().satisfies(…)</code>: exactly one item, then checks on it.</li>
<li><code>assertThat(saved).usingRecursiveComparison().ignoringFields("id", "createdAt", …).isEqualTo(sent)</code>: compare two objects field by field, by name.</li>
</ul>

<h3>Worked example: Aisha as an object</h3>
<p><code>GET /employees/9</code> becomes an <code>Employee</code> with <code>firstName()</code> "Aisha", <code>salary()</code> 150000 (the maximum for job 3, Senior Software
Engineer), <code>managerId()</code> 2, <code>terminationDate()</code> null, <code>hireDate()</code> equal to <code>LocalDate.of(2016, 9, 12)</code>, and <code>createdAt()</code>
with offset <code>-04:00</code> (September is summer time in Toronto). Because <code>hireDate()</code> is a real date, you can write
<code>assertThat(aisha.hireDate()).isBefore(TestData.today())</code>; with a JSON path you would only have a string.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li><code>.as(Page.class)</code> or <code>.as(List.class)</code> without a <code>TypeRef</code>: you get maps, and a <code>ClassCastException</code> later.</li>
<li>A record field named differently from the JSON (<code>first_name</code>, <code>surname</code>). With <code>ignoreUnknown</code> it silently stays <code>null</code>.</li>
<li>Using <code>int</code> for a field that can be <code>null</code> (<code>managerId</code>). Jackson cannot put <code>null</code> into an <code>int</code>; the records use
<code>Integer</code> for that reason.</li>
<li>Comparing <code>OffsetDateTime</code> values with Java's <code>equals()</code>. <code>10:00-04:00</code> and <code>14:00Z</code> are the same moment, but
<code>equals()</code> says false because the offsets differ. Use <code>isEqual()</code>, compare <code>toInstant()</code>, or let AssertJ's <code>isEqualTo</code> do it (it
compares the moment).</li>
<li>Sending a record without <code>Specs.api()</code>, so the starter's Jackson setup is not used.</li>
</ul></div>`,
      examples: [
        {
          title: "JavaObjectsTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.icehr.api.Specs;
import com.icehr.model.Department;
import com.icehr.model.Employee;
import com.icehr.model.NewEmployee;
import com.icehr.model.Page;
import io.restassured.common.mapper.TypeRef;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

@Tag("api")
class JavaObjectsTest {

    /** Only the fields this test needs. ignoreUnknown = true: minSalary and maxSalary are skipped. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record JobTitle(int id, String title) {
    }

    @Test
    void one_employee_as_a_record() {
        Employee aisha = given().spec(Specs.api())
        .when().get("/employees/9")
        .then().spec(Specs.ok())
                .extract().as(Employee.class);

        assertThat(aisha.firstName()).isEqualTo("Aisha");
        assertThat(aisha.salary()).isEqualTo(150000);
        assertThat(aisha.terminationDate()).isNull();
        assertThat(aisha.hireDate()).isEqualTo(LocalDate.of(2016, 9, 12));             // a real LocalDate
        assertThat(aisha.createdAt().getOffset()).isEqualTo(ZoneOffset.ofHours(-4));  // Toronto summer time
    }

    @Test
    void a_page_of_employees_with_a_type_ref() {
        Page<Employee> page = given().spec(Specs.api())
                .queryParam("managerId", 9)
        .when().get("/employees")
        .then().spec(Specs.ok())
                .extract().as(new TypeRef<Page<Employee>>() { });

        assertThat(page.totalElements()).isGreaterThanOrEqualTo(5);
        assertThat(page.content())
                .extracting(Employee::id)
                .contains(13, 14, 15, 16, 17);
        assertThat(page.content())
                .extracting(Employee::managerId)
                .containsOnly(9);
        assertThat(page.content())
                .extracting(Employee::lastName, Employee::salary)
                .contains(tuple("Nguyen", 80000));
    }

    @Test
    void a_plain_array_as_a_list() {
        List<Department> departments = given().spec(Specs.api())
        .when().get("/departments")
        .then().spec(Specs.ok())
                .extract().as(new TypeRef<List<Department>>() { });

        assertThat(departments)
                .filteredOn(d -> d.id() < 1000)                 // only the seeded ones
                .extracting(Department::code)
                .containsExactly("EXEC", "ENG", "QA", "PROD", "HR", "FIN", "SALES", "SUP", "LAB");
        assertThat(departments)
                .filteredOn(d -> d.code().equals("LAB"))
                .singleElement()
                .satisfies(lab -> {
                    assertThat(lab.employeeCount()).isZero();
                    assertThat(lab.managerId()).isNull();
                });
    }

    @Test
    void a_small_record_of_your_own() {
        List<JobTitle> jobs = given().spec(Specs.api())
        .when().get("/jobs")
        .then().spec(Specs.ok())
                .extract().as(new TypeRef<List<JobTitle>>() { });

        assertThat(jobs).hasSize(15).contains(new JobTitle(8, "HR Manager"));
    }

    @Test
    void send_a_record_and_compare_what_comes_back() {
        NewEmployee sent = NewEmployee.valid().withSalary(88000);

        Employee saved = given().spec(Specs.api())
                .body(sent)                                     // Jackson writes the record as JSON
        .when().post("/employees")
        .then().statusCode(201)
                .extract().as(Employee.class);
        try {
            assertThat(saved)
                    .usingRecursiveComparison()
                    .ignoringFields("id", "regionId", "status", "terminationDate", "createdAt", "updatedAt")
                    .isEqualTo(sent);                           // same names, same values
            assertThat(saved.status()).isEqualTo("ACTIVE");
            assertThat(saved.regionId()).isEqualTo(1);           // the server works it out from countryCode "CA"
            assertThat(saved.id()).isGreaterThan(1000);
        } finally {
            given().spec(Specs.api()).delete("/employees/{id}", saved.id());
        }
    }
}`,
        },
        {
          title: "The starter's support/Json.java (used by Specs.api())",
          lang: "java",
          code: `
package com.icehr.support;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * The one Jackson ObjectMapper used for request and response bodies.
 * It knows java.time: LocalDate is written as "2026-11-05", and OffsetDateTime keeps the offset the API sent.
 */
public final class Json {

    public static final ObjectMapper MAPPER = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE);

    private Json() {
    }
}`,
        },
      ],
      exercises: [
        `Read leave request 33 into the starter's <code>LeaveRequest</code> record. Check <code>status</code>, <code>days</code>, <code>approverId</code>, and that <code>startDate()</code> is a <code>LocalDate</code> equal to 2026-12-07.`,
        `Read <code>GET /leave-requests?status=PENDING</code> into a <code>Page&lt;LeaveRequest&gt;</code> and check with AssertJ that <code>extracting(LeaveRequest::id)</code> contains 25 to 32 and every <code>approverId</code> is null.`,
        `Write your own small record <code>DeptStat</code> for <code>GET /reports/department-stats</code> with only the fields you need, and check the headcount of department 2.`,
        `Hire an employee with a record body, read the response into <code>Employee</code>, and compare it to what you sent with <code>usingRecursiveComparison()</code>. Make it fail once by changing one value, and read AssertJ's message.`,
        `Remove <code>@JsonIgnoreProperties</code> from your small record and run the test again. Write down the exception name and the field Jackson complains about, then put the annotation back.`,
      ],
      quiz: [
        {
          q: `Why does <code>Employee</code> have <code>@JsonIgnoreProperties(ignoreUnknown = true)</code>?`,
          options: [`To skip null fields`, `So the test keeps working when the JSON has fields the record does not, for example after the API adds one`, `To make Jackson faster`, `Because records cannot have annotations otherwise`],
          answer: 1,
          explain: `Without it, Jackson fails with an "unrecognized field" error for every field it does not know.`,
        },
        {
          q: `How do you read <code>GET /employees</code> into a <code>Page&lt;Employee&gt;</code>?`,
          options: [`<code>.extract().as(new TypeRef&lt;Page&lt;Employee&gt;&gt;() { })</code>`, `<code>.extract().as(Page.class)</code>`, `<code>.extract().as(Employee[].class)</code>`, `<code>.extract().path("content")</code>`],
          answer: 0,
          explain: `The <code>TypeRef</code> keeps the full generic type, so the items become <code>Employee</code> records instead of maps.`,
        },
        {
          q: `<code>assertThat(page.content()).extracting(Employee::managerId).containsOnly(9)</code>. When does it pass?`,
          options: [`When the first employee's manager is 9`, `When exactly one employee has manager 9`, `When the list contains 9 at least once`, `When every employee in the list has manager 9`],
          answer: 3,
          explain: `<code>containsOnly</code> means the list holds no value other than 9 (repeats are fine). <code>contains(9)</code> would mean "at least once".`,
        },
        {
          q: `You post a <code>NewEmployee</code> with plain <code>given().baseUri(…).contentType(ContentType.JSON)</code>, without <code>Specs.api()</code>. Ice HR answers 400 for <code>dateOfBirth</code> and <code>hireDate</code>. Why?`,
          options: [`The dates are in the future`, `Ice HR needs an Accept header`, `REST Assured's default Jackson does not write <code>LocalDate</code> as <code>"YYYY-MM-DD"</code>; <code>Specs.api()</code> plugs in <code>Json.MAPPER</code>, which does`, `<code>NewEmployee</code> leaves the dates out`],
          answer: 2,
          explain: `<code>Json.MAPPER</code> registers <code>JavaTimeModule</code> and turns off <code>WRITE_DATES_AS_TIMESTAMPS</code>. Use <code>Specs.api()</code> for every request with a body.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "json-schema",
      title: "JSON schema validation",
      summary: "Check the shape of a whole response at once with a JSON schema, and write a schema for a leave request.",
      links: [
        { label: "Understanding JSON Schema", href: "https://json-schema.org/understanding-json-schema/" },
      ],
      body: `
<p>Your assertions so far check <strong>values</strong>: Ethan's salary is 80000. A <strong>JSON schema</strong> checks the <strong>shape</strong>: every employee has an
<code>id</code> that is an integer, a <code>phone</code> that is a string in the format <code>416-555-0100</code> or <code>null</code>, a <code>status</code> that is ACTIVE or
TERMINATED, and no fields beyond the known ones. A schema is itself a JSON document that describes other JSON.</p>

<h3>What each one catches</h3>
<div class="table-wrap"><table>
<thead><tr><th>A schema catches</th><th>Assertions catch</th></tr></thead>
<tbody>
<tr><td>A field that disappeared or was renamed (<code>required</code>)</td><td>A wrong value: salary 85000 instead of 80000</td></tr>
<tr><td>A wrong type: <code>"salary": "80000"</code> instead of <code>80000</code></td><td>A wrong record: employee 14 returned for 13</td></tr>
<tr><td>A new, unexpected field, maybe a leak like <code>"password"</code> (<code>additionalProperties: false</code>)</td><td>Business results: balance went from 20 to 15</td></tr>
<tr><td>A value outside a fixed set (<code>enum</code>) or format (<code>pattern</code>)</td><td>Relations between fields and between calls</td></tr>
</tbody></table></div>
<p>You need both. A schema is cheap to apply to every response of a kind (every employee, every leave request), so it finds contract breaks in places you never wrote a
specific check for.</p>

<h3>The starter's employee schema</h3>
<p><code>src/test/resources/schemas/employee.json</code> describes an employee. The important keywords:</p>
<ul>
<li><code>"type": "object"</code> and <code>"required": […]</code>: these fields must be present (with any value, even <code>null</code>).</li>
<li><code>"properties"</code>: the rule for each field. <code>{"type": "integer", "minimum": 1}</code> for <code>id</code>; <code>{"type": ["string", "null"], "pattern": …}</code>
for <code>phone</code> (a <code>pattern</code> only applies to strings, so <code>null</code> passes); <code>{"enum": ["ACTIVE", "TERMINATED"]}</code> for <code>status</code>.</li>
<li><code>"additionalProperties": false</code>: any other field is an error.</li>
</ul>
<p>Use it with <code>.body(matchesJsonSchemaInClasspath("schemas/employee.json"))</code>, imported from
<code>io.restassured.module.jsv.JsonSchemaValidator</code>. The path is relative to <code>src/test/resources</code>. For a schema in a Java string use
<code>matchesJsonSchema(text)</code>.</p>

<h3>Worked example: a schema for a leave request</h3>
<p>Look at a real one first. <code>GET /api/v1/leave-requests/5</code> (a rejected request):</p>
<pre><code>{"id":5,"employeeId":54,"type":"VACATION","startDate":"2025-12-22","endDate":"2025-12-31","days":8,
 "reason":"Holidays with family","status":"REJECTED","approverId":8,"decisionReason":"Holiday coverage is already full.",
 "decidedAt":"2025-12-09T14:00:00-05:00","createdAt":"2025-12-08T10:30:00-05:00","updatedAt":"2025-12-09T14:00:00-05:00"}</code></pre>
<p>And a pending one, <code>GET /leave-requests/25</code>: <code>approverId</code>, <code>decisionReason</code> and <code>decidedAt</code> are <code>null</code>. So:</p>
<ol>
<li>All 13 fields are always present: list them all in <code>required</code>.</li>
<li><code>type</code> and <code>status</code> come from fixed lists: use <code>enum</code> (README section 4 and 5).</li>
<li>Dates are <code>YYYY-MM-DD</code> strings: <code>pattern</code>.</li>
<li><code>days</code> is a whole number of at least 1 (the database requires <code>days &gt; 0</code>).</li>
<li><code>reason</code>, <code>approverId</code>, <code>decisionReason</code>, <code>decidedAt</code> can be <code>null</code>: give them two types, like <code>["integer", "null"]</code>.</li>
<li>Nothing else is allowed: <code>additionalProperties: false</code>.</li>
</ol>
<p>Save it as <code>src/test/resources/schemas/leave-request.json</code> (first example below) and validate requests 25 and 5 against it. Test the schema too: change
<code>"days"</code> to <code>"type": "string"</code> and check the test goes red. A schema that never fails proves nothing.</p>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Forgetting <code>additionalProperties: false</code>. Then a renamed field (<code>hire_date</code> next to a missing <code>hireDate</code>) is only caught if the old name is in
<code>required</code>.</li>
<li>Making a nullable field only <code>"type": "string"</code>. The first pending request with <code>"reason": null</code> fails.</li>
<li>Using newer keywords. The validator inside REST Assured follows the older <em>draft-04</em> rules: keywords such as <code>const</code> are silently ignored, and
<code>"format": "date"</code> is not checked. Use <code>enum</code> with one value and <code>pattern</code> instead.</li>
<li>Putting the schema in <code>src/test/java</code>. It must be in <code>src/test/resources</code> to be on the classpath.</li>
<li>Thinking a schema replaces value checks. It knows nothing about Ethan's salary.</li>
</ul></div>`,
      examples: [
        {
          title: "src/test/resources/schemas/leave-request.json",
          lang: "json",
          code: `
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LeaveRequest",
  "type": "object",
  "required": ["id", "employeeId", "type", "startDate", "endDate", "days", "reason", "status",
               "approverId", "decisionReason", "decidedAt", "createdAt", "updatedAt"],
  "properties": {
    "id": { "type": "integer", "minimum": 1 },
    "employeeId": { "type": "integer", "minimum": 1 },
    "type": { "enum": ["VACATION", "SICK", "PERSONAL"] },
    "startDate": { "type": "string", "pattern": "^\\\\d{4}-\\\\d{2}-\\\\d{2}$" },
    "endDate": { "type": "string", "pattern": "^\\\\d{4}-\\\\d{2}-\\\\d{2}$" },
    "days": { "type": "integer", "minimum": 1 },
    "reason": { "type": ["string", "null"], "maxLength": 200 },
    "status": { "enum": ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] },
    "approverId": { "type": ["integer", "null"] },
    "decisionReason": { "type": ["string", "null"] },
    "decidedAt": { "type": ["string", "null"] },
    "createdAt": { "type": "string" },
    "updatedAt": { "type": "string" }
  },
  "additionalProperties": false
}`,
        },
        {
          title: "SchemaValidationTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchema;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;

@Tag("api")
class SchemaValidationTest {

    @Test
    void an_employee_with_no_phone_matches_the_starter_schema() {
        given().spec(Specs.api())
        .when().get("/employees/{id}", 20)            // employee 20 has "phone": null
        .then().spec(Specs.ok())
                .body(matchesJsonSchemaInClasspath("schemas/employee.json"));
    }

    @Test
    void pending_and_rejected_leave_match_my_schema() {
        for (int id : new int[] {25, 5}) {             // 25 is PENDING, 5 is REJECTED with a reason
            given().spec(Specs.api())
            .when().get("/leave-requests/{id}", id)
            .then().spec(Specs.ok())
                    .body(matchesJsonSchemaInClasspath("schemas/leave-request.json"));
        }
    }

    @Test
    void every_job_in_the_array_has_the_right_shape() {
        String jobsSchema = """
                {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "object",
                    "required": ["id", "title", "minSalary", "maxSalary"],
                    "properties": {
                      "id": { "type": "integer", "minimum": 1 },
                      "title": { "type": "string", "minLength": 1 },
                      "minSalary": { "type": "integer", "minimum": 1 },
                      "maxSalary": { "type": "integer", "minimum": 1 }
                    },
                    "additionalProperties": false
                  }
                }
                """;

        given().spec(Specs.api())
        .when().get("/jobs")
        .then().spec(Specs.ok())
                .body(matchesJsonSchema(jobsSchema));
    }
}`,
        },
        {
          title: "What a schema failure looks like (an enum check that does not hold)",
          lang: "text",
          code: `
java.lang.AssertionError: 1 expectation failed.
Response body doesn't match expectation.
Expected: The content to match the given JSON schema.
error: instance value (4) not found in enum (possible values: [5])
    level: "error"
    schema: {"loadingURI":"#","pointer":"/properties/id"}
    instance: {"pointer":"/id"}
    domain: "validation"
    keyword: "enum"
  Actual: {"id":4,"title":"Software Engineer","minSalary":80000,"maxSalary":115000}`,
          note: `<code>instance.pointer</code> says which field failed (<code>/id</code>) and <code>keyword</code> which rule.`,
        },
      ],
      exercises: [
        `Create <code>leave-request.json</code> from the example and validate leave requests 5, 17, 25 and 33 against it in one test.`,
        `Break the schema on purpose three times (a wrong <code>type</code>, a field removed from <code>properties</code> while <code>additionalProperties</code> is false, and <code>reason</code> made non-nullable). Run the test each time and note which request fails and the <code>keyword</code> in the message. Then repair it.`,
        `Write <code>department.json</code> for a department (8 fields, <code>code</code> with the pattern <code>^[A-Z]{2,5}$</code>, nullable <code>managerId</code>) and validate every department of <code>GET /departments</code> with an array schema whose <code>items</code> refers to the same rules.`,
        `Write <code>problem.json</code> for Ice HR error bodies, where <code>errors</code> is optional. Validate a 404, a 405 and a 400 <code>VALIDATION_FAILED</code> against it.`,
      ],
      quiz: [
        {
          q: `Which bug would a schema with <code>additionalProperties: false</code> catch, but a test that checks <code>firstName</code> and <code>salary</code> would miss?`,
          options: [`Ethan's salary changed to 85000`, `The API returns employee 14 instead of 13`, `The response is slow`, `The API starts returning an extra field such as <code>"ssn"</code>`],
          answer: 3,
          explain: `Value checks only look at the fields they name. The schema rejects any field it does not list.`,
        },
        {
          q: `Leave request 25 is PENDING, so <code>approverId</code> is <code>null</code>. Which schema rule accepts both 9 and <code>null</code>?`,
          options: [`<code>{"type": "integer"}</code>`, `<code>{"type": "integer", "minimum": 0}</code>`, `<code>{"type": ["integer", "null"]}</code>`, `Leave it out of <code>properties</code>`],
          answer: 2,
          explain: `A list of types allows any of them. Leaving it out of <code>properties</code> would break <code>additionalProperties: false</code>.`,
        },
        {
          q: `Where must <code>schemas/leave-request.json</code> live for <code>matchesJsonSchemaInClasspath("schemas/leave-request.json")</code> to find it?`,
          options: [`<code>src/test/resources/schemas/</code>`, `<code>src/test/java/com/icehr/schemas/</code>`, `The project root`, `Next to the test class`],
          answer: 0,
          explain: `Files in <code>src/test/resources</code> are copied onto the test classpath by Maven; the path you pass is relative to it.`,
        },
        {
          q: `You write <code>"status": {"const": "PENDING"}</code> and the test passes for a REJECTED request too. Why?`,
          options: [`<code>const</code> ignores case`, `REST Assured's validator follows draft-04, which has no <code>const</code>, so the keyword is ignored; use <code>{"enum": ["PENDING"]}</code>`, `Schemas never check strings`, `The request was cached`],
          answer: 1,
          explain: `Unknown keywords are skipped without an error. Always make a schema fail once on purpose to prove it checks what you think.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "leave-flow",
      title: "Chaining requests: an end-to-end leave flow",
      summary: "Hire someone, request leave, try the wrong approvers, approve, check the balance and cancel: one test, many calls, ids passed from one to the next.",
      body: `
<p>Real features are not one call. Taking a holiday in Ice HR is a small story: an employee asks for leave, the wrong people cannot approve it, the manager approves it,
the balance goes down, and the employee can still cancel before it starts. An <strong>end-to-end API test</strong> tells that story with several requests, passing values
(ids, dates) from one response into the next request. This is called <strong>chaining</strong>.</p>

<h3>Who may approve (rules A1 to A7)</h3>
<p>Approve is <code>POST /leave-requests/{id}/approve</code> with <code>{"approverId": n}</code>. Reject is <code>…/reject</code> with
<code>{"approverId": n, "reason": "…"}</code>. Checked in this order:</p>
<div class="table-wrap"><table>
<thead><tr><th>#</th><th>Rule</th><th>Otherwise</th></tr></thead>
<tbody>
<tr><td>A1</td><td><code>approverId</code> is a whole number above 0; for reject, <code>reason</code> is 1 to 200 characters</td><td>400</td></tr>
<tr><td>A2</td><td>The leave request exists</td><td>404</td></tr>
<tr><td>A3</td><td>The request is PENDING</td><td>409 <code>LEAVE_NOT_PENDING</code></td></tr>
<tr><td>A4</td><td>The approver exists</td><td>422 <code>APPROVER_NOT_FOUND</code></td></tr>
<tr><td>A5</td><td>The approver is not the employee themself</td><td>422 <code>SELF_APPROVAL</code></td></tr>
<tr><td>A6</td><td>The approver is ACTIVE</td><td>422 <code>APPROVER_NOT_ACTIVE</code></td></tr>
<tr><td>A7</td><td>The approver is the employee's <strong>direct manager</strong>, or has the <strong>HR Manager</strong> job (job 8: Chloé Tremblay, id 5)</td><td>422 <code>NOT_AUTHORIZED_APPROVER</code></td></tr>
</tbody></table></div>
<p>Cancel is <code>POST /leave-requests/{id}/cancel</code> with no body: PENDING always works; APPROVED works only if the leave starts after today (and
<code>approverId</code> and <code>decidedAt</code> are kept); otherwise 409 <code>LEAVE_ALREADY_STARTED</code> or, for REJECTED and CANCELLED,
<code>LEAVE_NOT_CANCELLABLE</code>.</p>

<h3>Worked example: the whole flow</h3>
<ol>
<li><strong>Hire</strong> with <code>NewEmployee.valid()</code>. The response gives the new id, say 1001. Their manager is Aisha (9). A new employee has a full balance:
20 vacation days.</li>
<li><strong>Request leave</strong>: VACATION from <code>TestData.futureMonday(2)</code> to the Friday of that week. <code>futureMonday(2)</code> is a Monday at least two
weeks ahead, chosen so that the whole week is in one calendar year (rule L6). Response: 201, PENDING, <code>days</code> 5 (Monday to Friday), <code>approverId</code>
null. Take the leave id from it.</li>
<li><strong>Balance</strong> (<code>GET /employees/1001/leave-balance?year=…</code>): VACATION <code>pending</code> 5, <code>remaining</code> 15. Pending days already count.</li>
<li><strong>Wrong approvers</strong>: Priya (7, runs Sales) → 422 <code>NOT_AUTHORIZED_APPROVER</code>; the employee themself → 422 <code>SELF_APPROVAL</code>; Tanya (58,
terminated) → 422 <code>APPROVER_NOT_ACTIVE</code>. Nothing changed: the request is still PENDING.</li>
<li><strong>Aisha approves</strong>: 200, APPROVED, <code>approverId</code> 9, <code>decidedAt</code> set. Approving again (even by Chloé) → 409
<code>LEAVE_NOT_PENDING</code>.</li>
<li><strong>Balance</strong>: <code>used</code> 5, <code>pending</code> 0, <code>remaining</code> still 15.</li>
<li><strong>Cancel</strong>: the leave starts in two weeks, so it can still be cancelled: 200, CANCELLED, <code>approverId</code> still 9. Balance: <code>used</code> 0,
<code>remaining</code> 20.</li>
<li><strong>Clean up</strong>: delete the employee. Their leave requests are deleted with them (<code>ON DELETE CASCADE</code>).</li>
</ol>

<h3>Passing values between calls</h3>
<ul>
<li>Get an id with <code>.then().statusCode(201).extract().path("id")</code>. Check the status <em>before</em> extracting: if the POST failed, you want "expected 201 but was 422",
not a confusing <code>NullPointerException</code> three calls later.</li>
<li>Keep ids the cleanup needs in <strong>fields</strong> of the test class (set in <code>@BeforeEach</code> or in the test), not in local variables.</li>
<li>Small private helpers (<code>approve(leaveId, approverId)</code>, <code>vacationBalance(year)</code>) keep a long test readable: it reads like the numbered list above.</li>
<li><code>.rootPath("balances.find { it.type == 'VACATION' }")</code> makes the following <code>body(…)</code> paths relative to that part of the JSON, so
<code>body("used", …)</code> means the VACATION <code>used</code>.</li>
</ul>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Approving the seeded pending requests (25 to 32). Each can be approved once; after that every run gets <code>LEAVE_NOT_PENDING</code>, and other people lose them too.
Create your own employee and request.</li>
<li>Fixed leave dates like <code>"2026-12-14"</code>. They work until that day and then give <code>START_DATE_IN_PAST</code>. Use <code>TestData.futureMonday(n)</code>.</li>
<li>Two requests in one test with overlapping dates for the same employee: the second gets 409 <code>LEAVE_OVERLAP</code>. Use different weeks.</li>
<li>Expecting the employee's manager to be found through the department. The approver rule uses the employee's own <code>managerId</code>.</li>
<li>One giant test with no helpers and no comments. When step 6 fails, nobody can tell what steps 1 to 5 set up.</li>
</ul></div>`,
      examples: [
        {
          title: "LeaveEndToEndTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.NewEmployee;
import com.icehr.support.TestData;
import io.restassured.response.Response;
import io.restassured.response.ValidatableResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;

/** Hire, request leave, wrong approvers, approve, check the balance, cancel. The test owns all its data. */
@Tag("api")
class LeaveEndToEndTest {

    private static final int AISHA = 9;    // the manager of every NewEmployee.valid()
    private static final int CHLOE = 5;    // HR Manager: may decide anyone's leave
    private static final int PRIYA = 7;    // runs Sales: not this employee's manager, not HR
    private static final int TANYA = 58;   // TERMINATED

    private int employeeId;

    @BeforeEach
    void hireSomeone() {
        employeeId = given().spec(Specs.api())
                .body(NewEmployee.valid())
        .when().post("/employees")
        .then().statusCode(201)
                .extract().path("id");
    }

    @AfterEach
    void cleanUp() {
        // Deleting the employee also deletes their leave requests (ON DELETE CASCADE)
        given().spec(Specs.api()).delete("/employees/{id}", employeeId);
    }

    @Test
    void request_approve_check_balance_and_cancel() {
        // 1. Monday to Friday, at least two weeks from today
        LocalDate monday = TestData.futureMonday(2);
        int leaveId = given().spec(Specs.api())
                .body(Map.of(
                        "employeeId", employeeId,
                        "type", "VACATION",
                        "startDate", monday.toString(),
                        "endDate", monday.plusDays(4).toString(),
                        "reason", "End-to-end test"))
        .when().post("/leave-requests")
        .then().statusCode(201)
                .body("status", equalTo("PENDING"))
                .body("days", equalTo(5))
                .body("approverId", nullValue())
                .extract().path("id");

        // Pending days already count: remaining = 20 - 0 used - 5 pending
        vacationBalance(monday.getYear())
                .body("pending", equalTo(5))
                .body("remaining", equalTo(15));

        // 2. The wrong people cannot approve
        approve(leaveId, PRIYA).then().spec(Specs.problem(422, "NOT_AUTHORIZED_APPROVER"));
        approve(leaveId, employeeId).then().spec(Specs.problem(422, "SELF_APPROVAL"));
        approve(leaveId, TANYA).then().spec(Specs.problem(422, "APPROVER_NOT_ACTIVE"));

        // 3. The direct manager approves
        approve(leaveId, AISHA).then().spec(Specs.ok())
                .body("status", equalTo("APPROVED"))
                .body("approverId", equalTo(AISHA))
                .body("decidedAt", notNullValue());

        // A second decision is refused: the request is no longer PENDING
        approve(leaveId, CHLOE).then().spec(Specs.problem(409, "LEAVE_NOT_PENDING"));

        // 4. The 5 days moved from "pending" to "used"
        vacationBalance(monday.getYear())
                .body("used", equalTo(5))
                .body("pending", equalTo(0))
                .body("remaining", equalTo(15));

        // 5. Approved leave that has not started can still be cancelled
        given().spec(Specs.api())
        .when().post("/leave-requests/{id}/cancel", leaveId)
        .then().spec(Specs.ok())
                .body("status", equalTo("CANCELLED"))
                .body("approverId", equalTo(AISHA));      // kept after cancelling

        vacationBalance(monday.getYear())
                .body("used", equalTo(0))
                .body("remaining", equalTo(20));
    }

    @Test
    void the_hr_manager_may_approve_anyone() {
        LocalDate monday = TestData.futureMonday(3);
        int leaveId = requestPersonalDay(monday);

        approve(leaveId, CHLOE).then().spec(Specs.ok())
                .body("status", equalTo("APPROVED"))
                .body("approverId", equalTo(CHLOE));
    }

    @Test
    void rejected_leave_cannot_be_cancelled() {
        int leaveId = requestPersonalDay(TestData.futureMonday(3));

        given().spec(Specs.api())
                .body(Map.of("approverId", AISHA, "reason", "Release week."))
        .when().post("/leave-requests/{id}/reject", leaveId)
        .then().spec(Specs.ok())
                .body("status", equalTo("REJECTED"))
                .body("decisionReason", equalTo("Release week."));

        given().spec(Specs.api())
        .when().post("/leave-requests/{id}/cancel", leaveId)
        .then().spec(Specs.problem(409, "LEAVE_NOT_CANCELLABLE"));
    }

    // ---- small helpers, so the test reads like the story it tells ----

    private Response approve(int leaveId, int approverId) {
        return given().spec(Specs.api())
                .body(Map.of("approverId", approverId))
        .when().post("/leave-requests/{id}/approve", leaveId);
    }

    private int requestPersonalDay(LocalDate day) {
        return given().spec(Specs.api())
                .body(Map.of("employeeId", employeeId, "type", "PERSONAL",
                        "startDate", day.toString(), "endDate", day.toString()))
        .when().post("/leave-requests")
        .then().statusCode(201)
                .extract().path("id");
    }

    /** The VACATION entry of the balance, ready for more body(...) checks with paths relative to it. */
    private ValidatableResponse vacationBalance(int year) {
        return given().spec(Specs.api())
                .queryParam("year", year)
        .when().get("/employees/{id}/leave-balance", employeeId)
        .then().spec(Specs.ok())
                .rootPath("balances.find { it.type == 'VACATION' }");
    }
}`,
        },
        {
          title: "The starter's support/TestData.java",
          lang: "java",
          code: `
package com.icehr.support;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Test data that never clashes and never goes stale.
 *
 * <ul>
 *   <li>Unique emails, because email must be unique (409 EMAIL_TAKEN otherwise).</li>
 *   <li>Dates computed from today in Toronto, because Ice HR's date rules use Toronto's "today"
 *       and leave cannot start in the past.</li>
 * </ul>
 */
public final class TestData {

    public static final ZoneId TORONTO = ZoneId.of("America/Toronto");

    private TestData() {
    }

    /** e.g. test.3f9a1c2b@icehr.test */
    public static String uniqueEmail() {
        return "test." + UUID.randomUUID().toString().substring(0, 8) + "@icehr.test";
    }

    /** Today's date in Toronto (the date Ice HR uses). */
    public static LocalDate today() {
        return LocalDate.now(TORONTO);
    }

    /**
     * A Monday at least {@code weeksAhead} weeks from today, chosen so that Monday to Friday of that week are in
     * the same calendar year (leave cannot cross into the next year).
     */
    public static LocalDate futureMonday(int weeksAhead) {
        LocalDate d = today().plusWeeks(weeksAhead);
        while (d.getDayOfWeek() != DayOfWeek.MONDAY) {
            d = d.plusDays(1);
        }
        if (d.plusDays(4).getYear() != d.getYear()) {
            d = d.plusWeeks(1);
        }
        return d;
    }
}`,
        },
        {
          title: "The calls the main test makes, in order",
          lang: "text",
          code: `
POST /employees                              201  id 1001 (manager 9)
POST /leave-requests                         201  PENDING, days 5
GET  /employees/1001/leave-balance?year=Y    200  VACATION pending 5, remaining 15
POST /leave-requests/{id}/approve  {7}       422  NOT_AUTHORIZED_APPROVER
POST /leave-requests/{id}/approve  {1001}    422  SELF_APPROVAL
POST /leave-requests/{id}/approve  {58}      422  APPROVER_NOT_ACTIVE
POST /leave-requests/{id}/approve  {9}       200  APPROVED, approverId 9
POST /leave-requests/{id}/approve  {5}       409  LEAVE_NOT_PENDING
GET  /employees/1001/leave-balance?year=Y    200  used 5, pending 0, remaining 15
POST /leave-requests/{id}/cancel             200  CANCELLED, approverId 9
GET  /employees/1001/leave-balance?year=Y    200  used 0, remaining 20
DELETE /employees/1001                       204  (in @AfterEach; the leave goes too)`,
        },
      ],
      exercises: [
        `Run <code>LeaveEndToEndTest</code>, then add a check after the cancel that <code>GET /leave-requests/{id}</code> shows CANCELLED with <code>decidedAt</code> still set.`,
        `Extend the flow: after Aisha approves, request a second leave in a different week with <code>futureMonday(4)</code> and check the balance counts both (one approved, one pending).`,
        `Write a test for <code>APPROVER_NOT_FOUND</code> (approver 9999) and one for a reject without a <code>reason</code>. Predict each status and code from the A-table first.`,
        `Write a SICK leave flow: request SICK leave for your employee starting today or in the past (at most 30 days ago, rule L11), have Chloé (5) approve it, and check the SICK balance. Think about weekends: a request with no weekday gets <code>NO_WORKING_DAYS</code>.`,
        `Draw the leave status diagram from README section 5 on paper, mark every arrow your tests now cover, and add a test for one arrow that is still missing.`,
      ],
      quiz: [
        {
          q: `Employee 1001 reports to Aisha (9). Who may approve their leave?`,
          options: [`Aisha (9) or Chloé (5), the HR Manager`, `Only Aisha`, `Anyone in Engineering`, `Aisha, Chloé or Daniel (2), Aisha's own manager`],
          answer: 0,
          explain: `Rule A7: the employee's direct manager, or an ACTIVE employee with the HR Manager job. Managers higher up the chain are not allowed.`,
        },
        {
          q: `A request is approved by Aisha, then the test tries to approve it again with Chloé. What happens?`,
          options: [`200: HR may always approve`, `409 <code>LEAVE_NOT_PENDING</code>: only PENDING requests can be decided`, `422 <code>NOT_AUTHORIZED_APPROVER</code>`, `It becomes approved twice and uses 10 days`],
          answer: 1,
          explain: `A3 (is it PENDING?) is checked before the approver rules, and an APPROVED request is no longer PENDING.`,
        },
        {
          q: `Approved leave starting in two weeks is cancelled. What happens to <code>approverId</code> and the balance?`,
          options: [`<code>approverId</code> becomes null; the days stay used`, `The cancel is refused with 409`, `Both stay as they were`, `<code>approverId</code> is kept; the days are no longer counted, so <code>remaining</code> goes back up`],
          answer: 3,
          explain: `README: cancelling APPROVED leave that starts after today gives CANCELLED and keeps <code>approverId</code> and <code>decidedAt</code>. CANCELLED requests do not count in the balance.`,
        },
        {
          q: `Why does the example extract ids with <code>.then().statusCode(201).extract().path("id")</code> instead of just <code>.path("id")</code> on the response?`,
          options: [`<code>path</code> does not work on responses`, `It is faster`, `If the POST failed, the test stops right there with "expected 201 but was …" instead of failing later with a confusing error`, `It deletes the record afterwards`],
          answer: 2,
          explain: `A failed POST returns a problem body with no <code>id</code>. Checking the status first makes the real cause the first thing you read.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "independent-tests",
      title: "Keeping tests independent and repeatable",
      summary: "Make tests that pass in any order, on any day, as often as you run them: unique data, dates from today, cleanup, and what to do when the data is a mess.",
      body: `
<p>A test suite is only useful if a red test means "something is broken". If tests fail because of yesterday's leftovers, the date, or the order they ran in, people stop
believing them. Four habits prevent that.</p>

<h3>1. Unique data</h3>
<p>Anything that must be unique gets a unique value on every run: emails (<code>TestData.uniqueEmail()</code> gives <code>test.3f9a1c2b@icehr.test</code>), department names
and codes (random letters, like <code>randomCode()</code> in the examples). Never read back "the employee with email jane.doe@icehr.test"; remember the <strong>id</strong> the
POST returned.</p>

<h3>2. Dates relative to today, in Toronto</h3>
<p>Ice HR's date rules use <strong>today's date in Toronto</strong> (<code>GET /health</code> shows it). A fixed future date <em>rots</em>: it is valid today and wrong later.</p>
<ul>
<li>A test that asks for vacation on <code>"2026-12-14"</code> passes in November 2026 and gets <code>START_DATE_IN_PAST</code> from 15 December.</li>
<li>Leave request 33 (approved, starts 2026-12-07) can be cancelled today; from 7 December the same test gets <code>LEAVE_ALREADY_STARTED</code>.</li>
<li>Kevin's "5 vacation days left" is true for <strong>2026</strong>. A test that builds a date from today will land in 2027 one day, where Kevin has 20.</li>
</ul>
<p>Build dates from <code>TestData.today()</code>: <code>today().plusDays(1)</code>, <code>TestData.futureMonday(2)</code>,
<code>today().with(TemporalAdjusters.previous(DayOfWeek.MONDAY))</code>. Why Toronto and not <code>LocalDate.now()</code>? Your PC may be in another time zone. In the
evening in Toronto it is already the next day in Europe or Asia, so your "today" would be Ice HR's "tomorrow" and a hire on "today" would get
<code>HIRE_DATE_IN_FUTURE</code>. Fixed dates in the <em>past</em> (birthdays, the 2024-03-04 hire date) are fine: the past does not move.</p>

<h3>3. Clean up</h3>
<p>Each test deletes what it created, in <code>@AfterEach</code>, and remembers each record right after creating it (lesson 5). When records depend on each other, delete
in reverse order: an employee before their department, because a department with employees cannot be deleted. A <code>Deque</code> used as a stack
(<code>push</code> when created, <code>pop</code> when cleaning) does that for you.</p>

<h3>4. No dependence on order</h3>
<p>JUnit does not promise any order of test methods, and you will often run one test alone. So a test never relies on another test having run first ("test A creates
the department, test B deletes it"). Each test sets up what it needs (<code>@BeforeEach</code> or inside the test) and removes it. Read-only facts from the seed (Ethan's
salary, the 15 jobs) are safe to use; <em>changing</em> seeded data is not.</p>

<h3>Worked example: a test that runs a hundred times</h3>
<p><code>RepeatableTest.a_new_department_with_a_new_employee</code> creates a department with a random code, hires an employee into it (unique email, hire date a week ago,
department id from the first response), checks <code>employeeCount</code> is 1 and that deleting the department is refused with 409 <code>DEPARTMENT_HAS_EMPLOYEES</code>.
<code>@AfterEach</code> then deletes the employee first and the department second. Run it twice, then call <code>GET /departments</code>: still 9 departments.</p>

<h3>The "destructive" tag: resetting on purpose</h3>
<p><code>POST /api/v1/reset</code> puts <strong>all</strong> data back to the seed: same ids and values, new ids from 1001 again. A test that calls it deletes everyone's
work, so the starter tags such tests <code>@Tag("destructive")</code>, and <code>pom.xml</code> excludes that tag by default. Run them on purpose only:</p>
<pre><code>mvn test -Dgroups=destructive -DexcludedGroups=</code></pre>
<p><code>-Dgroups=destructive</code> selects the tag; the empty <code>-DexcludedGroups=</code> removes the default exclusion. In PowerShell quote each flag:
<code>mvn test "-Dgroups=destructive" "-DexcludedGroups="</code>. Otherwise PowerShell may split or drop parts of the arguments and Maven runs something else.</p>

<h3>When the data is a mess anyway</h3>
<p>Symptoms: tests that passed yesterday fail on counts, emails are taken, a seeded request is no longer PENDING. Fix it by resetting, then find the test that did not
clean up. Three ways to reset:</p>
<ul>
<li>the <strong>Reset all data</strong> button on the Ice HR dashboard (http://localhost:8080);</li>
<li><code>POST /api/v1/reset</code> in Swagger, or <code>curl.exe -X POST http://localhost:8080/api/v1/reset</code> in PowerShell;</li>
<li><code>npm run reset</code> in the Ice HR folder (it starts the database itself if needed).</li>
</ul>

<div class="callout warn"><p><strong>Common mistakes</strong></p>
<ul>
<li>Calling <code>/reset</code> in <code>@BeforeEach</code> "to be safe". Every test then wipes the data, the suite gets slow, and anyone else using the same Ice HR loses their work.</li>
<li><code>LocalDate.now()</code> instead of <code>TestData.today()</code>. It works until you run tests late in the evening.</li>
<li>Tests that share a <code>static</code> id between methods. They pass in one order and fail in another.</li>
<li>Asserting exact totals over all data (<code>totalElements</code> 60) in a suite that creates employees. Filter to seeded data or check relative changes.</li>
<li>Forgetting the quotes around <code>-D</code> flags in PowerShell.</li>
</ul></div>`,
      examples: [
        {
          title: "RepeatableTest.java",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.NewEmployee;
import com.icehr.support.TestData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Random;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/** Tests that can run any number of times, in any order, on any day. */
@Tag("api")
class RepeatableTest {

    /** What to delete after the test, newest first (a department can only go once its employees are gone). */
    private final Deque<String> cleanup = new ArrayDeque<>();

    @AfterEach
    void undoEverything() {
        while (!cleanup.isEmpty()) {
            given().spec(Specs.api()).delete(cleanup.pop());
        }
    }

    @Test
    void a_new_department_with_a_new_employee() {
        String code = randomCode();
        int departmentId = given().spec(Specs.api())
                .body(Map.of("name", "Repeatable " + code, "code", code, "location", "Toronto"))
        .when().post("/departments")
        .then().statusCode(201)
                .extract().path("id");
        cleanup.push("/departments/" + departmentId);

        NewEmployee body = new NewEmployee("Rae", "Peat", "FEMALE", TestData.uniqueEmail(), null,
                LocalDate.of(1990, 1, 1), TestData.today().minusDays(7), 4, departmentId, 9, 90000, "CA");
        int employeeId = given().spec(Specs.api())
                .body(body)
        .when().post("/employees")
        .then().statusCode(201)
                .extract().path("id");
        cleanup.push("/employees/" + employeeId);          // pushed last, so deleted first

        given().spec(Specs.api())
        .when().get("/departments/{id}", departmentId)
        .then().statusCode(200)
                .body("employeeCount", equalTo(1));

        given().spec(Specs.api())
        .when().delete("/departments/{id}", departmentId)
        .then().spec(Specs.problem(409, "DEPARTMENT_HAS_EMPLOYEES"));
    }

    @Test
    void vacation_dates_are_built_from_today() {
        int employeeId = given().spec(Specs.api())
                .body(NewEmployee.valid())
        .when().post("/employees")
        .then().statusCode(201)
                .extract().path("id");
        cleanup.push("/employees/" + employeeId);

        // Last Monday is always in the past, whatever day you run this
        LocalDate lastMonday = TestData.today().with(TemporalAdjusters.previous(DayOfWeek.MONDAY));
        given().spec(Specs.api())
                .body(Map.of("employeeId", employeeId, "type", "VACATION",
                        "startDate", lastMonday.toString(), "endDate", lastMonday.toString()))
        .when().post("/leave-requests")
        .then().spec(Specs.problem(422, "START_DATE_IN_PAST"));

        // A Monday at least one week ahead is always in the future
        LocalDate nextMonday = TestData.futureMonday(1);
        given().spec(Specs.api())
                .body(Map.of("employeeId", employeeId, "type", "VACATION",
                        "startDate", nextMonday.toString(), "endDate", nextMonday.toString()))
        .when().post("/leave-requests")
        .then().statusCode(201);
    }

    private static String randomCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            code.append((char) ('A' + random.nextInt(26)));
        }
        return code.toString();
    }
}`,
        },
        {
          title: "SeedResetTest.java: a destructive test, skipped by a normal mvn test",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.NewEmployee;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/**
 * Resets ALL data, so it is tagged "destructive" and a normal mvn test skips it.
 * Run it on purpose:  mvn test -Dgroups=destructive -DexcludedGroups=
 */
@Tag("destructive")
class SeedResetTest {

    @Test
    void after_a_reset_the_seed_is_back_and_new_ids_start_at_1001() {
        given().spec(Specs.api())
        .when().post("/reset")
        .then().spec(Specs.ok())
                .body("status", equalTo("RESET"))
                .body("departments", equalTo(9))
                .body("employees", equalTo(60));

        given().spec(Specs.api())
                .queryParam("year", 2026)
        .when().get("/employees/16/leave-balance")
        .then().spec(Specs.ok())
                .body("balances.find { it.type == 'VACATION' }.remaining", equalTo(0));   // Fatima, as seeded

        int id = given().spec(Specs.api())
                .body(NewEmployee.valid())
        .when().post("/employees")
        .then().statusCode(201)
                .extract().path("id");
        try {
            assertThat(id).isEqualTo(1001);
        } finally {
            given().spec(Specs.api()).delete("/employees/{id}", id).then().statusCode(204);
        }
    }
}`,
        },
        {
          title: "Resetting and running destructive tests (PowerShell)",
          lang: "powershell",
          code: `
# In the Ice HR folder: back to the seed data
npm run reset

# Or through the API while Ice HR runs
curl.exe -X POST http://localhost:8080/api/v1/reset

# In the starter folder: run ONLY the destructive tests (quotes matter in PowerShell)
mvn test "-Dgroups=destructive" "-DexcludedGroups="

# Command Prompt or Git Bash: no quotes needed
mvn test -Dgroups=destructive -DexcludedGroups=`,
        },
      ],
      exercises: [
        `Run <code>mvn test</code> three times in a row. Then check with <code>GET /employees</code> and <code>GET /departments</code> that the totals are still 60 and 9. If not, find the test that leaves data behind and fix its cleanup.`,
        `Find one test of yours that uses a fixed future date or <code>LocalDate.now()</code> and rewrite it with <code>TestData</code>. Write a comment explaining on which date the old version would have failed.`,
        `Run a single test method on its own, then the whole class, then the class in reverse order (rename methods or use <code>@TestMethodOrder</code>). Fix any test that depends on another.`,
        `Add <code>SeedResetTest</code> to your project. Run <code>mvn test</code> and confirm it is skipped, then run it on purpose with the destructive flags in PowerShell.`,
        `Move <code>randomCode()</code> into <code>TestData</code> as <code>uniqueDepartmentCode()</code> and use it from every test that creates a department.`,
      ],
      quiz: [
        {
          q: `A test requests vacation from <code>"2026-12-14"</code> to <code>"2026-12-18"</code>. It passes today. What happens on 15 December 2026?`,
          options: [`It still passes`, `It fails with <code>LEAVE_OVERLAP</code>`, `It fails with 422 <code>START_DATE_IN_PAST</code>: the fixed date is now in the past`, `It fails with 400`],
          answer: 2,
          explain: `VACATION and PERSONAL leave must start today or later (L10). Build such dates from <code>TestData.today()</code> or <code>TestData.futureMonday(n)</code>.`,
        },
        {
          q: `Why does <code>TestData.today()</code> use the Toronto time zone instead of <code>LocalDate.now()</code>?`,
          options: [`Java has no other time zones`, `Toronto is the default in Maven`, `It is faster`, `Ice HR's date rules use today in Toronto; your PC may already be on the next day, which Ice HR treats as the future`],
          answer: 3,
          explain: `README section 5: "Today" always means today's date in Toronto, whatever your computer's time zone is.`,
        },
        {
          q: `Which command runs only the tests tagged <code>destructive</code> from PowerShell?`,
          options: [`<code>mvn test -Dgroups=destructive</code>`, `<code>mvn test "-Dgroups=destructive" "-DexcludedGroups="</code>`, `<code>mvn test "-Dtest=destructive"</code>`, `<code>mvn destructive</code>`],
          answer: 1,
          explain: `<code>pom.xml</code> excludes <code>destructive</code> by default, so you must also clear <code>excludedGroups</code>. In PowerShell each <code>-D</code> flag needs quotes.`,
        },
        {
          q: `Your test creates a department and an employee in it. In which order should <code>@AfterEach</code> delete them?`,
          options: [`The employee first, then the department: a department with employees cannot be deleted`, `The department first`, `Any order`, `Neither: call <code>/reset</code> instead`],
          answer: 0,
          explain: `Deleting the department first gives 409 <code>DEPARTMENT_HAS_EMPLOYEES</code> and leaves both behind. Undo in reverse order of creation.`,
        },
      ],
    },
    // ------------------------------------------------------------------------------------------
    {
      id: "common-mistakes",
      title: "Common mistakes and how to spot them",
      summary: "Twelve mistakes almost everyone makes with REST Assured, the exact symptom each one gives against Ice HR, and the fix.",
      body: `
<p>Most failing tests in your first weeks are not bugs in Ice HR. They are a handful of mistakes that everybody makes, and each one leaves a
recognisable fingerprint: a strange message, a test that passes when it should not, or one that fails only on the second run. Learn the fingerprints and
you will fix them in seconds instead of an hour. Every symptom below is the real output from Ice HR and the starter project.</p>

<h3>Quick lookup: symptom to mistake</h3>
<div class="table-wrap"><table>
<thead><tr><th>You see</th><th>Most likely</th><th>#</th></tr></thead>
<tbody>
<tr><td><code>.contains("...")</code> is always false; printing the body shows <code>RestAssuredResponseImpl@3c35c345</code></td><td>Used <code>body().toString()</code> instead of <code>asString()</code></td><td>1</td></tr>
<tr><td>415 <code>UNSUPPORTED_MEDIA_TYPE</code>, "received: text/plain; charset=ISO-8859-1"</td><td>No content type on a request with a body</td><td>2</td></tr>
<tr><td><code>Expected: 80000  Actual: &lt;80000&gt;</code> (they look the same!)</td><td>Compared a number with a string</td><td>3</td></tr>
<tr><td><code>Expected: &lt;60L&gt;  Actual: &lt;60&gt;</code></td><td>Compared with a <code>long</code></td><td>4</td></tr>
<tr><td>A <code>nullValue()</code> check passes for a field you misspelled</td><td>Typo in a JSON path</td><td>5</td></tr>
<tr><td>Two ids that print the same are "not equal"</td><td><code>==</code> on <code>Integer</code></td><td>6</td></tr>
<tr><td><code>NullPointerException: Cannot invoke "java.lang.Integer.intValue()"</code></td><td>Extracted a value from an error response</td><td>7</td></tr>
<tr><td>404 when you GET the <code>Location</code> you just received</td><td><code>/api/v1</code> added twice</td><td>8</td></tr>
<tr><td><code>NullPointerException</code> before any request is sent</td><td><code>Map.of(...)</code> with a <code>null</code> value</td><td>9</td></tr>
<tr><td>400 <code>salary</code> "must be a number"</td><td>Number sent as a string</td><td>10</td></tr>
<tr><td>Green on the first run, red on the second (409, 422, wrong counts)</td><td>Fixed test data, or no cleanup</td><td>11</td></tr>
<tr><td>A test breaks although the behaviour did not change</td><td>Asserted on <code>detail</code> text or the exact header text</td><td>12</td></tr>
</tbody></table></div>

<h3>1. <code>body().toString()</code> is not the body</h3>
<p><code>response.body().toString()</code> does not return the JSON. It returns Java's default description of the object, such as
<code>io.restassured.internal.RestAssuredResponseImpl@3c35c345</code>, so <code>.contains("Tremblay")</code> is <strong>always false</strong>, whatever the server sent.
Use <code>response.asString()</code> (or <code>response.body().asString()</code>, the same thing). Even better, let REST Assured do it:
<code>.then().body(containsString("Tremblay"))</code>, which also prints the response when it fails.</p>
<pre><code>// Wrong: always false
assertTrue(response.body().toString().contains("Tremblay"));
// Right
assertThat(response.asString()).contains("Tremblay");</code></pre>
<p>A related point: searching the whole body for text is a weak check. <code>"Tremblay"</code> could appear in any field. Prefer a JSON path:
<code>.body("lastName", equalTo("Tremblay"))</code>.</p>

<h3>2. Forgetting the content type</h3>
<p>Without <code>.contentType(ContentType.JSON)</code>, REST Assured sends a String body as <code>text/plain; charset=ISO-8859-1</code>. Ice HR refuses it with
415 <code>UNSUPPORTED_MEDIA_TYPE</code> and tells you exactly that: <em>"Send the request body as JSON with the header Content-Type: application/json (received:
text/plain; charset=ISO-8859-1)"</em>. Fix: start every request with <code>given().spec(Specs.api())</code>, which sets it for you.</p>

<h3>3. A number is not a string</h3>
<p>JSON has types: <code>80000</code> is a number, <code>"80000"</code> is a string. JsonPath gives you a Java <code>Integer</code> for the first, so
<code>.body("salary", equalTo("80000"))</code> fails with the most confusing message in REST Assured:</p>
<pre><code>JSON path salary doesn't match.
Expected: 80000
  Actual: &lt;80000&gt;</code></pre>
<p>The angle brackets around <code>&lt;80000&gt;</code> mean "a number"; no brackets mean a string. Fix: <code>equalTo(80000)</code>. The same goes for ids, <code>days</code>,
<code>totalElements</code>, <code>minSalary</code> and every other number in Ice HR.</p>

<h3>4. <code>60L</code> is not <code>60</code></h3>
<p>For whole numbers that fit, JsonPath returns <code>Integer</code>, not <code>Long</code>. <code>.body("totalElements", equalTo(60L))</code> fails with
<code>Expected: &lt;60L&gt;  Actual: &lt;60&gt;</code>. Write <code>equalTo(60)</code>. (When you read into the <code>Page</code> record, <code>totalElements</code> is a
<code>long</code>, so there <code>assertThat(page.totalElements()).isEqualTo(60L)</code> is right. The type depends on where the value comes from.)</p>

<h3>5. A typo in a path quietly gives <code>null</code></h3>
<p>Ice HR's fields are camelCase. <code>.body("termination_date", nullValue())</code> <strong>passes</strong>: there is no field called <code>termination_date</code>,
so the path returns <code>null</code>, which is exactly what you asked for. The test proves nothing. When "null" is what you expect, also prove the field exists:
<code>.body("$", hasKey("terminationDate"))</code>, or check the whole object against the JSON schema. Copy field names from Swagger instead of typing them.</p>

<h3>6. <code>==</code> on ids</h3>
<p><code>Integer</code> is an object. <code>==</code> compares whether two variables point to the <em>same object</em>, not whether the numbers are equal. Java reuses objects
only for -128 to 127, so seeded ids seem to work, and then your new ids from 1001 break it:
<code>Integer a = ...path("id"); Integer b = ...path("id");</code> printed <code>1036 == 1036 -&gt; false</code>. Use <code>a.equals(b)</code>,
<code>assertThat(a).isEqualTo(b)</code>, or store ids in <code>int</code>.</p>

<h3>7. Extracting before checking the status</h3>
<p><code>int id = given()...post("/employees").then().extract().path("id");</code> works only when the hire succeeds. If it gets a 422, the error body has no
<code>id</code>, the path returns <code>null</code>, and Java fails while turning <code>null</code> into an <code>int</code>:</p>
<pre><code>NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the return value
of "io.restassured.response.ExtractableResponse.path(String, String[])" is null</code></pre>
<p>That message hides the real problem (a 422 with a useful <code>code</code>). Always check the status <em>before</em> extracting:
<code>.then().statusCode(201).extract().path("id")</code>. Then a failure says "Expected status code &lt;201&gt; but was &lt;422&gt;" and prints the error body.</p>

<h3>8. Following <code>Location</code> with <code>Specs.api()</code></h3>
<p>The <code>Location</code> header already contains the full path: <code>/api/v1/employees/1037</code>. <code>Specs.api()</code> adds its base path <code>/api/v1</code> in
front, so <code>given().spec(Specs.api()).get(location)</code> requests <code>/api/v1/api/v1/employees/1037</code> and gets 404. Either use the id
(<code>.get("/employees/{id}", id)</code>), or call the location without the base path: <code>given().baseUri(Config.baseUrl()).get(location)</code>.</p>

<h3>9. <code>Map.of</code> and <code>null</code></h3>
<p><code>Map.of("managerId", null)</code> throws <code>NullPointerException</code> in your own code, before REST Assured sends anything: <code>Map.of</code> does not allow
<code>null</code> keys or values. To send <code>{"managerId": null}</code> (for example to clear a manager with PATCH), use a <code>HashMap</code>:
<code>Map&lt;String, Object&gt; body = new HashMap&lt;&gt;(); body.put("managerId", null);</code>.</p>

<h3>10. Sending numbers as strings</h3>
<p>The reverse of mistake 3, in the request. <code>{"salary": "95000"}</code> gives 400 with <code>salary</code> "must be a number". In a <code>Map</code>, put
<code>95000</code>, not <code>"95000"</code>; in a String body, no quotes around numbers.</p>

<h3>11. Tests that only pass once</h3>
<ul>
<li><strong>Fixed emails</strong>: the second run gets 409 <code>EMAIL_TAKEN</code>. Use <code>TestData.uniqueEmail()</code>.</li>
<li><strong>Fixed dates</strong>: <code>"2026-12-14"</code> becomes 422 <code>START_DATE_IN_PAST</code> once that day has passed. Use <code>TestData.futureMonday(2)</code>.</li>
<li><strong>No cleanup</strong>: your leftovers change other tests' numbers ("expected 60 but was 61"). Delete what you create in <code>@AfterEach</code>, or in a
<code>finally</code> block.</li>
<li><strong>Depending on another test</strong>: a test that only passes after another one ran will break when it runs alone or in a different order. Each test
creates what it needs.</li>
</ul>

<h3>12. Asserting on the wrong thing</h3>
<ul>
<li><strong><code>detail</code> instead of <code>code</code></strong>: <code>detail</code> is a sentence for people and may be reworded. <code>code</code>
(<code>SALARY_OUT_OF_RANGE</code>) is the contract.</li>
<li><strong>The exact header text</strong>: <code>.header("Content-Type", "application/json; charset=utf-8")</code> breaks if the server stops sending the charset,
as Ice HR did in one update, although the response is the same JSON. <code>.contentType(ContentType.JSON)</code> checks what matters.</li>
<li><strong>Not asserting at all</strong>: a test with only <code>given().get(...)</code> and no <code>then()</code> checks passes even on a 500. Every test needs at least
a status check.</li>
</ul>

<div class="callout"><p><strong>When a test fails, read the first lines.</strong> Is it an <code>AssertionError</code> (your expectation and the response differ:
compare them), a <code>NullPointerException</code> (usually mistake 7 or 9), or <code>Connection refused</code> (Ice HR is not running)? The starter prints the full
request and response under every failed check; scroll up to it before you change anything.</p></div>`,
      examples: [
        {
          title: "The right way, for each mistake (CommonMistakesTest.java)",
          lang: "java",
          code: `
package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.config.Config;
import com.icehr.model.NewEmployee;
import com.icehr.model.Page;
import com.icehr.model.Employee;
import io.restassured.common.mapper.TypeRef;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.nullValue;

@Tag("api")
class CommonMistakesTest {

    @Test
    void body_text_is_asString_not_toString() {                     // 1
        Response response = given().spec(Specs.api()).get("/employees/5");

        assertThat(response.body().toString()).doesNotContain("Tremblay");   // the trap
        assertThat(response.asString()).contains("Tremblay", "Chloé");       // the fix
        response.then().body(containsString("Tremblay"));                    // or let REST Assured check
    }

    @Test
    void numbers_are_compared_as_numbers() {                        // 3 and 4
        given().spec(Specs.api()).get("/employees/13")
        .then().body("salary", equalTo(80000));

        given().spec(Specs.api()).get("/employees")
        .then().body("totalElements", equalTo(60));

        Page<Employee> page = given().spec(Specs.api()).get("/employees").as(new TypeRef<Page<Employee>>() { });
        assertThat(page.totalElements()).isEqualTo(60L);           // a long here: it comes from the record
    }

    @Test
    void a_null_check_also_proves_the_field_exists() {              // 5
        given().spec(Specs.api()).get("/employees/13")
        .then()
                .body("$", hasKey("terminationDate"))
                .body("terminationDate", nullValue());
    }

    @Test
    void ids_are_compared_with_equals_and_status_is_checked_first() {   // 6, 7 and 8
        Response created = given().spec(Specs.api())
                .body(NewEmployee.valid())
        .when().post("/employees")
        .then().statusCode(201)                                     // status first, then extract
                .extract().response();
        Integer id = created.path("id");
        try {
            String location = created.header("Location");          // "/api/v1/employees/1001"
            Integer again = given().baseUri(Config.baseUrl())       // no base path: Location is complete
                    .get(location)
                    .then().statusCode(200)
                    .extract().path("id");

            assertThat(again).isEqualTo(id);                        // equals, never ==
        } finally {
            given().spec(Specs.api()).delete("/employees/{id}", id).then().statusCode(204);
        }
    }

    @Test
    void null_values_need_a_HashMap_and_numbers_stay_numbers() {    // 9 and 10
        int id = given().spec(Specs.api()).body(NewEmployee.valid())
                .post("/employees").then().statusCode(201).extract().path("id");

        Map<String, Object> body = new HashMap<>();
        body.put("phone", null);                                    // Map.of("phone", null) would throw
        body.put("salary", 81000);                                  // a number, not "81000"
        try {
            given().spec(Specs.api())
                    .body(body)
            .when().patch("/employees/{id}", id)
            .then().statusCode(200)
                    .body("phone", nullValue())
                    .body("salary", equalTo(81000));
        } finally {
            given().spec(Specs.api()).delete("/employees/{id}", id).then().statusCode(204);
        }
    }

    @Test
    void assert_on_code_and_on_the_type_of_content() {              // 2 and 12
        given().baseUri(Config.baseUrl())
                .body("{\\"name\\": \\"No Type\\", \\"code\\": \\"NT\\", \\"location\\": \\"Toronto\\"}")   // no content type
        .when().post("/api/v1/departments")
        .then()
                .statusCode(415)
                .contentType("application/problem+json")
                .body("code", equalTo("UNSUPPORTED_MEDIA_TYPE"));

        given().spec(Specs.api()).get("/jobs")
        .then().contentType(ContentType.JSON);                      // not the exact header text
    }
}`,
        },
        {
          title: "Spot the mistakes (there are at least six)",
          lang: "java",
          code: `
@Test
void hire_and_check() {
    Map<String, Object> body = Map.of(
            "firstName", "Sam", "lastName", "Lee", "gender", "MALE",
            "email", "sam.lee@icehr.test",
            "dateOfBirth", "1994-03-02", "hireDate", "2025-01-06",
            "jobId", 4, "departmentId", 2, "countryCode", "CA", "salary", "90000");

    int id = given().baseUri("http://localhost:8080").body(body)
            .post("/api/v1/employees")
            .then().extract().path("id");

    given().spec(Specs.api()).get("/employees/" + id)
            .then().body("salary", equalTo("90000"))
                   .body("terminated_date", nullValue());
}`,
        },
        {
          title: "Your checklist before you push a test",
          lang: "text",
          code: `
[ ] Starts with given().spec(Specs.api())          (base URL, /api/v1, JSON content type)
[ ] Checks the status code before extracting anything
[ ] Numbers compared as numbers: equalTo(80000), equalTo(60)
[ ] Error tests assert "code", not "detail"
[ ] Field names copied from Swagger; null checks also use hasKey(...)
[ ] Unique emails (TestData.uniqueEmail()) and dates from today (TestData.futureMonday(...))
[ ] Deletes everything it created (@AfterEach or finally)
[ ] Passes when run alone, and twice in a row`,
        },
      ],
      exercises: [
        "Copy <code>CommonMistakesTest</code> into <code>starter/src/test/java/com/icehr/tests</code> and run it. Then change <code>equalTo(80000)</code> to <code>equalTo(\"80000\")</code>, run it again, and copy the failure message into your notes, explaining the angle brackets.",
        "Find at least six mistakes in the \"Spot the mistakes\" example. Write the corrected test, run it twice in a row, and make sure both runs pass and nothing is left behind.",
        "Write a test that proves mistake 6: hire one employee, read its id twice into two <code>Integer</code> variables, and show with <code>assertThat</code> that <code>==</code> is false but <code>equals</code> is true. Delete the employee afterwards.",
        "Run every test in the starter project once with Ice HR stopped and once with it running. Write down the first line of the error you get when it is stopped, so you recognise it next time.",
        "Go through your own tests from the earlier lessons with the checklist above. Fix at least two mistakes you find and note which ones they were.",
      ],
      quiz: [
        {
          q: `<code>assertTrue(response.body().toString().contains("Ethan"))</code> fails, although the response is Ethan's record. Why?`,
          options: [`Ice HR sends the body without a charset`, `<code>toString()</code> returns the object's description (<code>RestAssuredResponseImpl@...</code>), not the JSON; use <code>asString()</code>`, `<code>contains</code> is case-sensitive`, `The body is only available after <code>then()</code>`],
          answer: 1,
          explain: `<code>body().toString()</code> never contains the response text, with or without a charset. <code>asString()</code> returns the body as a String, decoded as UTF-8.`,
        },
        {
          q: `A check fails with <code>Expected: 80000</code> and <code>Actual: &lt;80000&gt;</code>. What is wrong?`,
          options: [`Ice HR returned the wrong salary`, `The salary is too low`, `JsonPath needs <code>equalTo(80000L)</code>`, `The test compares with the String <code>"80000"</code>, but the JSON value is a number`],
          answer: 3,
          explain: `Angle brackets mark the actual value as a number. Write <code>equalTo(80000)</code>, without quotes.`,
        },
        {
          q: `<code>int id = given().spec(Specs.api()).body(body).post("/employees").then().extract().path("id");</code> throws a <code>NullPointerException</code>. What should you change first?`,
          options: [`Add <code>.statusCode(201)</code> before <code>.extract()</code>, so the real problem (for example a 422) is reported`, `Use <code>long</code> instead of <code>int</code>`, `Add a <code>Thread.sleep</code>`, `Use <code>Map.of</code> for the body`],
          answer: 0,
          explain: `The hire failed, so the error body has no <code>id</code>. Checking the status first turns a confusing NullPointerException into "Expected status code &lt;201&gt; but was &lt;422&gt;", with the error body printed.`,
        },
        {
          q: `Your test passed yesterday and today fails with 409 <code>EMAIL_TAKEN</code>. The most likely cause?`,
          options: [`Ice HR has a bug`, `The test uses a fixed email, and yesterday's employee was never deleted`, `The email is not in lower case`, `Emails expire after a day`],
          answer: 1,
          explain: `Fixed data plus no cleanup: the first run created the employee and left it there. Use <code>TestData.uniqueEmail()</code> and delete what you create.`,
        },
      ],
    },
  ],
});
