/**
 * Date rules. "Today" is the current date in Toronto (America/Toronto), whatever the computer's
 * own time zone is. Dates travel as "YYYY-MM-DD" strings.
 */
import { DateTime } from "luxon";

export const ZONE = "America/Toronto";

export function today(): string {
  return DateTime.now().setZone(ZONE).toISODate()!;
}

export function currentYear(): number {
  return DateTime.now().setZone(ZONE).year;
}

export function parseDate(s: string): DateTime {
  return DateTime.fromISO(s, { zone: ZONE });
}

/** True if s is a real calendar date written as YYYY-MM-DD (so 2026-02-30 is false). */
export function isRealDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && DateTime.fromISO(s).isValid;
}

export function addDays(date: string, days: number): string {
  return parseDate(date).plus({ days }).toISODate()!;
}

/** The date someone born on dob turns 18. Born on 29 February: 28 February 18 years later. */
export function eighteenthBirthday(dob: string): string {
  return parseDate(dob).plus({ years: 18 }).toISODate()!;
}

/** Monday-to-Friday days from start to end, both included. Weekends do not count. There is no holiday list. */
export function countWeekdays(start: string, end: string): number {
  let d = parseDate(start);
  const last = parseDate(end);
  let n = 0;
  while (d <= last) {
    if (d.weekday <= 5) n++;
    d = d.plus({ days: 1 });
  }
  return n;
}

/** Date-time as ISO 8601 with the Toronto offset, e.g. 2026-11-05T10:15:00.000-05:00. */
export function isoDateTime(d: Date | string | null): string | null {
  if (d === null) return null;
  const dt = typeof d === "string" ? DateTime.fromISO(d) : DateTime.fromJSDate(d);
  return dt.setZone(ZONE).set({ millisecond: 0 }).toISO({ suppressMilliseconds: true });
}
