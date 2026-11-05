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
        String email,
        String phone,
        LocalDate dateOfBirth,
        LocalDate hireDate,
        Integer jobId,
        Integer departmentId,
        Integer managerId,
        Integer salary) {

    /** A Software Engineer in Engineering reporting to Aisha (9) with a unique email: passes every rule. */
    public static NewEmployee valid() {
        return new NewEmployee("Test", "Engineer", com.icehr.support.TestData.uniqueEmail(), "416-555-0199",
                LocalDate.of(1995, 6, 15), LocalDate.of(2024, 3, 4), 4, 2, 9, 95000);
    }

    public NewEmployee withEmail(String email) {
        return new NewEmployee(firstName, lastName, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary);
    }

    public NewEmployee withSalary(Integer salary) {
        return new NewEmployee(firstName, lastName, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary);
    }

    public NewEmployee withDates(LocalDate dateOfBirth, LocalDate hireDate) {
        return new NewEmployee(firstName, lastName, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary);
    }

    public NewEmployee withJob(Integer jobId) {
        return new NewEmployee(firstName, lastName, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary);
    }

    public NewEmployee withManager(Integer managerId) {
        return new NewEmployee(firstName, lastName, email, phone, dateOfBirth, hireDate, jobId, departmentId, managerId, salary);
    }
}
