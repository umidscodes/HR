package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** An RFC 7807 error body. errors is only filled for 400 VALIDATION_FAILED. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Problem(
        String type,
        String title,
        Integer status,
        String detail,
        String instance,
        String code,
        List<FieldError> errors) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FieldError(String field, String message) {
    }
}
