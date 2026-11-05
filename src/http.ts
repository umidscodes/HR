/**
 * Request and response helpers shared by every endpoint: body, query and path-id parsing with
 * readable 400 errors, paging, X-Request-Id, and the error handler that turns any thrown error
 * into an RFC 7807 problem response.
 */
import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError, badRequest, fieldError, fromPg, validation, type FieldError } from "./errors";

// ---- request id ----------------------------------------------------------------------------

/** Echo a sensible X-Request-Id from the client, or make one up. Every response carries it. */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const rid = incoming && /^[\w.-]{1,100}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.locals.requestId = rid;
  res.setHeader("X-Request-Id", rid);
  next();
}

/** One line per API call in the terminal, so students can see their tests arrive. */
export function accessLog(req: Request, res: Response, next: NextFunction) {
  if (process.env.ICEHR_QUIET_LOGS === "true") return next();
  const started = Date.now();
  res.on("finish", () => {
    console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
}

// ---- parsing -------------------------------------------------------------------------------

export function zodToFieldErrors(err: ZodError, where: string): FieldError[] {
  return err.issues.map((i) => ({
    field: i.path.length ? i.path.join(".") : where,
    message: i.message,
  }));
}

/**
 * Parses and validates the JSON body. Express has already parsed JSON bodies (see app.ts); here we
 * explain the common mistakes: no body at all, a body that is not JSON, or JSON that is not an object.
 */
export function body<T>(req: Request, schema: ZodType<T>): T {
  const hasBody = Number(req.header("content-length") ?? 0) > 0 || req.header("transfer-encoding") !== undefined;
  if (!req.is("application/json") && hasBody) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE",
      `Send the request body as JSON with the header Content-Type: application/json (received: ${req.header("content-type") ?? "no Content-Type"}).`);
  }
  const raw = req.body;
  if (raw === undefined || (!hasBody && (raw === null || Object.keys(raw).length === 0))) {
    throw badRequest("BODY_REQUIRED", "A JSON request body is required.");
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw badRequest("MALFORMED_JSON", "The request body must be a JSON object, like {\"name\": \"value\"}.");
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw validation(zodToFieldErrors(r.error, "body"));
  return r.data;
}

/** Same as body(), but an empty or missing body counts as {} (for endpoints whose body is optional). */
export function optionalBody<T>(req: Request, schema: ZodType<T>): T {
  const hasBody = Number(req.header("content-length") ?? 0) > 0 || req.header("transfer-encoding") !== undefined;
  if (!hasBody) {
    const r = schema.safeParse({});
    if (!r.success) throw validation(zodToFieldErrors(r.error, "body"));
    return r.data;
  }
  return body(req, schema);
}

export function query<T>(req: Request, schema: ZodType<T>): T {
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") raw[k] = v;
    else if (Array.isArray(v) && typeof v[0] === "string") raw[k] = v[v.length - 1] as string;
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw validation(zodToFieldErrors(r.error, "query"));
  return r.data;
}

/** The numeric {id} in the URL. "abc", "1.5" and "0" are 400s; a well-formed id that does not exist is a 404 later. */
export function pathId(req: Request, name = "id"): number {
  const raw = String(req.params[name] ?? "");
  if (!/^\d+$/.test(raw) || Number(raw) < 1) throw fieldError(name, "must be a positive whole number");
  const n = Number(raw);
  if (n > 2147483647) throw fieldError(name, "is too large");
  return n;
}

// ---- paging and sorting ----------------------------------------------------------------------

export interface Paging { page: number; size: number; offset: number; orderBy: string }

/**
 * Reads ?page=, ?size= and ?sort=field,asc|desc. `columns` maps the API field names that may be
 * sorted on to SQL columns. The id is always added as a tie-breaker so the order is stable.
 */
export function paging(q: Record<string, string | undefined>, columns: Record<string, string>, defaultSort = "id,asc"): Paging {
  const errors: FieldError[] = [];
  const page = q.page === undefined ? 0 : /^\d+$/.test(q.page) ? Number(q.page) : NaN;
  if (!Number.isSafeInteger(page)) errors.push({ field: "page", message: "must be a whole number, 0 or more" });
  const size = q.size === undefined ? 20 : /^\d+$/.test(q.size) ? Number(q.size) : NaN;
  if (!Number.isSafeInteger(size) || size < 1 || size > 100) errors.push({ field: "size", message: "must be a whole number from 1 to 100" });

  const [field, dirRaw, extra] = (q.sort ?? defaultSort).split(",");
  const dir = (dirRaw ?? "asc").toLowerCase();
  if (!(field in columns) || extra !== undefined) {
    errors.push({ field: "sort", message: `must be one of ${Object.keys(columns).join(", ")}, optionally followed by ,asc or ,desc` });
  } else if (dir !== "asc" && dir !== "desc") {
    errors.push({ field: "sort", message: "direction must be asc or desc" });
  }
  if (errors.length) throw validation(errors);
  const col = columns[field];
  const orderBy = `${col} ${dir.toUpperCase()}${col === "id" ? "" : `, id ${dir.toUpperCase()}`}`;
  return { page, size, offset: page * size, orderBy };
}

export function pageBody<T>(content: T[], p: Paging, total: number) {
  return { content, page: p.page, size: p.size, totalElements: total, totalPages: Math.ceil(total / p.size) };
}

// ---- responses -----------------------------------------------------------------------------

export function created(res: Response, location: string, payload: unknown) {
  res.status(201).location(location).json(payload);
}

function sendProblem(res: Response, req: Request, e: ApiError) {
  for (const [k, v] of Object.entries(e.headers)) res.setHeader(k, v);
  res.status(e.status).type("application/problem+json").send(JSON.stringify({
    type: e.type, title: e.title, status: e.status, detail: e.detail, instance: req.originalUrl.split("?")[0], code: e.code,
    ...(e.errors ? { errors: e.errors } : {}),
  }));
}

/** Express error handler: the last middleware in app.ts. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let apiErr: ApiError;
  const e = err as { type?: string; status?: number };
  if (err instanceof ApiError) apiErr = err;
  else if (err instanceof ZodError) apiErr = validation(zodToFieldErrors(err, "body"));
  else if (e?.type === "entity.parse.failed") apiErr = badRequest("MALFORMED_JSON", "The request body is not valid JSON. Check for missing quotes, commas or braces.");
  else if (e?.type === "entity.too.large") apiErr = new ApiError(413, "PAYLOAD_TOO_LARGE", "The request body is larger than 100 KB.");
  else if (e?.type === "charset.unsupported" || e?.type === "encoding.unsupported") apiErr = new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the body as UTF-8 JSON.");
  else apiErr = fromPg(err) ?? new ApiError(500, "INTERNAL_ERROR", `Something went wrong on our side. Quote the X-Request-Id (${res.locals.requestId}) when reporting it.`);
  if (apiErr.status >= 500) console.error(`[api] ${req.method} ${req.originalUrl} failed (${res.locals.requestId}):`, err);
  sendProblem(res, req, apiErr);
}
