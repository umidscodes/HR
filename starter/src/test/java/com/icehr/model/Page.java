package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * One page of a paged list (GET /employees, GET /leave-requests). Read it with a TypeRef:
 * <pre>
 * Page&lt;Employee&gt; page = given().spec(Specs.api()).get("/employees").as(new TypeRef&lt;Page&lt;Employee&gt;&gt;() {});
 * </pre>
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Page<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
}
