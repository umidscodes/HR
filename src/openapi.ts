/**
 * The OpenAPI registry and the reusable field types. Each module in src/api registers its own
 * schemas and paths here; GET /api/v1/openapi.json renders the whole document for Swagger UI.
 */
import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { isRealDate } from "./dates";

extendZodWithOpenApi(z);
export { z };

export const registry = new OpenAPIRegistry();

// ---- field types with clear error messages ----------------------------------------------------
// Every message completes the sentence "<field> ...", e.g. "salary must be a whole number".

const missing = (input: unknown) => input === undefined || input === null;

export function text(min: number, max: number) {
  return z.string({ error: (i) => (missing(i.input) ? "is required" : "must be a string") })
    .trim()
    .min(min, min === 1 ? "must not be blank" : `must be at least ${min} characters`)
    .max(max, `must be at most ${max} characters`);
}

export function optionalText(max: number) {
  return z.string({ error: () => "must be a string" })
    .trim()
    .max(max, `must be at most ${max} characters`)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v === null || v === "" ? null : v));
}

export function id() {
  return z.number({ error: (i) => (missing(i.input) ? "is required" : "must be a number") })
    .int("must be a whole number")
    .positive("must be greater than 0")
    .max(2147483647, "is too large");
}

export function wholeNumber(min: number) {
  return z.number({ error: (i) => (missing(i.input) ? "is required" : "must be a number") })
    .int("must be a whole number")
    .min(min, min === 1 ? "must be greater than 0" : `must be at least ${min}`)
    .max(2147483647, "is too large");
}

export function date() {
  return z.string({ error: (i) => (missing(i.input) ? "is required" : "must be a date in the format YYYY-MM-DD") })
    .refine(isRealDate, "must be a real date in the format YYYY-MM-DD")
    .openapi({ example: "2026-11-05", format: "date" });
}

export function oneOf<T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values, { error: (i) => (missing(i.input) ? "is required" : `must be one of: ${values.join(", ")}`) });
}

export const email = () =>
  z.string({ error: (i) => (missing(i.input) ? "is required" : "must be a string") })
    .trim()
    .max(100, "must be at most 100 characters")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "must be a valid email address")
    .transform((v) => v.toLowerCase());

export const phone = () =>
  z.string({ error: () => "must be a string in the format 416-555-0100" })
    .regex(/^\d{3}-\d{3}-\d{4}$/, "must be in the format 416-555-0100")
    .nullish();

// ---- shared response schemas -----------------------------------------------------------------

export const FieldErrorSchema = z.object({
  field: z.string().openapi({ example: "salary" }),
  message: z.string().openapi({ example: "must be a whole number" }),
});

export const ProblemSchema = registry.register("Problem", z.object({
  type: z.string().openapi({ example: "https://icehr.test/problems/salary-out-of-range" }),
  title: z.string().openapi({ example: "Unprocessable Entity" }),
  status: z.number().int().openapi({ example: 422 }),
  detail: z.string().openapi({ example: "Salary 30000 is outside the range for Software Engineer (80000 to 115000)." }),
  instance: z.string().openapi({ example: "/api/v1/employees" }),
  code: z.string().openapi({ example: "SALARY_OUT_OF_RANGE", description: "Machine-readable error code. Assert on this." }),
  errors: z.array(FieldErrorSchema).optional().openapi({ description: "Only for 400 VALIDATION_FAILED: one entry per invalid field." }),
}).openapi({ description: "RFC 7807 problem details, sent as application/problem+json." }));

export const DateTimeStr = z.string().openapi({ example: "2026-11-05T10:15:00-05:00", description: "ISO 8601 date-time with offset (Toronto time)." });

export function pageOf<T extends z.ZodTypeAny>(name: string, item: T) {
  return registry.register(name, z.object({
    content: z.array(item),
    page: z.number().int().openapi({ example: 0, description: "Zero-based page number." }),
    size: z.number().int().openapi({ example: 20 }),
    totalElements: z.number().int().openapi({ example: 60 }),
    totalPages: z.number().int().openapi({ example: 3 }),
  }));
}

export const pagingQuery = {
  page: z.string().optional().openapi({ description: "Zero-based page number (default 0).", example: "0" }),
  size: z.string().optional().openapi({ description: "Page size, 1 to 100 (default 20).", example: "20" }),
};

// ---- response helpers for path registration ---------------------------------------------------

export function json(schema: z.ZodTypeAny, description: string) {
  return { description, content: { "application/json": { schema } } };
}

export function problem(description: string, example?: Record<string, unknown>) {
  return {
    description,
    content: { "application/problem+json": { schema: ProblemSchema, ...(example ? { example } : {}) } },
  };
}

export function problemExample(status: number, code: string, detail: string, instance: string, errors?: { field: string; message: string }[]) {
  const titles: Record<number, string> = { 400: "Bad Request", 404: "Not Found", 409: "Conflict", 415: "Unsupported Media Type", 422: "Unprocessable Entity" };
  return {
    type: `https://icehr.test/problems/${code.toLowerCase().replace(/_/g, "-")}`,
    title: titles[status], status, detail, instance, code, ...(errors ? { errors } : {}),
  };
}

export const idParam = z.object({ id: z.string().openapi({ example: "13", description: "Numeric id." }) });

// ---- the document --------------------------------------------------------------------------

let cached: unknown = null;

export function openApiDocument() {
  if (cached) return cached;
  const gen = new OpenApiGeneratorV3(registry.definitions);
  cached = gen.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Ice HR API",
      version: "1.0.0",
      description: [
        "Ice HR is a small, fictional HR system built for practising API and database testing.",
        "",
        "**No login.** Every endpoint is open: no tokens, no keys. Press *Try it out* on any endpoint.",
        "",
        "**Conventions**: JSON in and out, camelCase field names; dates as `YYYY-MM-DD`; date-times as ISO 8601 with offset; " +
          "salaries as whole numbers (annual, in dollars). Errors are RFC 7807 `application/problem+json` with a machine-readable `code`. " +
          "Every response carries an `X-Request-Id` header, and every `201 Created` a `Location` header.",
        "",
        "**Seed data**: 15 jobs, 9 departments, 60 employees and 35 leave requests with fixed ids. " +
          "`POST /api/v1/reset` puts everything back. New records get ids from 1001 up.",
        "",
        "**Business rules** (the test oracle) are listed in the README, section 5.",
      ].join("\n"),
    },
    servers: [{ url: "/", description: "This server" }],
    tags: [
      { name: "Employees" }, { name: "Departments" }, { name: "Jobs" }, { name: "Leave requests" },
      { name: "Reports" }, { name: "Test support" },
    ],
  });
  return cached;
}
