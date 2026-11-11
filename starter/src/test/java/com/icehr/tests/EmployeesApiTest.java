package com.icehr.tests;

import com.icehr.api.Specs;
import com.icehr.model.Employee;
import com.icehr.model.NewEmployee;
import com.icehr.model.Page;
import com.icehr.model.Problem;
import io.restassured.common.mapper.TypeRef;
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

import static io.restassured.RestAssured.given;
import static io.restassured.module.jsv.JsonSchemaValidator.matchesJsonSchemaInClasspath;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;

@Tag("api")
class EmployeesApiTest {

    /** Ids of employees a test created, deleted again after each test so the data stays as it was. */
    private final List<Integer> created = new ArrayList<>();

    @AfterEach
    void deleteWhatWeCreated() {
        for (Integer id : created) {
            given().spec(Specs.api()).delete("/employees/{id}", id);
        }
    }

    private Response hire(NewEmployee body) {
        Response response = given().spec(Specs.api()).body(body).when().post("/employees");
        if (response.statusCode() == 201) {
            created.add(response.path("id"));
        }
        return response;
    }

    @Test
    void ethan_nguyen_is_a_software_engineer_at_the_minimum_salary() {
        given().spec(Specs.api())
        .when().get("/employees/13")
        .then().spec(Specs.ok())
                .body("firstName", equalTo("Ethan"))
                .body("lastName", equalTo("Nguyen"))
                .body("gender", equalTo("MALE"))
                .body("jobId", equalTo(4))
                .body("salary", equalTo(80000))
                .body("terminationDate", nullValue())
                .body(matchesJsonSchemaInClasspath("schemas/employee.json"));
    }

    @Test
    void the_response_can_be_read_into_a_java_object() {
        Employee ethan = given().spec(Specs.api()).get("/employees/13").as(Employee.class);

        assertThat(ethan.email()).isEqualTo("ethan.nguyen@icehr.test");
        assertThat(ethan.hireDate()).isEqualTo(LocalDate.of(2023, 4, 3));
        assertThat(ethan.managerId()).isEqualTo(9);
    }

    @Test
    void engineering_has_14_employees_on_one_page() {
        Page<Employee> page = given().spec(Specs.api())
                .queryParam("departmentId", 2)
                .queryParam("size", 20)
        .when().get("/employees")
        .then().spec(Specs.ok())
                .extract().as(new TypeRef<Page<Employee>>() { });

        assertThat(page.totalElements()).isEqualTo(14);
        assertThat(page.totalPages()).isEqualTo(1);
        assertThat(page.content()).extracting(Employee::departmentId).containsOnly(2);
    }

    @Test
    void hiring_returns_201_with_a_location_and_a_lower_case_email() {
        NewEmployee body = NewEmployee.valid().withEmail("Jane.DOE." + System.nanoTime() + "@IceHR.test");

        Response response = hire(body);

        response.then()
                .statusCode(201)
                .header("Location", matchesPattern("/api/v1/employees/\\d+"))
                .body("email", equalTo(body.email().toLowerCase()))
                .body("status", equalTo("ACTIVE"));
        assertThat(response.header("Location")).endsWith("/" + response.path("id"));
    }

    @Test
    void every_invalid_field_is_reported_at_once() {
        Problem problem = given().spec(Specs.api())
                .body("{\"firstName\": \"\", \"email\": \"not-an-email\", \"salary\": \"lots\"}")
        .when().post("/employees")
        .then().spec(Specs.problem(400, "VALIDATION_FAILED"))
                .extract().as(Problem.class);

        assertThat(problem.errors()).contains(
                new Problem.FieldError("firstName", "must not be blank"),
                new Problem.FieldError("email", "must be a valid email address"),
                new Problem.FieldError("salary", "must be a number"),
                new Problem.FieldError("lastName", "is required"),
                new Problem.FieldError("gender", "is required"));
    }

    /** Boundary values of the Software Engineer range (80000 to 115000, both included). */
    @ParameterizedTest(name = "salary {0} -> {1}")
    @CsvSource({
            "79999,  422",
            "80000,  201",
            "115000, 201",
            "115001, 422",
    })
    void salary_must_be_inside_the_job_range(int salary, int expectedStatus) {
        hire(NewEmployee.valid().withSalary(salary)).then().statusCode(expectedStatus);
    }

    @ParameterizedTest(name = "gender {0} is rejected")
    @ValueSource(strings = {"male", "OTHER", ""})
    void gender_must_be_male_or_female(String gender) {
        hire(NewEmployee.valid().withGender(gender))
                .then().spec(Specs.problem(400, "VALIDATION_FAILED"))
                .body("errors[0].field", equalTo("gender"))
                .body("errors[0].message", equalTo("must be one of: MALE, FEMALE"));
    }

    @Test
    void mei_wong_works_in_the_us_which_is_region_1() {
        given().spec(Specs.api())
        .when().get("/employees/11")
        .then().spec(Specs.ok())
                .body("countryCode", equalTo("US"))
                .body("regionId", equalTo(1));
    }

    @Test
    void a_country_that_does_not_exist_is_rejected() {
        hire(NewEmployee.valid().withCountry("XX"))
                .then().spec(Specs.problem(422, "COUNTRY_NOT_FOUND"));
    }

    @Test
    void an_email_already_in_use_is_a_conflict() {
        hire(NewEmployee.valid().withEmail("ETHAN.NGUYEN@icehr.test"))
                .then().spec(Specs.problem(409, "EMAIL_TAKEN"));
    }
}
