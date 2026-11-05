/**
 * Database rows (snake_case) and how they map to API JSON (camelCase).
 * Shared by the endpoint modules so every endpoint returns the same shape for the same thing.
 */
import { isoDateTime } from "./dates";
import { query, type Db } from "./db";

export interface EmployeeRow {
  id: number; first_name: string; last_name: string; gender: Gender; email: string; phone: string | null;
  date_of_birth: string; hire_date: string; job_id: number; department_id: number; manager_id: number | null;
  salary: number; status: "ACTIVE" | "TERMINATED"; termination_date: string | null; created_at: Date; updated_at: Date;
}

export const GENDERS = ["MALE", "FEMALE"] as const;
export type Gender = (typeof GENDERS)[number];

export const EMPLOYEE_COLUMNS = `id, first_name, last_name, gender, email, phone, date_of_birth, hire_date, job_id, department_id,
  manager_id, salary, status, termination_date, created_at, updated_at`;

export const toEmployee = (r: EmployeeRow) => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  gender: r.gender,
  email: r.email,
  phone: r.phone,
  dateOfBirth: r.date_of_birth,
  hireDate: r.hire_date,
  jobId: r.job_id,
  departmentId: r.department_id,
  managerId: r.manager_id,
  salary: r.salary,
  status: r.status,
  terminationDate: r.termination_date,
  createdAt: isoDateTime(r.created_at),
  updatedAt: isoDateTime(r.updated_at),
});

export async function findEmployee(id: number, db?: Db, lock = false): Promise<EmployeeRow | undefined> {
  const [row] = await query<EmployeeRow>(`SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1${lock ? " FOR UPDATE" : ""}`, [id], db);
  return row;
}

export interface DepartmentRow {
  id: number; name: string; code: string; location: string; manager_id: number | null;
  employee_count: number; created_at: Date; updated_at: Date;
}

export const DEPARTMENT_SELECT = `SELECT d.id, d.name, d.code, d.location, d.manager_id, d.created_at, d.updated_at,
  (SELECT COUNT(*) FROM employees e WHERE e.department_id = d.id AND e.status = 'ACTIVE')::int AS employee_count
  FROM departments d`;

export const toDepartment = (r: DepartmentRow) => ({
  id: r.id,
  name: r.name,
  code: r.code,
  location: r.location,
  managerId: r.manager_id,
  employeeCount: r.employee_count,
  createdAt: isoDateTime(r.created_at),
  updatedAt: isoDateTime(r.updated_at),
});

export interface LeaveRow {
  id: number; employee_id: number; type: LeaveType; start_date: string; end_date: string; days: number;
  reason: string | null; status: LeaveStatus; approver_id: number | null; decision_reason: string | null;
  decided_at: Date | null; created_at: Date; updated_at: Date;
}

export const LEAVE_TYPES = ["VACATION", "SICK", "PERSONAL"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];
export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/** Days allowed per calendar year, per leave type. */
export const ALLOWANCE: Record<LeaveType, number> = { VACATION: 20, SICK: 10, PERSONAL: 3 };

export const LEAVE_COLUMNS = `id, employee_id, type, start_date, end_date, days, reason, status, approver_id,
  decision_reason, decided_at, created_at, updated_at`;

export const toLeave = (r: LeaveRow) => ({
  id: r.id,
  employeeId: r.employee_id,
  type: r.type,
  startDate: r.start_date,
  endDate: r.end_date,
  days: r.days,
  reason: r.reason,
  status: r.status,
  approverId: r.approver_id,
  decisionReason: r.decision_reason,
  decidedAt: isoDateTime(r.decided_at),
  createdAt: isoDateTime(r.created_at),
  updatedAt: isoDateTime(r.updated_at),
});
