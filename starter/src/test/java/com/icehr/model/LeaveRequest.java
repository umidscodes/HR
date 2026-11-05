package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record LeaveRequest(
        Integer id,
        Integer employeeId,
        String type,
        LocalDate startDate,
        LocalDate endDate,
        Integer days,
        String reason,
        String status,
        Integer approverId,
        String decisionReason,
        OffsetDateTime decidedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
