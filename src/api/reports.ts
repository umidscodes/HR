/** Reports: read straight from the database view v_department_stats. */
import { Router } from "express";
import { query as sql } from "../db";
import { json, registry, z } from "../openapi";

const StatsSchema = registry.register("DepartmentStats", z.object({
  departmentId: z.number().int().openapi({ example: 2 }),
  departmentName: z.string().openapi({ example: "Engineering" }),
  departmentCode: z.string().openapi({ example: "ENG" }),
  headcount: z.number().int().openapi({ example: 14, description: "ACTIVE employees only." }),
  averageSalary: z.number().int().nullable().openapi({ example: 112143, description: "Rounded to the nearest dollar. Null when headcount is 0." }),
  minSalary: z.number().int().nullable().openapi({ example: 80000 }),
  maxSalary: z.number().int().nullable().openapi({ example: 165000 }),
  totalSalary: z.number().int().openapi({ example: 1570000 }),
}));

export const router = Router();

router.get("/reports/department-stats", async (_req, res) => {
  const rows = await sql<{
    department_id: number; department_name: string; department_code: string; headcount: number;
    average_salary: number | null; min_salary: number | null; max_salary: number | null; total_salary: number;
  }>("SELECT * FROM v_department_stats ORDER BY department_id");
  res.json(rows.map((r) => ({
    departmentId: r.department_id,
    departmentName: r.department_name,
    departmentCode: r.department_code,
    headcount: r.headcount,
    averageSalary: r.average_salary,
    minSalary: r.min_salary,
    maxSalary: r.max_salary,
    totalSalary: r.total_salary,
  })));
});

registry.registerPath({
  method: "get", path: "/api/v1/reports/department-stats", tags: ["Reports"], summary: "Headcount and salary statistics per department",
  description: "Reads the database view `v_department_stats`: one row per department, ACTIVE employees only. " +
    "Compare it with your own SQL GROUP BY query.",
  responses: { 200: json(z.array(StatsSchema), "One entry per department, ordered by departmentId.") },
});
