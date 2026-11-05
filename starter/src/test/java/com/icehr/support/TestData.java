package com.icehr.support;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Test data that never clashes and never goes stale.
 *
 * <ul>
 *   <li>Unique emails, because email must be unique (409 EMAIL_TAKEN otherwise).</li>
 *   <li>Dates computed from today in Toronto, because Ice HR's date rules use Toronto's "today"
 *       and leave cannot start in the past.</li>
 * </ul>
 */
public final class TestData {

    public static final ZoneId TORONTO = ZoneId.of("America/Toronto");

    private TestData() {
    }

    /** e.g. test.3f9a1c2b@icehr.test */
    public static String uniqueEmail() {
        return "test." + UUID.randomUUID().toString().substring(0, 8) + "@icehr.test";
    }

    /** Today's date in Toronto (the date Ice HR uses). */
    public static LocalDate today() {
        return LocalDate.now(TORONTO);
    }

    /**
     * A Monday at least {@code weeksAhead} weeks from today, chosen so that Monday to Friday of that week are in
     * the same calendar year (leave cannot cross into the next year).
     */
    public static LocalDate futureMonday(int weeksAhead) {
        LocalDate d = today().plusWeeks(weeksAhead);
        while (d.getDayOfWeek() != DayOfWeek.MONDAY) {
            d = d.plusDays(1);
        }
        if (d.plusDays(4).getYear() != d.getYear()) {
            d = d.plusWeeks(1);
        }
        return d;
    }
}
