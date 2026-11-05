/** Response schemas shown in Swagger. Request schemas live next to their endpoints. */
import { DateTimeStr, registry, z } from "./openapi";

export const EmployeeSchema = registry.register("Employee", z.object({
  id: z.number().int().openapi({ example: 13 }),
  firstName: z.string().openapi({ example: "Ethan" }),
  lastName: z.string().openapi({ example: "Nguyen" }),
  gender: z.enum(["MALE", "FEMALE"]).openapi({ example: "MALE" }),
  email: z.string().openapi({ example: "ethan.nguyen@icehr.test" }),
  phone: z.string().nullable().openapi({ example: "416-555-0113" }),
  dateOfBirth: z.string().openapi({ example: "1996-02-14", format: "date" }),
  hireDate: z.string().openapi({ example: "2023-04-03", format: "date" }),
  jobId: z.number().int().openapi({ example: 4 }),
  departmentId: z.number().int().openapi({ example: 2 }),
  managerId: z.number().int().nullable().openapi({ example: 9 }),
  salary: z.number().int().openapi({ example: 80000, description: "Annual salary in whole dollars." }),
  status: z.enum(["ACTIVE", "TERMINATED"]).openapi({ example: "ACTIVE" }),
  terminationDate: z.string().nullable().openapi({ example: null, format: "date" }),
  createdAt: DateTimeStr,
  updatedAt: DateTimeStr,
}));

export const DepartmentSchema = registry.register("Department", z.object({
  id: z.number().int().openapi({ example: 2 }),
  name: z.string().openapi({ example: "Engineering" }),
  code: z.string().openapi({ example: "ENG" }),
  location: z.string().openapi({ example: "Toronto" }),
  managerId: z.number().int().nullable().openapi({ example: 2 }),
  employeeCount: z.number().int().openapi({ example: 14, description: "Number of ACTIVE employees in the department." }),
  createdAt: DateTimeStr,
  updatedAt: DateTimeStr,
}));

export const LeaveRequestSchema = registry.register("LeaveRequest", z.object({
  id: z.number().int().openapi({ example: 24 }),
  employeeId: z.number().int().openapi({ example: 26 }),
  type: z.enum(["VACATION", "SICK", "PERSONAL"]).openapi({ example: "VACATION" }),
  startDate: z.string().openapi({ example: "2026-11-23", format: "date" }),
  endDate: z.string().openapi({ example: "2026-11-27", format: "date" }),
  days: z.number().int().openapi({ example: 5, description: "Weekdays (Monday to Friday) from startDate to endDate, both included." }),
  reason: z.string().nullable().openapi({ example: "Family trip" }),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).openapi({ example: "PENDING" }),
  approverId: z.number().int().nullable().openapi({ example: null, description: "Who approved or rejected it. Null while pending or when cancelled." }),
  decisionReason: z.string().nullable().openapi({ example: null }),
  decidedAt: DateTimeStr.nullable(),
  createdAt: DateTimeStr,
  updatedAt: DateTimeStr,
}));
