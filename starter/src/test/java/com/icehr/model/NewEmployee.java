package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDate;

/**
 * The body for POST /employees and PUT /employees/{id}. Null fields are left out of the JSON,
 * which is how you test "a required field is missing".
 *
 * <pre>
 * NewEmployee body = NewEmployee.valid().withSalary(79999);
 * </pre>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record NewEmployee(
        String firstName,
        String lastName,
        String gender,
        String email,
        String phone,
        LocalDate dateOfBirth,
        LocalDate hireDate,
        Integer jobId,
        Integer departmentId,
        Integer managerId,
        Integer salary,
        String countryCode) {

    /** A Software Engineer in Engineering, working in Canada, reporting to Aisha (9), with a unique email: passes every rule. */
    public static NewEmployee valid() {
        return new NewEmployee("Test", "Engineer", "FEMALE", com.icehr.support.TestData.uniqueEmail(), "416-555-0199",
                LocalDate.of(1995, 6, 15), LocalDate.of(2024, 3, 4), 4, 2, 9, 95000, "CA");
    }

    /** Two capital letters of a country in GET /countries, e.g. "US" (an unknown code is 422 COUNTRY_NOT_FOUND). */
    public NewEmployee withCountry(String countryCode) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }

    /** "MALE" or "FEMALE" (anything else is a 400). */
    public NewEmployee withGender(String gender) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }

    public NewEmployee withEmail(String email) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }

    public NewEmployee withSalary(Integer salary) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }

    public NewEmployee withDates(LocalDate dateOfBirth, LocalDate hireDate) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }

    public NewEmployee withJob(Integer jobId) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }

    public NewEmployee withManager(Integer managerId) {
        return new NewEmployee(firstName, lastName, gender, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary, countryCode);
    }
}
