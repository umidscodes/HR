package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.db.Db;
import com.icehr.model.NewEmployee;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;

/** Tests that use both layers: act through one, check through the other. */
@Tag("api")
@Tag("db")
class ApiAndDbTest {

    @Test
    void an_employee_hired_through_the_api_is_stored_correctly() {
        NewEmployee body = NewEmployee.valid().withSalary(101000);
        int id = given().spec(Specs.api()).body(body).post("/employees").then().statusCode(201).extract().path("id");
        try {
            Map<String, Object> row = Db.reader().queryOne("SELECT email, salary, status, department_id FROM employees WHERE id = ?", id);
            assertThat(row)
                    .containsEntry("email", body.email())
                    .containsEntry("salary", 101000)
                    .containsEntry("status", "ACTIVE")
                    .containsEntry("department_id", 2);
        } finally {
            given().spec(Specs.api()).delete("/employees/{id}", id).then().statusCode(204);
        }
    }

    @Test
    void a_department_inserted_with_sql_is_served_by_the_api() {
        Db writer = Db.writer();
        writer.update("DELETE FROM departments WHERE code = 'SQLT'"); // leftovers from an earlier failed run
        writer.update("INSERT INTO departments (name, code, location) VALUES ('Inserted With SQL', 'SQLT', 'Montreal')");
        try {
            Integer id = writer.scalar(Integer.class, "SELECT id FROM departments WHERE code = 'SQLT'");

            given().spec(Specs.api())
            .when().get("/departments/{id}", id)
            .then().spec(Specs.ok())
                    .body("name", equalTo("Inserted With SQL"))
                    .body("employeeCount", equalTo(0));
        } finally {
            writer.update("DELETE FROM departments WHERE code = 'SQLT'");
        }
    }
}
