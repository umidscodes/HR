/** Test support: a health check and a one-call reset back to the seed data. No key or login needed. */
import { Router } from "express";
import { pool, query as sql } from "../db";
import { today, isoDateTime } from "../dates";
import { json, registry, z } from "../openapi";
import { resetData } from "../../db/seed/reset";

export const router = Router();

router.get("/health", async (_req, res) => {
  let database = "UP";
  try { await sql("SELECT 1"); } catch { database = "DOWN"; }
  res.status(database === "UP" ? 200 : 503).json({
    status: database === "UP" ? "UP" : "DOWN",
    database,
    today: today(),
    time: isoDateTime(new Date()),
  });
});

router.post("/reset", async (_req, res) => {
  const c = await pool().connect();
  try {
    const summary = await resetData(c);
    res.json({ status: "RESET", ...summary });
  } finally {
    c.release();
  }
});

registry.registerPath({
  method: "get", path: "/api/v1/health", tags: ["Test support"], summary: "Is the app up?",
  description: "`today` is the current date in Toronto: the date every date rule uses.",
  responses: {
    200: json(z.object({
      status: z.string().openapi({ example: "UP" }),
      database: z.string().openapi({ example: "UP" }),
      today: z.string().openapi({ example: "2026-11-05" }),
      time: z.string().openapi({ example: "2026-11-05T10:15:00-05:00" }),
    }), "The app and its database are up."),
    503: { description: "The database is not reachable (status DOWN)." },
  },
});
registry.registerPath({
  method: "post", path: "/api/v1/reset", tags: ["Test support"], summary: "Reset all data to the seed",
  description: "Deletes everything and reloads the seed data with the same ids and values. New records get ids from 1001 again. No body.",
  responses: {
    200: json(z.object({
      status: z.string().openapi({ example: "RESET" }),
      jobs: z.number().int().openapi({ example: 15 }),
      departments: z.number().int().openapi({ example: 9 }),
      employees: z.number().int().openapi({ example: 60 }),
      leaveRequests: z.number().int().openapi({ example: 35 }),
    }), "The data is back to the seed state."),
  },
});
