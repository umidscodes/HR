/** Jobs: read-only reference data. Each job has a salary range that employee salaries must fall within. */
import { Router } from "express";
import { query as sql } from "../db";
import { notFound } from "../errors";
import { pathId } from "../http";
import { idParam, json, problem, problemExample, registry, z } from "../openapi";

export const JobSchema = registry.register("Job", z.object({
  id: z.number().int().openapi({ example: 4 }),
  title: z.string().openapi({ example: "Software Engineer" }),
  minSalary: z.number().int().openapi({ example: 80000 }),
  maxSalary: z.number().int().openapi({ example: 115000 }),
}));

export interface JobRow { id: number; title: string; min_salary: number; max_salary: number }

export const toJob = (r: JobRow) => ({ id: r.id, title: r.title, minSalary: r.min_salary, maxSalary: r.max_salary });

export const router = Router();

router.get("/jobs", async (_req, res) => {
  const rows = await sql<JobRow>("SELECT id, title, min_salary, max_salary FROM jobs ORDER BY id");
  res.json(rows.map(toJob));
});

router.get("/jobs/:id", async (req, res) => {
  const id = pathId(req);
  const [row] = await sql<JobRow>("SELECT id, title, min_salary, max_salary FROM jobs WHERE id = $1", [id]);
  if (!row) throw notFound("Job", id);
  res.json(toJob(row));
});

registry.registerPath({
  method: "get", path: "/api/v1/jobs", tags: ["Jobs"], summary: "List all jobs",
  description: "Returns a plain JSON array (not a page), ordered by id.",
  responses: { 200: json(z.array(JobSchema), "All 15 jobs.") },
});
registry.registerPath({
  method: "get", path: "/api/v1/jobs/{id}", tags: ["Jobs"], summary: "Get one job",
  request: { params: idParam },
  responses: {
    200: json(JobSchema, "The job."),
    400: problem("The id is not a positive whole number.", problemExample(400, "VALIDATION_FAILED", "One or more fields are invalid.", "/api/v1/jobs/abc", [{ field: "id", message: "must be a positive whole number" }])),
    404: problem("No job has this id.", problemExample(404, "NOT_FOUND", "Job 99 was not found.", "/api/v1/jobs/99")),
  },
});
