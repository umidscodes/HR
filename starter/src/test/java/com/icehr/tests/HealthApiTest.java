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
                .body("today", matchesPattern("\\d{4}-\\d{2}-\\d{2}"));
    }
}
