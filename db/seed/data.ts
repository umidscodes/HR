/**
 * The seed data. Fixed ids and fixed dates: after every reset the data is exactly the same,
 * so tests can hard-code ids and expected values. The README lists the useful "personas".
 */

export const JOBS: [id: number, title: string, min: number, max: number][] = [
  [1, "Chief Executive Officer", 200000, 350000],
  [2, "Engineering Manager", 140000, 190000],
  [3, "Senior Software Engineer", 110000, 150000],
  [4, "Software Engineer", 80000, 115000],
  [5, "QA Manager", 100000, 140000],
  [6, "QA Analyst", 60000, 90000],
  [7, "Product Manager", 95000, 140000],
  [8, "HR Manager", 90000, 130000],
  [9, "HR Specialist", 55000, 80000],
  [10, "Finance Manager", 100000, 150000],
  [11, "Accountant", 60000, 90000],
  [12, "Sales Manager", 90000, 140000],
  [13, "Sales Representative", 45000, 75000],
  [14, "Support Manager", 70000, 100000],
  [15, "Support Agent", 40000, 60000],
];

export const DEPARTMENTS: [id: number, name: string, code: string, location: string, managerId: number | null][] = [
  [1, "Executive", "EXEC", "Toronto", 1],
  [2, "Engineering", "ENG", "Toronto", 2],
  [3, "Quality Assurance", "QA", "Montreal", 3],
  [4, "Product", "PROD", "Toronto", 4],
  [5, "Human Resources", "HR", "Ottawa", 5],
  [6, "Finance", "FIN", "Toronto", 6],
  [7, "Sales", "SALES", "Vancouver", 7],
  [8, "Customer Support", "SUP", "Halifax", 8],
  [9, "Research Lab", "LAB", "Waterloo", null], // no employees: the one department you can delete
];

type Emp = [
  id: number, firstName: string, lastName: string, gender: "MALE" | "FEMALE", jobId: number, departmentId: number, managerId: number | null,
  salary: number, dateOfBirth: string, hireDate: string, phone: string | null, countryCode: string,
];

/** The last column is the country the employee works in (ISO code; see db/migrations/005_regions.sql). */
export const EMPLOYEES: Emp[] = [
  // Executive
  [1, "Margaret", "Chen", "FEMALE", 1, 1, null, 310000, "1968-04-22", "2012-01-09", "416-555-0101", "CA"],
  // Department managers, all reporting to the CEO
  [2, "Daniel", "Okafor", "MALE", 2, 2, 1, 172000, "1979-09-03", "2013-05-13", "416-555-0102", "CA"],
  [3, "Sofia", "Rossi", "FEMALE", 5, 3, 1, 128000, "1982-01-27", "2014-03-03", "514-555-0103", "CA"],
  [4, "Arjun", "Patel", "MALE", 7, 4, 1, 136000, "1984-11-11", "2015-06-01", "416-555-0104", "CA"],
  [5, "Chloé", "Tremblay", "FEMALE", 8, 5, 1, 118000, "1980-07-19", "2013-09-16", "613-555-0105", "CA"],
  [6, "Robert", "MacDonald", "MALE", 10, 6, 1, 141000, "1975-02-08", "2012-08-20", "416-555-0106", "CA"],
  [7, "Priya", "Sharma", "FEMALE", 12, 7, 1, 125000, "1983-12-30", "2016-01-11", "604-555-0107", "CA"],
  [8, "Marc", "Gagnon", "MALE", 14, 8, 1, 92000, "1986-05-05", "2017-04-03", "902-555-0108", "CA"],
  // Engineering: four senior engineers report to Daniel; Aisha and Liam each lead a team
  [9, "Aisha", "Rahman", "FEMALE", 3, 2, 2, 150000, "1988-03-14", "2016-09-12", "416-555-0109", "CA"],
  [10, "Liam", "O'Brien", "MALE", 3, 2, 2, 142000, "1987-10-02", "2017-02-06", "416-555-0110", "CA"],
  [11, "Mei", "Wong", "FEMALE", 3, 2, 2, 131000, "1990-06-25", "2018-07-09", "416-555-0111", "US"],
  [12, "Lucas", "Martin", "MALE", 3, 2, 2, 118000, "1991-08-17", "2019-03-18", "416-555-0112", "FR"],
  [13, "Ethan", "Nguyen", "MALE", 4, 2, 9, 80000, "1996-02-14", "2023-04-03", "416-555-0113", "CA"],
  [14, "Olivia", "Brown", "FEMALE", 4, 2, 9, 96000, "1994-12-01", "2021-08-23", "416-555-0114", "CA"],
  [15, "Noah", "Wilson", "MALE", 4, 2, 9, 101000, "1993-04-09", "2020-10-05", "416-555-0115", "CA"],
  [16, "Fatima", "Haddad", "FEMALE", 4, 2, 9, 107000, "1995-09-21", "2022-01-10", "416-555-0116", "CA"],
  [17, "Jack", "Thompson", "MALE", 4, 2, 9, 88000, "1997-07-07", "2024-06-17", "416-555-0117", "CA"],
  [18, "Zoe", "Leblanc", "FEMALE", 4, 2, 10, 112000, "1992-03-30", "2019-11-25", "416-555-0118", "US"],
  [19, "Ryan", "Kim", "MALE", 4, 2, 10, 92000, "1998-01-19", "2024-09-03", "416-555-0119", "KR"],
  [20, "Hannah", "Schmidt", "FEMALE", 4, 2, 10, 99000, "1995-05-28", "2022-05-16", null, "DE"],
  [21, "Omar", "Siddiqui", "MALE", 4, 2, 10, 85000, "1999-11-08", "2025-02-03", "416-555-0121", "PK"],
  // Quality Assurance
  [22, "Emma", "Lavoie", "FEMALE", 6, 3, 3, 86000, "1989-04-16", "2017-10-02", "514-555-0122", "CA"],
  [23, "Kevin", "Singh", "MALE", 6, 3, 3, 78000, "1993-08-08", "2020-02-17", "514-555-0123", "CA"],
  [24, "Ana", "Silva", "FEMALE", 6, 3, 3, 72000, "1994-10-12", "2021-04-12", "514-555-0124", "CA"],
  [25, "Benjamin", "Roy", "MALE", 6, 3, 3, 65000, "1997-02-03", "2023-01-16", "514-555-0125", "CA"],
  [26, "Isabella", "Garcia", "FEMALE", 6, 3, 3, 81000, "1991-12-24", "2019-06-03", "514-555-0126", "CA"],
  [27, "Samuel", "Côté", "MALE", 6, 3, 3, 69000, "1998-06-30", "2024-03-04", "514-555-0127", "MX"],
  [28, "Nadia", "Petrova", "FEMALE", 6, 3, 3, 90000, "1985-01-11", "2015-11-09", "514-555-0128", "CA"],
  // Product
  [29, "Grace", "Liu", "FEMALE", 7, 4, 4, 118000, "1989-09-09", "2018-01-08", "416-555-0129", "US"],
  [30, "Thomas", "Bergeron", "MALE", 7, 4, 4, 104000, "1992-02-22", "2020-07-06", "416-555-0130", "US"],
  [31, "Leila", "Ahmadi", "FEMALE", 7, 4, 4, 97000, "1994-04-04", "2022-09-12", "416-555-0131", "AE"],
  [32, "William", "Scott", "MALE", 7, 4, 4, 95000, "1996-10-10", "2025-05-05", "416-555-0132", "GB"],
  // Human Resources
  [33, "Julia", "Fortin", "FEMALE", 9, 5, 5, 74000, "1988-08-28", "2016-04-18", "613-555-0133", "CA"],
  [34, "Michael", "Adeyemi", "MALE", 9, 5, 5, 68000, "1992-11-15", "2019-09-23", "613-555-0134", "CA"],
  [35, "Sarah", "Cohen", "FEMALE", 9, 5, 5, 61000, "1996-03-03", "2023-08-14", null, "CA"],
  [36, "David", "Park", "MALE", 9, 5, 5, 57000, "1999-07-21", "2025-09-08", "613-555-0136", "CA"],
  // Finance
  [37, "Elizabeth", "Murray", "FEMALE", 11, 6, 6, 84000, "1981-05-14", "2014-10-06", "416-555-0137", "CA"],
  [38, "Hiroshi", "Tanaka", "MALE", 11, 6, 6, 79000, "1987-12-12", "2018-04-02", "416-555-0138", "JP"],
  [39, "Maria", "Santos", "FEMALE", 11, 6, 6, 71000, "1990-01-31", "2020-11-16", "416-555-0139", "CA"],
  [40, "Patrick", "Kelly", "MALE", 11, 6, 6, 66000, "1995-06-06", "2023-02-20", "416-555-0140", "IE"],
  [41, "Amira", "Youssef", "FEMALE", 11, 6, 6, 62000, "1998-09-18", "2025-01-13", "416-555-0141", "EG"],
  // Sales
  [42, "Jessica", "Taylor", "FEMALE", 13, 7, 7, 72000, "1986-02-26", "2016-05-09", "604-555-0142", "US"],
  [43, "Carlos", "Mendez", "MALE", 13, 7, 7, 68000, "1990-07-04", "2018-08-13", "604-555-0143", "US"],
  [44, "Rachel", "Morin", "FEMALE", 13, 7, 7, 59000, "1993-03-17", "2021-03-01", "604-555-0144", "CA"],
  [45, "Vikram", "Rao", "MALE", 13, 7, 7, 64000, "1991-10-29", "2019-01-21", "604-555-0145", "IN"],
  [46, "Laura", "Bouchard", "FEMALE", 13, 7, 7, 55000, "1997-04-23", "2023-05-29", "604-555-0146", "CA"],
  [47, "Andrew", "Campbell", "MALE", 13, 7, 7, 51000, "1999-12-05", "2024-11-18", null, "US"],
  [48, "Yasmin", "Ali", "FEMALE", 13, 7, 7, 61000, "1994-08-11", "2022-06-20", "604-555-0148", "KE"],
  [49, "Jordan", "Lee", "MALE", 13, 7, 7, 47000, "2001-01-09", "2025-06-16", "604-555-0149", "AU"],
  [50, "Natalie", "Dubois", "FEMALE", 13, 7, 7, 53000, "1996-09-02", "2024-01-08", "604-555-0150", "US"],
  [51, "Christopher", "Hall", "MALE", 13, 7, 7, 45000, "2002-05-20", "2026-01-12", "604-555-0151", "US"],
  // Customer Support
  [52, "Sophie", "Pelletier", "FEMALE", 15, 8, 8, 58000, "1990-11-30", "2018-03-12", "902-555-0152", "CA"],
  [53, "Ahmed", "Hassan", "MALE", 15, 8, 8, 54000, "1993-06-14", "2020-09-08", "902-555-0153", "CA"],
  [54, "Emily", "Clarke", "FEMALE", 15, 8, 8, 49000, "1995-01-25", "2021-10-18", "902-555-0154", "CA"],
  [55, "Diego", "Torres", "MALE", 15, 8, 8, 52000, "1992-08-19", "2022-02-28", "902-555-0155", "BR"],
  [56, "Amélie", "Girard", "FEMALE", 15, 8, 8, 47000, "1997-12-03", "2023-10-02", "902-555-0156", "CA"],
  [57, "Brandon", "White", "MALE", 15, 8, 8, 44000, "2000-04-28", "2025-03-17", "902-555-0157", "JM"],
  [58, "Tanya", "Ivanova", "FEMALE", 15, 8, 8, 46000, "1994-02-10", "2021-07-05", "902-555-0158", "CA"], // terminated, see TERMINATED
  [59, "Kofi", "Mensah", "MALE", 15, 8, 8, 50000, "1996-07-16", "2024-04-22", "902-555-0159", "GH"],
  [60, "Ella", "Robinson", "FEMALE", 15, 8, 8, 40000, "2007-03-15", "2026-10-19", "902-555-0160", "CA"],
];

/** Employees who have left: id -> termination date. */
export const TERMINATED: Record<number, string> = { 58: "2026-06-30" };

/** first.last@icehr.test, in plain ASCII: "Chloé" -> "chloe", "O'Brien" -> "obrien". */
export function emailFor(first: string, last: string): string {
  const ascii = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").toLowerCase();
  return `${ascii(first)}.${ascii(last)}@icehr.test`;
}

type Leave = [
  id: number, employeeId: number, type: "VACATION" | "SICK" | "PERSONAL", start: string, end: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED", approverId: number | null, reason: string | null, decisionReason: string | null,
];

export const LEAVE_REQUESTS: Leave[] = [
  // 2025
  [1, 13, "VACATION", "2025-07-07", "2025-07-18", "APPROVED", 9, "Summer holiday", null],
  [2, 22, "VACATION", "2025-08-04", "2025-08-08", "APPROVED", 3, null, null],
  [3, 43, "SICK", "2025-11-03", "2025-11-04", "APPROVED", 7, "Flu", null],
  [4, 30, "PERSONAL", "2025-12-19", "2025-12-19", "APPROVED", 4, "Moving day", null],
  [5, 54, "VACATION", "2025-12-22", "2025-12-31", "REJECTED", 8, "Holidays with family", "Holiday coverage is already full."],
  // 2026, already decided
  [6, 14, "VACATION", "2026-01-12", "2026-01-16", "APPROVED", 9, "Ski trip", null],
  [7, 16, "VACATION", "2026-03-02", "2026-03-13", "APPROVED", 9, "Visiting family", null],
  [8, 16, "VACATION", "2026-07-06", "2026-07-17", "APPROVED", 9, "Summer holiday", null],
  [9, 23, "VACATION", "2026-02-16", "2026-02-20", "APPROVED", 3, null, null],
  [10, 23, "VACATION", "2026-08-10", "2026-08-21", "APPROVED", 3, "Road trip", null],
  [11, 24, "SICK", "2026-04-06", "2026-04-07", "APPROVED", 3, null, null],
  [12, 25, "PERSONAL", "2026-05-15", "2026-05-15", "APPROVED", 3, "Citizenship ceremony", null],
  [13, 33, "VACATION", "2026-06-22", "2026-06-26", "APPROVED", 5, null, null],
  [14, 38, "VACATION", "2026-09-08", "2026-09-11", "APPROVED", 6, "Wedding", null],
  [15, 45, "SICK", "2026-10-13", "2026-10-14", "APPROVED", 7, null, null],
  [16, 48, "VACATION", "2026-05-04", "2026-05-08", "REJECTED", 7, "Beach week", "Quarter-end sales push."],
  [17, 52, "VACATION", "2026-04-20", "2026-04-24", "CANCELLED", null, "Trip to Lisbon", null],
  [18, 58, "VACATION", "2026-03-09", "2026-03-13", "APPROVED", 8, null, null],
  [19, 58, "VACATION", "2026-08-03", "2026-08-07", "CANCELLED", null, "Camping", "Employee terminated."],
  [20, 2, "VACATION", "2026-08-17", "2026-08-28", "APPROVED", 1, "Family holiday", null],
  [21, 7, "PERSONAL", "2026-02-13", "2026-02-13", "APPROVED", 1, null, null],
  [22, 41, "SICK", "2026-09-21", "2026-09-21", "APPROVED", 6, null, null],
  [23, 36, "SICK", "2026-10-26", "2026-10-27", "APPROVED", 5, null, null],
  [24, 47, "VACATION", "2026-10-05", "2026-10-09", "APPROVED", 7, null, null],
  // Waiting for a decision
  [25, 15, "VACATION", "2026-12-21", "2026-12-31", "PENDING", null, "Christmas at home", null],
  [26, 26, "VACATION", "2026-11-23", "2026-11-27", "PENDING", null, "Family trip", null],
  [27, 31, "PERSONAL", "2026-12-04", "2026-12-04", "PENDING", null, null, null],
  [28, 44, "VACATION", "2026-12-14", "2026-12-18", "PENDING", null, null, null],
  [29, 55, "SICK", "2026-11-02", "2026-11-03", "PENDING", null, "Back pain", null],
  [30, 21, "PERSONAL", "2026-11-13", "2026-11-13", "PENDING", null, "Driving test", null],
  [31, 59, "VACATION", "2026-12-28", "2026-12-31", "PENDING", null, null, null],
  [32, 34, "VACATION", "2027-01-04", "2027-01-08", "PENDING", null, "New Year trip", null],
  // Decided, in the future
  [33, 17, "VACATION", "2026-12-07", "2026-12-11", "APPROVED", 9, "Conference and holiday", null],
  [34, 12, "VACATION", "2026-12-01", "2026-12-04", "APPROVED", 2, null, null],
  [35, 49, "VACATION", "2026-11-16", "2026-11-20", "REJECTED", 7, "Trip", "Trade show week."],
];
