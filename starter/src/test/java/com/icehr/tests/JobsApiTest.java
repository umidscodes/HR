package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;

@Tag("api")
class JobsApiTest {

    @Test
    void there_are_15_jobs() {
        given().spec(Specs.api())
        .when().get("/jobs")
        .then().spec(Specs.ok())
                .header("Content-Type", "application/json")  // exactly this, no "; charset=..."
                .body("$", hasSize(15))                       // "$" is the whole (array) body
                .body("title", hasItem("QA Analyst"))         // "title" on an array = every title
                .body("minSalary", everyItem(greaterThan(0)));
    }

    @Test
    void software_engineer_pays_80000_to_115000() {
        given().spec(Specs.api())
                .pathParam("id", 4)
        .when().get("/jobs/{id}")
        .then().spec(Specs.ok())
                .body("title", equalTo("Software Engineer"))
                .body("minSalary", equalTo(80000))
                .body("maxSalary", equalTo(115000));
    }

    @Test
    void an_unknown_job_is_404_with_a_problem_body() {
        given().spec(Specs.api())
        .when().get("/jobs/99")
        .then().spec(Specs.problem(404, "NOT_FOUND"))
                .body("detail", equalTo("Job 99 was not found."))
                .body("instance", equalTo("/api/v1/jobs/99"));
    }
}
