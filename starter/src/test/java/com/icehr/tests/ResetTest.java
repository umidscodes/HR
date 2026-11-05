package com.icehr.tests;

import com.icehr.api.Specs;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

/**
 * Resets ALL data to the seed, so it is tagged "destructive" and skipped by a normal mvn test.
 * Run it on purpose:  mvn test -Dgroups=destructive -DexcludedGroups=
 */
@Tag("destructive")
class ResetTest {

    @Test
    void reset_restores_the_seed() {
        given().spec(Specs.api())
        .when().post("/reset")
        .then().spec(Specs.ok())
                .body("status", equalTo("RESET"))
                .body("employees", equalTo(60))
                .body("leaveRequests", equalTo(35));
    }
}
