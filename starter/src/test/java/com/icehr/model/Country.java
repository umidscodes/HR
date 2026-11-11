package com.icehr.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/** A country from GET /countries: its two-letter code, name and region (1 to 20). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record Country(String code, String name, Integer regionId) {
}
