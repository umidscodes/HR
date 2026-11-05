package com.icehr.tests;

import com.icehr.db.Db;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** First database tests: connect as qa_reader and check seed data with SQL. */
@Tag("db")
class DbSmokeTest {

    private final Db db = Db.reader();

    @Test
    void the_seed_has_60_employees() {
        // Seeded rows have ids below 1000; rows created by tests start at 1001.
        Long seeded = db.scalar(Long.class, "SELECT COUNT(*) FROM employees WHERE id < 1000");
        assertThat(seeded).isEqualTo(60L);
    }

    @Test
    void ethan_nguyen_in_the_database() {
        Map<String, Object> row = db.queryOne(
                "SELECT first_name, last_name, salary, hire_date, manager_id FROM employees WHERE id = ?", 13);

        assertThat(row)
                .containsEntry("first_name", "Ethan")
                .containsEntry("salary", 80000)
                .containsEntry("hire_date", LocalDate.of(2023, 4, 3))
                .containsEntry("manager_id", 9);
    }

    @Test
    void the_stats_view_has_one_row_per_department() {
        List<Map<String, Object>> rows = db.queryList(
                "SELECT department_code, headcount FROM v_department_stats WHERE department_id < 1000 ORDER BY department_id");

        assertThat(rows).hasSize(9);
        assertThat(rows.get(8)).containsEntry("department_code", "LAB").containsEntry("headcount", 0);
    }

    @Test
    void qa_reader_cannot_change_data() {
        assertThatThrownBy(() -> db.update("UPDATE employees SET salary = 1 WHERE id = 13"))
                .hasMessageContaining("permission denied");
    }
}
