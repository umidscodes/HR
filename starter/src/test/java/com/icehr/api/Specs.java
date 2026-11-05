package com.icehr.api;

import com.icehr.config.Config;
import com.icehr.support.Json;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.config.LogConfig;
import io.restassured.config.ObjectMapperConfig;
import io.restassured.config.RestAssuredConfig;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;

import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;

/**
 * Shared request and response specifications, so tests do not repeat the base URL, headers and logging.
 *
 * <pre>
 * given().spec(Specs.api())
 * .when().get("/employees/13")
 * .then().spec(Specs.ok());
 * </pre>
 */
public final class Specs {

    private Specs() {
    }

    /**
     * Jackson with java.time support for bodies (see Json), and: when a check fails, print the whole
     * request and response to the console so you can see what went wrong.
     */
    private static final RestAssuredConfig CONFIG = RestAssuredConfig.config()
            .objectMapperConfig(ObjectMapperConfig.objectMapperConfig().jackson2ObjectMapperFactory((type, charset) -> Json.MAPPER))
            .logConfig(LogConfig.logConfig().enableLoggingOfRequestAndResponseIfValidationFails().enablePrettyPrinting(true));

    /** Base URL + /api/v1, JSON in and out, our Jackson setup and logging when a check fails. */
    public static RequestSpecification api() {
        return new RequestSpecBuilder()
                .setBaseUri(Config.baseUrl())
                .setBasePath("/api/v1")
                .setContentType(ContentType.JSON)
                .setAccept(ContentType.JSON)
                .setConfig(CONFIG)
                .build();
    }

    /** 200 with a JSON body. */
    public static ResponseSpecification ok() {
        return new ResponseSpecBuilder()
                .expectStatusCode(200)
                .expectContentType(ContentType.JSON)
                .expectHeader("X-Request-Id", not(emptyOrNullString()))
                .build();
    }

    /** An RFC 7807 error with this status and code, e.g. problem(422, "SALARY_OUT_OF_RANGE"). */
    public static ResponseSpecification problem(int status, String code) {
        return new ResponseSpecBuilder()
                .expectStatusCode(status)
                .expectHeader("Content-Type", startsWith("application/problem+json"))
                .expectBody("status", equalTo(status))
                .expectBody("code", equalTo(code))
                .build();
    }
}
