package com.icehr.db;

import com.icehr.config.Config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A small JDBC helper for the Ice HR database.
 *
 * <pre>
 * Db db = Db.reader();
 * Map&lt;String, Object&gt; row = db.queryOne("SELECT first_name, salary FROM employees WHERE id = ?", 13);
 * Long count = db.scalar(Long.class, "SELECT COUNT(*) FROM employees WHERE department_id = ?", 2); // COUNT(*) is a bigint: Long
 * </pre>
 *
 * <ul>
 *   <li>Always use {@code ?} placeholders, never string concatenation: no quoting bugs, no SQL injection.</li>
 *   <li>Rows come back as maps from column name to value. {@code date} columns are {@link LocalDate},
 *       {@code timestamptz} columns are {@link OffsetDateTime}, integers are {@link Integer} (or {@link Long} for COUNT(*)).</li>
 *   <li>Each call opens and closes its own connection: simple, safe and fast enough for tests.</li>
 * </ul>
 */
public final class Db {

    private final String user;
    private final String password;

    private Db(String user, String password) {
        this.user = user;
        this.password = password;
    }

    /** Read-only access as qa_reader. Use this for checks. */
    public static Db reader() {
        return new Db(Config.dbUser(), Config.dbPassword());
    }

    /** Read-write access as qa_writer. Use this to set up or clean up test data. */
    public static Db writer() {
        return new Db(Config.dbWriterUser(), Config.dbWriterPassword());
    }

    /** A new connection. Close it when you are done (try-with-resources does that for you). */
    public Connection connect() throws SQLException {
        return DriverManager.getConnection(Config.jdbcUrl(), user, password);
    }

    /** Every row of a SELECT. */
    public List<Map<String, Object>> queryList(String sql, Object... params) {
        try (Connection c = connect(); PreparedStatement ps = prepare(c, sql, params); ResultSet rs = ps.executeQuery()) {
            return readRows(rs);
        } catch (SQLException e) {
            throw new IllegalStateException("SQL failed: " + sql + " -> " + e.getMessage(), e);
        }
    }

    /** Exactly one row. Fails the test if there are none or several. */
    public Map<String, Object> queryOne(String sql, Object... params) {
        List<Map<String, Object>> rows = queryList(sql, params);
        if (rows.size() != 1) {
            throw new AssertionError("Expected exactly 1 row but got " + rows.size() + " for: " + sql);
        }
        return rows.get(0);
    }

    /** The single value of a one-row, one-column query, e.g. a COUNT(*). Null if the value is NULL. */
    public <T> T scalar(Class<T> type, String sql, Object... params) {
        try (Connection c = connect(); PreparedStatement ps = prepare(c, sql, params); ResultSet rs = ps.executeQuery()) {
            if (!rs.next()) {
                throw new AssertionError("Expected 1 row but got none for: " + sql);
            }
            return rs.getObject(1, type);
        } catch (SQLException e) {
            throw new IllegalStateException("SQL failed: " + sql + " -> " + e.getMessage(), e);
        }
    }

    /** INSERT, UPDATE or DELETE (needs {@link #writer()}). Returns how many rows changed. */
    public int update(String sql, Object... params) {
        try (Connection c = connect(); PreparedStatement ps = prepare(c, sql, params)) {
            return ps.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("SQL failed: " + sql + " -> " + e.getMessage(), e);
        }
    }

    private static PreparedStatement prepare(Connection c, String sql, Object... params) throws SQLException {
        PreparedStatement ps = c.prepareStatement(sql);
        for (int i = 0; i < params.length; i++) {
            ps.setObject(i + 1, params[i]);
        }
        return ps;
    }

    private static List<Map<String, Object>> readRows(ResultSet rs) throws SQLException {
        ResultSetMetaData md = rs.getMetaData();
        List<Map<String, Object>> rows = new ArrayList<>();
        while (rs.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= md.getColumnCount(); i++) {
                Object value = rs.getObject(i);
                if (value != null && "date".equals(md.getColumnTypeName(i))) {
                    value = rs.getObject(i, LocalDate.class);
                } else if (value != null && "timestamptz".equals(md.getColumnTypeName(i))) {
                    value = rs.getObject(i, OffsetDateTime.class);
                }
                row.put(md.getColumnLabel(i), value);
            }
            rows.add(row);
        }
        return rows;
    }
}
