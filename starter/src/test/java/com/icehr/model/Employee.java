package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * An employee as the API returns it. A Java record: a class with final fields, a constructor,
 * accessors (employee.salary()), equals, hashCode and toString, all generated.
 * ignoreUnknown = true: if the API adds a field later, these tests keep working.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Employee(
        Integer id,
        String firstName,
        String lastName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        LocalDate hireDate,
        Integer jobId,
        Integer departmentId,
        Integer managerId,
        Integer salary,
        String status,
        LocalDate terminationDate,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
