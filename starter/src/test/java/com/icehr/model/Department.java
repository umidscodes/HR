package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record Department(
        Integer id,
        String name,
        String code,
        String location,
        Integer managerId,
        Integer employeeCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
