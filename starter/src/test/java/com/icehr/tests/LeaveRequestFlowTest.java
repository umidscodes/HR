package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.LeaveRequest;
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

/**
 * A chained flow: hire someone, request leave, the manager approves it, and the balance goes down.
 * The test makes its own employee, so it never depends on (or changes) the seed data's leave.
 */
@Tag("api")
class LeaveRequestFlowTest {

    private static final int AISHA = 9; // the manager of every NewEmployee.valid()

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
        // Deleting the employee also deletes their leave requests (ON DELETE CASCADE).
        given().spec(Specs.api()).delete("/employees/{id}", employeeId).then().statusCode(204);
    }

    @Test
    void approved_vacation_is_used_from_the_balance() {
        LocalDate monday = TestData.futureMonday(2);

        LeaveRequest request = given().spec(Specs.api())
                .body(Map.of(
                        "employeeId", employeeId,
                        "type", "VACATION",
                        "startDate", monday.toString(),
                        "endDate", monday.plusDays(4).toString()))
        .when().post("/leave-requests")
        .then().statusCode(201)
                .body("status", equalTo("PENDING"))
                .body("days", equalTo(5))
                .extract().as(LeaveRequest.class);

        given().spec(Specs.api())
                .body(Map.of("approverId", AISHA))
        .when().post("/leave-requests/{id}/approve", request.id())
        .then().spec(Specs.ok())
                .body("status", equalTo("APPROVED"))
                .body("approverId", equalTo(AISHA));

        int remaining = given().spec(Specs.api())
                .queryParam("year", monday.getYear())
        .when().get("/employees/{id}/leave-balance", employeeId)
        .then().spec(Specs.ok())
                .body("balances[0].type", equalTo("VACATION"))
                .body("balances[0].used", equalTo(5))
                .extract().path("balances.find { it.type == 'VACATION' }.remaining");

        assertThat(remaining).isEqualTo(15);
    }

    @Test
    void someone_who_is_not_the_manager_cannot_approve() {
        LocalDate monday = TestData.futureMonday(3);
        int requestId = given().spec(Specs.api())
                .body(Map.of("employeeId", employeeId, "type", "PERSONAL",
                        "startDate", monday.toString(), "endDate", monday.toString()))
                .post("/leave-requests")
                .then().statusCode(201).extract().path("id");

        given().spec(Specs.api())
                .body(Map.of("approverId", 7)) // Priya runs Sales: not this employee's manager, not HR
        .when().post("/leave-requests/{id}/approve", requestId)
        .then().spec(Specs.problem(422, "NOT_AUTHORIZED_APPROVER"));
    }
}
