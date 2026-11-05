package com.icehr.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Properties;

/**
 * Where Ice HR runs. Values come from src/test/resources/config/local.properties.
 * Any key can be overridden on the command line: {@code mvn test -DbaseUrl=http://localhost:8081}.
 */
public final class Config {

    private static final Properties FILE = load("config/local.properties");

    private Config() {
    }

    /** The app, e.g. http://localhost:8080. The REST API is under /api/v1. */
    public static String baseUrl() {
        String url = get("baseUrl");
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    public static String jdbcUrl() {
        return get("jdbcUrl");
    }

    /** Read-only database user: qa_reader. */
    public static String dbUser() {
        return get("dbUser");
    }

    public static String dbPassword() {
        return get("dbPassword");
    }

    /** Read-write database user: qa_writer. */
    public static String dbWriterUser() {
        return get("dbWriterUser");
    }

    public static String dbWriterPassword() {
        return get("dbWriterPassword");
    }

    /** A system property (-Dkey=value) wins over the file. */
    public static String get(String key) {
        String value = System.getProperty(key, FILE.getProperty(key));
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Config key '" + key + "' is missing. Add it to src/test/resources/config/local.properties.");
        }
        return value.trim();
    }

    private static Properties load(String resource) {
        Properties p = new Properties();
        try (InputStream in = Config.class.getClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException("Missing " + resource + " in src/test/resources.");
            }
            p.load(in);
            return p;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + resource, e);
        }
    }
}
